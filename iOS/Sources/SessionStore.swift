import Foundation

/// One line in a session: the proper transcript (from the recorded audio, with speakers), the rough live
/// transcript (until the proper one catches up), a question you asked by holding the screen, his replies
/// and research reports.
struct TranscriptEntry: Codable, Identifiable, Equatable {
    enum Kind: String, Codable { case heard, asked, reply, report, transcript }

    var id = UUID()
    var kind: Kind
    var text: String
    var time: Date
    /// The Realtime conversation item this came from, so its transcript can be filled in when it arrives.
    var itemID: String?
    /// Who was talking, for proper transcript lines ("A", "B", … within each five-minute chunk).
    var speaker: String?
}

/// A recorded chunk waiting to be transcribed by the Mac.
struct PendingChunk: Codable, Equatable {
    var index: Int
    var started: Date
}

/// Everything from one wake-to-sleep session.
struct BlueySession: Codable, Identifiable, Equatable {
    var id = UUID()
    var started: Date
    var ended: Date?
    var entries: [TranscriptEntry] = []
    /// Where the Mac saved this session's meeting notes.
    var notesPath: String?
    var pending: [PendingChunk]?

    var questionCount: Int { entries.filter { $0.kind == .asked }.count }

    /// A short line for the session list: the first thing you asked, or the first thing you said.
    var summary: String {
        let first = entries.first { $0.kind == .asked && !$0.text.isEmpty }
            ?? displayEntries.first { $0.kind == .transcript || $0.kind == .heard }
        return first?.text ?? "Nothing said yet"
    }

    var duration: TimeInterval { (ended ?? Date()).timeIntervalSince(started) }

    /// What to show: the proper transcript where it exists, the rough live lines after it, plus
    /// questions, replies and reports, in time order.
    var displayEntries: [TranscriptEntry] {
        let properUntil = entries.filter { $0.kind == .transcript }.map(\.time).max() ?? .distantPast
        return entries
            .filter { !$0.text.isEmpty && !($0.kind == .heard && $0.time <= properUntil) }
            .sorted { $0.time < $1.time }
    }

    var transcribing: Int { pending?.count ?? 0 }

    /// Plain text, for sharing.
    var exportText: String {
        let time = DateFormatter()
        time.dateFormat = "h:mm:ss a"
        var lines = ["Bluey session, \(started.formatted(date: .abbreviated, time: .shortened))", ""]
        for entry in displayEntries {
            let who: String
            switch entry.kind {
            case .transcript: who = "Speaker \(entry.speaker ?? "?")"
            case .heard: who = "You"
            case .asked: who = "You asked"
            case .reply: who = "Bluey"
            case .report: who = "Research"
            }
            lines.append("[\(time.string(from: entry.time))] \(who): \(entry.text)")
        }
        return lines.joined(separator: "\n")
    }
}

/// Keeps every session on the phone, as one JSON file in the app's Documents folder.
final class SessionStore: ObservableObject {
    @Published private(set) var sessions: [BlueySession] = []  // newest first
    @Published private(set) var currentID: UUID?

    private let fileURL: URL = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        .appendingPathComponent("sessions.json")
    private var saveWork: DispatchWorkItem?

    init() {
        if let data = try? Data(contentsOf: fileURL),
           let saved = try? JSONDecoder().decode([BlueySession].self, from: data) {
            // A session left open by a crash or force-quit is closed at its last line.
            sessions = saved.map { session in
                var session = session
                if session.ended == nil { session.ended = session.entries.last?.time ?? session.started }
                return session
            }
        }
    }

    var current: BlueySession? { sessions.first { $0.id == currentID } }

    func start() {
        end()
        let session = BlueySession(started: Date())
        sessions.insert(session, at: 0)
        currentID = session.id
        save()
    }

    func end() {
        guard let id = currentID, let index = sessions.firstIndex(where: { $0.id == id }) else { return }
        currentID = nil
        let session = sessions[index]
        if session.entries.allSatisfy({ $0.text.isEmpty }) && session.transcribing == 0
            && Date().timeIntervalSince(session.started) < 20 {
            sessions.remove(at: index)  // a few seconds with nothing said: don't keep it
        } else {
            sessions[index].ended = Date()
            sessions[index].entries.removeAll { $0.text.isEmpty }
            dirty.insert(id)
            scheduleSync()
        }
        save()
    }

    /// Holds a spot for something you said, in the order you said it. The words arrive a moment later.
    func placeholder(itemID: String, asked: Bool) {
        update { session in
            guard !session.entries.contains(where: { $0.itemID == itemID }) else { return }
            session.entries.append(TranscriptEntry(kind: asked ? .asked : .heard, text: "", time: Date(), itemID: itemID))
        }
    }

