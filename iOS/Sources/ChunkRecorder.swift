import AVFoundation
import Foundation

/// Records everything the mic hears during a session to small AAC files, five minutes each,
/// so an all-day session never builds one giant file and each piece can be transcribed as soon as it's done.
final class ChunkRecorder {
    struct Chunk {
        let sessionID: UUID
        let index: Int
        let url: URL
        /// When this chunk started, so its transcript lines get real times.
        let started: Date
    }

    static let chunkLength: TimeInterval = 300

    /// Called on the main queue each time a chunk is finished.
    var onChunk: ((Chunk) -> Void)?

    private let queue = DispatchQueue(label: "googly.recorder")
    private var sessionID: UUID?
    private var file: AVAudioFile?
    private var fileFormat: AVAudioFormat?
    private var chunkStarted = Date()
    private var chunkIndex = 0
    private var chunkURL: URL?

    static var folder: URL {
        FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0].appendingPathComponent("audio", isDirectory: true)
    }

    func start(session: UUID) {
        queue.async {
            self.closeChunk()
            self.sessionID = session
            self.chunkIndex = 0
        }
    }

    /// Feeds one buffer from the mic tap (any thread).
    func append(_ buffer: AVAudioPCMBuffer) {
        guard let copy = buffer.copy() as? AVAudioPCMBuffer else { return }
        queue.async { self.write(copy) }
    }

    func finish() {
        queue.async {
            self.closeChunk()
            self.sessionID = nil
        }
    }

    private func write(_ buffer: AVAudioPCMBuffer) {
        guard let sessionID else { return }
        if file != nil, Date().timeIntervalSince(chunkStarted) >= Self.chunkLength { closeChunk() }
        if file == nil || fileFormat != buffer.format {
            closeChunk()
            openChunk(sessionID: sessionID, format: buffer.format)
        }
        try? file?.write(from: buffer)
    }

    private func openChunk(sessionID: UUID, format: AVAudioFormat) {
        let folder = Self.folder.appendingPathComponent(sessionID.uuidString, isDirectory: true)
        try? FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        chunkIndex += 1
        let url = folder.appendingPathComponent(String(format: "chunk-%03d.m4a", chunkIndex))
        let settings: [String: Any] = [
            AVFormatIDKey: kAudioFormatMPEG4AAC,
            AVSampleRateKey: format.sampleRate,
            AVNumberOfChannelsKey: min(format.channelCount, 2),
            AVEncoderBitRateKey: 48_000,
        ]
        file = try? AVAudioFile(forWriting: url, settings: settings,
                                commonFormat: format.commonFormat, interleaved: format.isInterleaved)
        fileFormat = format
        chunkURL = url
        chunkStarted = Date()
    }

    private func closeChunk() {
        guard file != nil, let url = chunkURL, let sessionID else { file = nil; return }
        file = nil  // closing the file finishes writing it
        let chunk = Chunk(sessionID: sessionID, index: chunkIndex, url: url, started: chunkStarted)
        chunkURL = nil
        DispatchQueue.main.async { self.onChunk?(chunk) }
    }
}

/// Sends recorded chunks to the Mac for transcription and keeps the Mac's meeting-notes files up to date.
enum NotesSync {
    private static var inFlight: Set<String> = []

    static func chunkURL(_ session: UUID, index: Int) -> URL {
        ChunkRecorder.folder.appendingPathComponent(session.uuidString, isDirectory: true)
            .appendingPathComponent(String(format: "chunk-%03d.m4a", index))
    }

    static func upload(_ session: UUID, index: Int, started: Date, store: SessionStore, link: MacLink) {
        let key = "\(session)-\(index)"
        guard !inFlight.contains(key), link.connected,
              let sessionStarted = store.sessions.first(where: { $0.id == session })?.started else { return }
        let url = chunkURL(session, index: index)
        guard let audio = try? Data(contentsOf: url) else {
            store.transcribed(session, index: index, started: started, segments: [])  // nothing to send
            return
        }
        inFlight.insert(key)
        let meta: [String: Any] = ["session": session.uuidString, "index": index,
                                   "started": started.timeIntervalSince1970,
                                   "sessionStarted": sessionStarted.timeIntervalSince1970]
        let metaText = (try? JSONSerialization.data(withJSONObject: meta)).flatMap { String(data: $0, encoding: .utf8) }
        link.request(Packet(command: "transcribe", audio: audio.base64EncodedString(), text: metaText)) { reply in
            inFlight.remove(key)
            guard let text = reply?.text, let json = try? JSONSerialization.jsonObject(with: Data(text.utf8)) as? [String: Any] else {
                // The Mac couldn't do it right now: try again shortly.
                DispatchQueue.main.asyncAfter(deadline: .now() + 30) {
                    upload(session, index: index, started: started, store: store, link: link)
                }
                return
            }
            let segments = (json["segments"] as? [[String: Any]] ?? []).map {
                (speaker: $0["speaker"] as? String ?? "?", start: $0["start"] as? Double ?? 0, text: $0["text"] as? String ?? "")
            }
            store.transcribed(session, index: index, started: started, segments: segments)
            if let path = json["notesPath"] as? String { store.setNotesPath(session, path) }
            try? FileManager.default.removeItem(at: url)  // the Mac keeps the audio
        }
    }

    static func retryPending(store: SessionStore, link: MacLink) {
        for session in store.sessions {
            for chunk in session.pending ?? [] {
                upload(session.id, index: chunk.index, started: chunk.started, store: store, link: link)
            }
        }
    }

    static func send(_ sessions: [BlueySession], store: SessionStore, link: MacLink) {
        guard link.connected else { return }
        for session in sessions {
            let entries: [[String: Any]] = session.displayEntries.map { entry in
                var e: [String: Any] = ["kind": entry.kind.rawValue, "text": entry.text, "time": entry.time.timeIntervalSince1970]
                if let speaker = entry.speaker { e["speaker"] = speaker }
                return e
            }
            var json: [String: Any] = ["id": session.id.uuidString, "started": session.started.timeIntervalSince1970,
                                       "transcribing": session.transcribing, "entries": entries]
            if let ended = session.ended { json["ended"] = ended.timeIntervalSince1970 }
            guard let data = try? JSONSerialization.data(withJSONObject: json), let text = String(data: data, encoding: .utf8) else { continue }
            link.request(Packet(command: "notes", text: text)) { reply in
                if let path = reply?.text { store.setNotesPath(session.id, path) }
            }
        }
    }
}
