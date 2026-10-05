import SwiftUI
#if canImport(UIKit)
import UIKit
#endif

@main
struct GooglyApp: App {
    var body: some Scene {
        WindowGroup {
            RootView()
        }
    }
}

struct RootView: View {
    @StateObject private var link = MacLink()
    @StateObject private var live = LiveVoice()
    @StateObject private var store = SessionStore()
    @State private var showApp = false
    @Environment(\.scenePhase) private var scenePhase
    @State private var animator = FaceAnimator()
    @State private var showPairing = true
    @State private var holdStart: DispatchWorkItem?
    @State private var holdingToAsk = false

    var body: some View {
        ZStack {
            FaceView(animator: animator)
                .contentShape(Rectangle())
                .onTapGesture(count: 2) { live.toggle() }  // double tap: wake up / back to follow mode
                .simultaneousGesture(holdToAsk)

            ModeIndicator(state: live.state)

            SoundButton(link: link, live: live)

            // Bluey's app: sessions, transcripts and settings.
            Button { showApp = true } label: {
                Image(systemName: "square.grid.2x2.fill")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(.white.opacity(0.35))
                    .frame(width: 44, height: 44)
                    .background(Circle().fill(Color.white.opacity(0.06)).frame(width: 34, height: 34))
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Open Bluey")
            .padding(.top, 10)
            .padding(.trailing, 62)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing)

            if showPairing && !link.connected {
                PairingView { withAnimation(.easeOut(duration: 0.3)) { showPairing = false } }
                    .transition(.opacity)
            }
        }
        .background(Color.black)
        .ignoresSafeArea()
        .phoneChrome()
        .fullScreenCover(isPresented: $showApp) {
            BlueyAppView(store: store, live: live, link: link) { showApp = false }
        }
        .onAppear {
            link.onFace = { [animator] face in animator.receive(face, at: Date().timeIntervalSinceReferenceDate) }
            animator.localTalk = { [live] in live.level }
            wireLiveVoice()
            link.start()
        }
        .onChange(of: link.connected) { _, connected in
            if connected {
                withAnimation(.easeOut(duration: 0.4)) { showPairing = false }
                NotesSync.retryPending(store: store, link: link)
                store.resyncRecent()
            }
        }
        .onChange(of: scenePhase) { _, phase in
            if phase == .active { link.start() } else if phase == .background { link.stop() }
        }
    }

    /// Press and hold the screen to ask him something; let go and he answers.
    private var holdToAsk: some Gesture {
        DragGesture(minimumDistance: 0)
            .onChanged { _ in
                guard holdStart == nil, !holdingToAsk else { return }
                let work = DispatchWorkItem {
                    holdingToAsk = true
                    #if canImport(UIKit)
                    UIImpactFeedbackGenerator(style: .soft).impactOccurred()
                    #endif
                    live.beginAsk()
                }
                holdStart = work
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.3, execute: work)  // a quick tap isn't a hold
            }
            .onEnded { _ in
                holdStart?.cancel()
                holdStart = nil
                if holdingToAsk {
                    holdingToAsk = false
                    #if canImport(UIKit)
                    UIImpactFeedbackGenerator(style: .light).impactOccurred()
                    #endif
                    live.endAsk()
                }
            }
    }

    /// Connects the live voice to the Mac: keys, tools, captions and wake/sleep.
    private func wireLiveVoice() {
        live.requestToken = { [link] done in
            link.request(Packet(command: "realtimeToken")) { reply in done(reply?.text) }
        }
        live.runTool = { [link] name, arguments, done in
            link.request(Packet(command: "tool", tool: name, text: arguments)) { reply in
                done(reply?.text ?? "The Mac didn't answer.", reply?.image)
            }
        }
        live.onSessionStart = { [store, live] in
            store.start()
            if let id = store.currentID { live.recorder.start(session: id) }
        }
        live.resumeContext = { [store] in store.recentText() }
        live.recorder.onChunk = { [store, link] chunk in
            store.addPending(chunk.sessionID, index: chunk.index, started: chunk.started)
            NotesSync.upload(chunk.sessionID, index: chunk.index, started: chunk.started, store: store, link: link)
        }
        store.onSync = { [store, link] sessions in NotesSync.send(sessions, store: store, link: link) }
        live.onSessionEnd = { [store] in store.end() }
        live.onUserTurn = { [store] item, asked in store.placeholder(itemID: item, asked: asked) }
        live.onUserWords = { [store] item, text, asked in store.heard(itemID: item, text: text, asked: asked) }
        live.onReply = { [store] text in store.reply(text) }
        live.onReport = { [store] text in store.report(text) }
        live.onCaption = { [link] text, finished in
            link.send(Packet(command: finished ? "captionDone" : "caption", text: text))
        }
        live.onStateChange = { [link, animator] state in
            switch state {
            case .asleep:
                animator.awake = false
                animator.localMood = nil
                link.send(Packet(command: "asleep"))
            case .waking:
                animator.awake = true
                animator.localMood = .happy
            case .listening:
                animator.awake = true
                animator.localMood = nil
                link.send(Packet(command: "awake"))
            case .asking:
                animator.awake = true
                animator.localMood = .listening  // all ears while you hold
                link.send(Packet(command: "awake"))
            case .thinking:
                animator.localMood = .thinking
            case .speaking:
                animator.localMood = .talking
            }
        }
        link.onCommand = { [live] command in
            switch command {
            case "wake": live.wake()
            case "sleep": live.sleep()
            default: break
            }
        }
    }
}