    func heard(itemID: String, text: String, asked: Bool) {
        let text = text.trimmingCharacters(in: .whitespacesAndNewlines)
        update { session in
            if let i = session.entries.firstIndex(where: { $0.itemID == itemID }) {
                session.entries[i].text = text
                if asked { session.entries[i].kind = .asked }
            } else if !text.isEmpty {
                session.entries.append(TranscriptEntry(kind: asked ? .asked : .heard, text: text, time: Date(), itemID: itemID))
            }
        }
    }

    func reply(_ text: String) {
        let text = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }
        update { $0.entries.append(TranscriptEntry(kind: .reply, text: text, time: Date())) }
    }

    func report(_ text: String) {
        let text = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }
        update { $0.entries.append(TranscriptEntry(kind: .report, text: text, time: Date())) }
    }

    // MARK: Proper transcript (recorded audio, transcribed on the Mac)

    func addPending(_ session: UUID, index: Int, started: Date) {
        update(session) { s in
            var list = s.pending ?? []
            if !list.contains(where: { $0.index == index }) { list.append(PendingChunk(index: index, started: started)) }
            s.pending = list
        }
    }

    /// Adds a transcribed chunk: one line per speaker turn, at its real time.
    func transcribed(_ session: UUID, index: Int, started: Date, segments: [(speaker: String, start: Double, text: String)]) {
        update(session) { s in
            s.pending?.removeAll { $0.index == index }
            for segment in segments {
                let text = segment.text.trimmingCharacters(in: .whitespacesAndNewlines)
                guard !text.isEmpty else { continue }
                s.entries.append(TranscriptEntry(kind: .transcript, text: text,
                                                 time: started.addingTimeInterval(segment.start), speaker: segment.speaker))
            }
            s.entries.sort { $0.time < $1.time }
        }
    }

    func setNotesPath(_ session: UUID, _ path: String) {
        guard let i = sessions.firstIndex(where: { $0.id == session }), sessions[i].notesPath != path else { return }
        sessions[i].notesPath = path
        scheduleSave(sync: false)
    }

    /// Recent words from this session, for a fresh connection to pick up where the last one left off.
    func recentText(limit: Int = 6000) -> String? {
        guard let current else { return nil }
        let text = current.displayEntries
            .filter { $0.kind != .report }
            .map { ($0.kind == .reply ? "Bluey: " : "") + $0.text }
            .joined(separator: "\n")
        return text.isEmpty ? nil : String(text.suffix(limit))
    }

    // MARK: Sync to the Mac (it writes the meeting-notes files)

    /// Called with sessions that changed, a few seconds after the changes settle.
    var onSync: (([BlueySession]) -> Void)?
    private var dirty: Set<UUID> = []
    private var syncWork: DispatchWorkItem?

    /// Re-sends recent sessions (after the phone reconnects to the Mac).
    func resyncRecent() {
        let cutoff = Date().addingTimeInterval(-3 * 86_400)
        dirty.formUnion(sessions.filter { $0.started > cutoff }.map(\.id))
        scheduleSync()
    }

    private func scheduleSync() {
        syncWork?.cancel()
        let work = DispatchWorkItem { [weak self] in
            guard let self else { return }
            let changed = self.sessions.filter { self.dirty.contains($0.id) }
            self.dirty = []
            if !changed.isEmpty { self.onSync?(changed) }
        }
        syncWork = work
        DispatchQueue.main.asyncAfter(deadline: .now() + 6, execute: work)
    }

    func delete(_ id: UUID) {
        if id == currentID { currentID = nil }
        sessions.removeAll { $0.id == id }
        save()
    }

    private func update(_ change: (inout BlueySession) -> Void) {
        guard let id = currentID else { return }
        update(id, change)
    }

    private func update(_ id: UUID, _ change: (inout BlueySession) -> Void) {
        guard let index = sessions.firstIndex(where: { $0.id == id }) else { return }
        change(&sessions[index])
        dirty.insert(id)
        scheduleSync()
        scheduleSave()
    }

    private func scheduleSave(sync: Bool = false) {
        saveWork?.cancel()
        let work = DispatchWorkItem { [weak self] in self?.save() }
        saveWork = work
        DispatchQueue.main.asyncAfter(deadline: .now() + 1, execute: work)
    }

    private func save() {
        saveWork?.cancel()
        guard let data = try? JSONEncoder().encode(sessions) else { return }
        try? data.write(to: fileURL, options: .atomic)
    }
}
