import SwiftUI

/// Bluey's own app screen: start or end a session, see past sessions and their transcripts, and settings.
/// Opened from the faint button in the top-right corner of his face.
struct BlueyAppView: View {
    @ObservedObject var store: SessionStore
    @ObservedObject var live: LiveVoice
    @ObservedObject var link: MacLink
    var onClose: () -> Void
    @State private var volume = 1.0

    var body: some View {
        NavigationStack {
            HStack(spacing: 0) {
                sidebar
                    .frame(width: 300)
                    .background(Color(hex: Palette.panel).opacity(0.6))
                sessionList
            }
            .background(Color.black)
            .navigationDestination(for: UUID.self) { id in
                SessionDetailView(store: store, id: id)
            }
            .toolbar(.hidden, for: .navigationBar)
        }
        .preferredColorScheme(.dark)
        .tint(Color(hex: Palette.berry1))
        .onAppear { volume = live.volume }
    }

    // MARK: Left: who he is, start/end, settings

    private var sidebar: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                HStack(spacing: 12) {
                    MiniBluey()
                        .frame(width: 54, height: 48)
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Bluey")
                            .font(.fredoka(28))
                            .foregroundStyle(.white)
                        HStack(spacing: 6) {
                            Circle()
                                .fill(link.connected ? Color(hex: 0x5BE49B) : Color(hex: Palette.inkSoft).opacity(0.5))
                                .frame(width: 7, height: 7)
                            Text(link.connected ? (link.macName ?? link.currentMac ?? "Mac") : "Looking for your Mac")
                                .font(.plexSans(12))
                                .foregroundStyle(Color(hex: Palette.inkSoft))
                                .lineLimit(1)
                        }
                    }
                }

                Button {
                    let starting = live.state == .asleep
                    live.toggle()
                    if starting { onClose() }  // back to his face when starting
                } label: {
                    HStack(spacing: 10) {
                        Image(systemName: live.state == .asleep ? "play.fill" : "stop.fill")
                        Text(live.state == .asleep ? "Start session" : "End session")
                    }
                    .font(.fredoka(18))
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity, minHeight: 50)
                    .background {
                        if live.state == .asleep {
                            RoundedRectangle(cornerRadius: 16).fill(BlobShape.linear)
                        } else {
                            RoundedRectangle(cornerRadius: 16).fill(Color(hex: 0xE5547A))
                        }
                    }
                }
                .buttonStyle(.plain)
                .disabled(!link.connected && live.state == .asleep)
                .opacity(!link.connected && live.state == .asleep ? 0.5 : 1)

                Text(live.state == .asleep
                     ? "He listens the whole session. Hold his face to ask something, let go and he answers."
                     : "Session running. Hold his face to ask; everything you say is saved here.")
                    .font(.plexSans(12))
                    .foregroundStyle(Color(hex: Palette.inkSoft))

                Divider().overlay(Color.white.opacity(0.08))

                VStack(alignment: .leading, spacing: 8) {
                    label("Chirp volume")
                    Slider(value: Binding(get: { volume }, set: { volume = $0; live.volume = $0 }), in: 0...1)
                }

                if link.macs.count > 1 {
                    VStack(alignment: .leading, spacing: 4) {
                        label("Mac")
                        ForEach(link.macs, id: \.self) { name in
                            Button { link.choose(name) } label: {
                                HStack {
                                    Text(name).font(.plexSans(14)).foregroundStyle(.white).lineLimit(1)
                                    Spacer()
                                    if name == link.currentMac {
                                        Image(systemName: link.connected ? "checkmark" : "ellipsis")
                                            .foregroundStyle(Color(hex: Palette.berry2))
                                    }
                                }
                                .frame(minHeight: 34)
                                .contentShape(Rectangle())
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }

                Button(action: onClose) {
                    HStack(spacing: 8) {
                        Image(systemName: "face.smiling")
                        Text("Back to his face")
                    }
                    .font(.plexSans(15).weight(.semibold))
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity, minHeight: 44)
                    .background(Color.white.opacity(0.08), in: RoundedRectangle(cornerRadius: 14))
                }
                .buttonStyle(.plain)
            }
            .padding(22)
        }
    }

    private func label(_ text: String) -> some View {
        Text(text)
            .font(.plexMono(11))
            .textCase(.uppercase)
            .foregroundStyle(Color(hex: Palette.inkSoft))
    }

    // MARK: Right: sessions

    private var sessionList: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Text("Sessions")
                    .font(.fredoka(24))
                    .foregroundStyle(.white)
                Spacer()
                Text("\(store.sessions.count)")
                    .font(.plexMono(13))
                    .foregroundStyle(Color(hex: Palette.inkSoft))
            }
            .padding(.horizontal, 22)
            .padding(.top, 20)
            .padding(.bottom, 8)

            if store.sessions.isEmpty {
                VStack(spacing: 10) {
                    Image(systemName: "text.bubble")
                        .font(.system(size: 34))
                        .foregroundStyle(Color(hex: Palette.berry2))
                    Text("No sessions yet")
                        .font(.fredoka(18))
                        .foregroundStyle(.white)
                    Text("Start one and your transcript and his replies show up here.")
                        .font(.plexSans(13))
                        .foregroundStyle(Color(hex: Palette.inkSoft))
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                List {
                    ForEach(store.sessions) { session in
                        NavigationLink(value: session.id) {
                            SessionRow(session: session, live: session.id == store.currentID)
                        }
                        .listRowBackground(Color(hex: Palette.panel))
                    }
                    .onDelete { offsets in
                        offsets.map { store.sessions[$0].id }.forEach(store.delete)
                    }
                }
                .scrollContentBackground(.hidden)
                .listStyle(.insetGrouped)
            }
        }
    }
}

