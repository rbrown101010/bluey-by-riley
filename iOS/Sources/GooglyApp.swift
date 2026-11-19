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
    @StateObject private var focus = FocusClient()
    @State private var showFocus = false
    @State private var scanPairing = false
    @State private var showApp = false
    @Environment(\.scenePhase) private var scenePhase
    @State private var animator = FaceAnimator()
    @State private var showPairing = true
    @State private var holdStart: DispatchWorkItem?
    @State private var holdingToAsk = false
    @AppStorage(AvatarStyle.defaultsKey) private var avatar: AvatarStyle = .keramik3D
    @State private var avatarReaction: KeramikReaction?
    @State private var testingAvatar = false
    @State private var testMood: String?

    var body: some View {
        ZStack {
            Group {
                switch avatar {
                case .bluey: FaceView(animator: animator)
                case .keramik: KeramikFace(animator: animator, reaction: avatarReaction, moodOverride: testMood)
                case .keramik3D: KeramikFace(animator: animator, reaction: avatarReaction, moodOverride: testMood, model3D: true)
                }
            }
            .allowsHitTesting(false)
            Color.clear
                .contentShape(Rectangle())
                .onTapGesture(count: 2) { live.toggle() }  // double tap: wake up / back to follow mode
                .simultaneousGesture(holdToAsk)

            if testingAvatar && avatar != .bluey {
                AvatarTestBar(mood: $testMood, react: react) {
                    testingAvatar = false
                    testMood = nil
                }
            }

            ModeIndicator(state: live.state)

            FocusFaceHUD(focus: focus, link: link, live: live, open: { showFocus = true }, pair: { scanPairing = true })
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
                PairingView { withAnimation(.easeOut(duration: 0.3)) { showPairing = false; scanPairing = true } }
                    .transition(.opacity)
            }
        }
        .background(Color.black)
        .ignoresSafeArea()
        .phoneChrome()
        .fullScreenCover(isPresented: $showApp) {
            BlueyAppView(store: store, live: live, link: link, focus: focus, openFocus: { showApp = false; DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) { showFocus = true } }, pairMac: { showApp = false; DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) { scanPairing = true } }, testAvatar: { showApp = false; testingAvatar = true }) { showApp = false }
        }
        .sheet(isPresented: $showFocus) { FocusDashboard(focus: focus, link: link) }
        .sheet(isPresented: $scanPairing) { QRPairingView(link: link) }
        .onAppear {
            focus.attach(link)
            focus.onFinished = { showFocus = true; live.sleep(); react("confetti") }
            link.onFocusState = { [focus] in focus.receive($0) }
            link.onFace = { [animator] face in animator.receive(face, at: Date().timeIntervalSinceReferenceDate) }
            animator.localTalk = { [live] in live.level }
            wireLiveVoice()
            link.start()
        }
        .onChange(of: link.connected) { _, connected in
            focus.connectionChanged(connected)
            if !connected { live.sleep() }
            if connected {
                withAnimation(.easeOut(duration: 0.4)) { showPairing = false }
                NotesSync.retryPending(store: store, link: link)
                store.resyncRecent()
            }
        }
        .onChange(of: scenePhase) { _, phase in
            if phase == .active { link.start() }
            else {
                focus.command("focusPause")
                live.sleep()
                if phase == .background { link.stop() }
            }
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

    /// Plays one of the Keramik avatar's reactions (ignored by Bluey's own face).
    private func react(_ name: String) {
        avatarReaction = KeramikReaction(name, id: (avatarReaction?.id ?? 0) + 1)
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
        live.onSessionStart = { [store] in
            // Focus voice is ephemeral. Do not record meeting audio by default.
            store.start()
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
                react("wave")
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
        live.onCodexNote = { [store] text in store.codex(text) }
        link.onCommand = { [live, focus] command, text in
            switch command {
            case "wake": live.wake()
            case "sleep": live.sleep()
            case "codexNote": live.codexNote(text ?? "")
            case "codexChirp": live.chirpAlone()
            case "focusChirp":
                focus.receivedNudge(text ?? "Are you sure you're on task right now?")
                live.focusChirp()
                react("stop")
            default: break
            }
        }
    }
}

/// The user's Keramik avatar, driven by the same animator moods as Bluey's face.
struct KeramikFace: View {
    let animator: FaceAnimator
    var reaction: KeramikReaction?
    /// A mood picked on the test bar wins over the live one.
    var moodOverride: String?
    var model3D = false

    var body: some View {
        TimelineView(.periodic(from: .now, by: 0.1)) { timeline in
            let frame = animator.step(timeline.date.timeIntervalSinceReferenceDate)
            KeramikAvatarView(mood: moodOverride ?? KeramikMapping.mood(frame.mood), gaze: frame.gaze, reaction: reaction,
                              zoom: model3D ? 1.0 : 1.4, model3D: model3D)
        }
        .background(Color.black)
        .ignoresSafeArea()
    }
}

/// Buttons along the bottom of the face to try every mood and reaction of the Keramik avatar.
struct AvatarTestBar: View {
    @Binding var mood: String?
    var react: (String) -> Void
    var close: () -> Void

    var body: some View {
        VStack(spacing: 6) {
            HStack(spacing: 6) {
                ForEach(KeramikTest.moods, id: \.id) { item in
                    chip(item.title, on: mood == item.id) { mood = item.id }
                }
                chip("Live", on: mood == nil) { mood = nil }
            }
            HStack(spacing: 6) {
                ForEach(KeramikTest.reactions, id: \.id) { item in
                    chip(item.title, on: false) { react(item.id) }
                }
                Button(action: close) {
                    Image(systemName: "xmark").font(.system(size: 12, weight: .bold)).foregroundStyle(.white)
                        .frame(width: 30, height: 30).background(Circle().fill(Color.white.opacity(0.18)))
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Close avatar test")
            }
        }
        .padding(.bottom, 12)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottom)
    }

    private func chip(_ title: String, on: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title)
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(on ? .black : .white)
                .padding(.horizontal, 10).frame(height: 30)
                .background(Capsule().fill(on ? Color.white : Color.white.opacity(0.18)))
        }
        .buttonStyle(.plain)
    }
}