/// Shows which mode he's in: a solid border hugging the screen's own rounded corners (blue while he listens),
/// plus a small label in the corner. Following your mouse is just a little eye icon. No glows.
struct ModeIndicator: View {
    let state: LiveVoice.State

    private struct Look {
        let color: Color
        let label: String?
        let icon: String
        let border: CGFloat   // 0 = no border
        let pulse: Double     // pulses per second (opacity only)
    }

    private static let blue = Color(hex: 0x4F8BFF)

    private var look: Look {
        switch state {
        case .asleep:    return Look(color: Color(hex: Palette.inkSoft), label: nil, icon: "eye.fill", border: 0, pulse: 0)
        case .waking:    return Look(color: Color(hex: 0xFFD66B), label: "Waking up", icon: "sun.max.fill", border: 6, pulse: 1.6)
        case .listening: return Look(color: Self.blue, label: "Listening · hold to ask", icon: "ear", border: 10, pulse: 0)
        case .asking:    return Look(color: Self.blue, label: "I'm all ears", icon: "mic.fill", border: 16, pulse: 1.2)
        case .thinking:  return Look(color: Color(hex: 0xC79BFF), label: "Thinking", icon: "sparkles", border: 8, pulse: 1.1)
        case .speaking:  return Look(color: Color(hex: 0xFF9AD0), label: "Replying", icon: "bubble.left.fill", border: 8, pulse: 0)
        }
    }

    /// The phone screen's own corner radius, so the border lines up with the glass.
    private static let screenCornerRadius: CGFloat = {
        #if canImport(UIKit)
        if let radius = UIScreen.main.value(forKey: "_displayCornerRadius") as? CGFloat, radius > 0 { return radius }
        #endif
        return 55
    }()

    var body: some View {
        let look = look
        TimelineView(.animation(paused: look.pulse == 0)) { context in
            let t = context.date.timeIntervalSinceReferenceDate
            let wave = look.pulse > 0 ? 0.5 + 0.5 * sin(t * look.pulse * 2 * .pi) : 1
            ZStack(alignment: .topLeading) {
                if look.border > 0 {
                    RoundedRectangle(cornerRadius: Self.screenCornerRadius, style: .continuous)
                        .strokeBorder(look.color, lineWidth: look.border)
                        .opacity(look.pulse > 0 ? 0.65 + 0.35 * wave : 1)
                }
                HStack(spacing: 7) {
                    Image(systemName: look.icon)
                        .font(.system(size: 14, weight: .bold))
                    if let label = look.label {
                        Text(label).font(.fredoka(16))
                    }
                }
                .foregroundStyle(look.label == nil ? look.color.opacity(0.7) : .white)
                .padding(.horizontal, look.label == nil ? 0 : 14)
                .frame(minWidth: 34, minHeight: 34)
                .background(Capsule().fill(look.label == nil ? Color.white.opacity(0.06) : look.color))
                .padding(.top, 14 + look.border)
                .padding(.leading, 24 + look.border)
            }
        }
        .ignoresSafeArea()
        .allowsHitTesting(false)
        .animation(.easeInOut(duration: 0.25), value: state)
    }
}

private extension View {
    /// Hides the status bar and home indicator and keeps the screen awake.
    func phoneChrome() -> some View {
        #if os(iOS)
        return self
            .statusBarHidden(true)
            .persistentSystemOverlays(.hidden)
            .onAppear { UIApplication.shared.isIdleTimerDisabled = true }
        #else
        return self
        #endif
    }
}