private struct SessionRow: View {
    let session: BlueySession
    let live: Bool

    var body: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 8) {
                    Text(session.started.formatted(date: .abbreviated, time: .shortened))
                        .font(.plexSans(15).weight(.semibold))
                        .foregroundStyle(.white)
                    if live {
                        Text("LIVE")
                            .font(.plexMono(10).weight(.bold))
                            .foregroundStyle(.black)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color(hex: 0x5BE49B), in: Capsule())
                    }
                }
                Text(session.summary)
                    .font(.plexSans(13))
                    .foregroundStyle(Color(hex: Palette.inkSoft))
                    .lineLimit(1)
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 4) {
                Text(Self.duration(session.duration))
                    .font(.plexMono(12))
                    .foregroundStyle(Color(hex: Palette.inkSoft))
                Text("\(session.questionCount) asked")
                    .font(.plexMono(11))
                    .foregroundStyle(Color(hex: Palette.berry1))
            }
        }
        .padding(.vertical, 4)
    }

    static func duration(_ seconds: TimeInterval) -> String {
        let s = Int(seconds)
        return s >= 3600 ? String(format: "%d:%02d:%02d", s / 3600, s / 60 % 60, s % 60) : String(format: "%d:%02d", s / 60, s % 60)
    }
}

/// One session as a chat: what you said in grey, your questions in blue, his replies in white bubbles.
struct SessionDetailView: View {
    @ObservedObject var store: SessionStore
    let id: UUID
    @Environment(\.dismiss) private var dismiss
    @State private var copied = false

    /// A prompt for an agent (like Claude Code on the Mac) that points it at this session's notes files.
    private func copyPrompt(_ session: BlueySession) {
        let root = "~/Documents/Bluey Notes"
        let path = session.notesPath.map { p -> String in
            // Show the Mac path with ~ for the home folder.
            if let range = p.range(of: "/Documents/Bluey Notes") { return "~" + p[range.lowerBound...] }
            return p
        } ?? "\(root)/ (the folder starting \(session.started.formatted(.iso8601.year().month().day())))"
        let prompt = """
        I recorded a meeting with my Bluey app on \(session.started.formatted(date: .complete, time: .shortened)). \
        The notes are on my Mac in \(path)

        - notes.md: the full transcript with timestamps and speaker labels (A, B, … per five-minute chunk), plus \
        my questions to Bluey, its replies and research reports. Start here.
        - session.json: the same data, structured.
        - audio/: the original recording in five-minute chunks.

        All my sessions are in \(root)/, one folder per session (see README.md there). Read the notes, then help me \
        with: 
        """
        #if canImport(UIKit)
        UIPasteboard.general.string = prompt
        UINotificationFeedbackGenerator().notificationOccurred(.success)
        #endif
        copied = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) { copied = false }
    }

    private var session: BlueySession? { store.sessions.first { $0.id == id } }

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 14) {
                Button { dismiss() } label: {
                    Image(systemName: "chevron.left")
                        .font(.system(size: 17, weight: .semibold))
                        .frame(width: 40, height: 40)
                        .background(Color.white.opacity(0.08), in: Circle())
                }
                .buttonStyle(.plain)
                VStack(alignment: .leading, spacing: 2) {
                    Text(session?.started.formatted(date: .abbreviated, time: .shortened) ?? "Session")
                        .font(.fredoka(20))
                        .foregroundStyle(.white)
                    if let session {
                        Text("\(SessionRow.duration(session.duration)) · \(session.questionCount) asked"
                             + (session.transcribing > 0 ? " · transcribing \(session.transcribing) chunk\(session.transcribing == 1 ? "" : "s")…" : ""))
                            .font(.plexMono(11))
                            .foregroundStyle(Color(hex: Palette.inkSoft))
                    }
                }
                Spacer()
                if let session {
                    Button { copyPrompt(session) } label: {
                        HStack(spacing: 6) {
                            Image(systemName: copied ? "checkmark" : "doc.on.doc")
                            Text(copied ? "Copied" : "Copy prompt for agent")
                        }
                        .font(.plexSans(13).weight(.semibold))
                        .padding(.horizontal, 14)
                        .frame(height: 40)
                        .background(Color(hex: Palette.berry3), in: Capsule())
                    }
                    .buttonStyle(.plain)
                    ShareLink(item: session.exportText) {
                        Image(systemName: "square.and.arrow.up")
                            .font(.system(size: 16, weight: .semibold))
                            .frame(width: 40, height: 40)
                            .background(Color.white.opacity(0.08), in: Circle())
                    }
                }
            }
            .foregroundStyle(.white)
            .padding(.horizontal, 22)
            .padding(.vertical, 12)

            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: 10) {
                        ForEach(session?.displayEntries ?? []) { entry in
                            EntryView(entry: entry).id(entry.id)
                        }
                    }
                    .padding(.horizontal, 22)
                    .padding(.bottom, 24)
                }
                .onAppear { if let last = session?.entries.last { proxy.scrollTo(last.id, anchor: .bottom) } }
                .onChange(of: session?.entries.count) { _, _ in
                    if let last = session?.entries.last { withAnimation { proxy.scrollTo(last.id, anchor: .bottom) } }
                }
            }
        }
        .background(Color.black)
        .toolbar(.hidden, for: .navigationBar)
    }
}