/// Keeps the existing solid listening border. The compact status icon lives with the controls.
struct ModeIndicator: View {
    let state: LiveVoice.State
    private var color: Color {
        switch state {
        case .asleep: return .clear
        case .waking: return Color(hex: 0xFFD66B)
        case .listening, .asking: return Color(hex: 0x4F8BFF)
        case .thinking: return Color(hex: 0xC79BFF)
        case .speaking: return Color(hex: 0xFF9AD0)
        }
    }
    private var border: CGFloat {
        switch state {
        case .asleep: return 0
        case .waking: return 6
        case .listening: return 10
        case .asking: return 16
        case .thinking, .speaking: return 8
        }
    }
    private var pulse: Double {
        switch state {
        case .waking: return 1.6
        case .asking: return 1.2
        case .thinking: return 1.1
        default: return 0
        }
    }
    private static let screenCornerRadius: CGFloat = {
        #if canImport(UIKit)
        if let radius = UIScreen.main.value(forKey: "_displayCornerRadius") as? CGFloat, radius > 0 { return radius }
        #endif
        return 55
    }()
    var body: some View {
        TimelineView(.animation(paused: pulse == 0)) { context in
            let t = context.date.timeIntervalSinceReferenceDate
            let wave = pulse > 0 ? 0.5 + 0.5 * sin(t * pulse * 2 * .pi) : 1
            RoundedRectangle(cornerRadius: Self.screenCornerRadius, style: .continuous)
                .strokeBorder(color, lineWidth: border)
                .opacity(pulse > 0 ? 0.65 + 0.35 * wave : 1)
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