private struct EntryView: View {
    static func speakerColor(_ speaker: String?) -> Color {
        let colors: [UInt32] = [0x8FB3FF, 0x5BE49B, 0xFFB86B, 0xFF9AD0, 0xC79BFF, 0x6BE3E0]
        guard let first = speaker?.unicodeScalars.first?.value, speaker != "?" else { return Color(hex: Palette.inkSoft) }
        return Color(hex: colors[Int(first) % colors.count])
    }

    let entry: TranscriptEntry
    @State private var open = false

    var body: some View {
        switch entry.kind {
        case .transcript:
            HStack(alignment: .top, spacing: 10) {
                Text(entry.speaker.map { "Speaker \($0)" } ?? "Speaker")
                    .font(.plexMono(11).weight(.medium))
                    .foregroundStyle(Self.speakerColor(entry.speaker))
                    .frame(width: 78, alignment: .leading)
                    .padding(.top, 2)
                Text(entry.text)
                    .font(.plexSans(15))
                    .foregroundStyle(.white.opacity(0.92))
                    .frame(maxWidth: .infinity, alignment: .leading)
                Text(entry.time.formatted(date: .omitted, time: .shortened))
                    .font(.plexMono(10))
                    .foregroundStyle(Color(hex: Palette.inkSoft).opacity(0.7))
                    .padding(.top, 3)
            }
        case .heard:
            Text(entry.text)
                .font(.plexSans(14))
                .foregroundStyle(Color(hex: Palette.inkSoft))
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.leading, 4)
        case .asked:
            HStack {
                Spacer(minLength: 120)
                VStack(alignment: .trailing, spacing: 3) {
                    Text("You asked")
                        .font(.plexMono(10))
                        .foregroundStyle(Color(hex: Palette.berry1))
                    Text(entry.text)
                        .font(.plexSans(15).weight(.medium))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 10)
                        .background(BlobShape.linear, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
                }
            }
        case .reply:
            HStack(alignment: .bottom, spacing: 8) {
                MiniBluey().frame(width: 28, height: 25)
                Text(entry.text)
                    .font(.fredoka(16))
                    .foregroundStyle(Color(hex: Palette.ink))
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .background(Color.white, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
                Spacer(minLength: 120)
            }
        case .report:
            let lines = entry.text.components(separatedBy: "\n\n")
            VStack(alignment: .leading, spacing: 8) {
                Button { withAnimation(.spring(duration: 0.3)) { open.toggle() } } label: {
                    HStack(spacing: 8) {
                        Image(systemName: "doc.text.magnifyingglass").foregroundStyle(Color(hex: Palette.berry2))
                        Text(lines.first ?? "Research")
                            .font(.fredoka(16))
                            .foregroundStyle(Color(hex: Palette.ink))
                            .multilineTextAlignment(.leading)
                        Spacer()
                        Image(systemName: open ? "minus" : "plus")
                            .font(.system(size: 12, weight: .heavy))
                            .foregroundStyle(.white)
                            .frame(width: 24, height: 24)
                            .background(Circle().fill(Color(hex: Palette.berry2)))
                    }
                }
                .buttonStyle(.plain)
                Text(lines.dropFirst().joined(separator: "\n\n"))
                    .font(.plexSans(14))
                    .foregroundStyle(Color(hex: Palette.ink))
                    .lineLimit(open ? nil : 3)
            }
            .padding(14)
            .background(Color(hex: 0xEEF0FF), in: RoundedRectangle(cornerRadius: 18, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 18, style: .continuous).strokeBorder(Color(hex: Palette.berry2), lineWidth: 2))
            .padding(.leading, 36)
            .padding(.trailing, 80)
        }
    }
}

/// A tiny Bluey: the blob with two googly eyes.
struct MiniBluey: View {
    var body: some View {
        GeometryReader { geo in
            let w = geo.size.width
            ZStack {
                BlobShape().fill(BlobShape.linear)
                HStack(spacing: w * 0.1) {
                    ForEach(0..<2, id: \.self) { _ in
                        Circle()
                            .fill(.white)
                            .frame(width: w * 0.26, height: w * 0.26)
                            .overlay(Circle().fill(Color(hex: Palette.ink)).frame(width: w * 0.12).offset(x: w * 0.02, y: w * 0.03))
                    }
                }
                .offset(y: -w * 0.04)
            }
        }
    }
}
