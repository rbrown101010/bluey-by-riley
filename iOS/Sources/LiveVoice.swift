import AVFoundation
import Foundation

/// A live session with OpenAI's Realtime API, running on the phone. Once he's awake the mic is on the whole
/// time, so everything you say becomes context, but he stays quiet until you hold the screen and ask.
/// He never talks out loud: replies are text (speech bubbles on the Mac) with a little cartoon chirp here.
/// Tools (look at the screen, point) run on the Mac.
final class LiveVoice: NSObject, ObservableObject {
    enum State: Equatable { case asleep, waking, listening, asking, thinking, speaking }

    @Published private(set) var state: State = .asleep

    static let model = "gpt-realtime-2.1"

    /// Asks the Mac for a short-lived key. Calls back with nil on failure.
    var requestToken: ((@escaping (String?) -> Void) -> Void)?
    /// Runs a tool on the Mac: (name, JSON arguments) → (output text, optional JPEG base64).
    var runTool: ((String, String, @escaping (String, String?) -> Void) -> Void)?
    /// What he's saying, as it streams in. `done` is true when the reply finished.
    var onCaption: ((String, _ done: Bool) -> Void)?
    var onStateChange: ((State) -> Void)?
    /// For the saved transcript: a session started or ended, something you said (in order, then its words), his replies.
    var onSessionStart: (() -> Void)?
    var onSessionEnd: (() -> Void)?
    var onUserTurn: ((_ itemID: String, _ asked: Bool) -> Void)?
    var onUserWords: ((_ itemID: String, _ text: String, _ asked: Bool) -> Void)?
    var onReply: ((String) -> Void)?
    var onReport: ((String) -> Void)?

    /// Loudness of his chirp right now, 0…1.
    private(set) var level: Double = 0

    var volume: Double {
        get { UserDefaults.standard.object(forKey: "volume") as? Double ?? 1 }
        set {
            UserDefaults.standard.set(newValue, forKey: "volume")
            player.volume = Float(newValue)
        }
    }

    private var socket: URLSessionWebSocketTask?
    private let engine = AVAudioEngine()
    private let player = AVAudioPlayerNode()
    private var converter: AVAudioConverter?
    private let wireFormat = AVAudioFormat(commonFormat: .pcmFormatInt16, sampleRate: 24000, channels: 1, interleaved: true)!
    private let playFormat = AVAudioFormat(standardFormatWithSampleRate: 24000, channels: 1)!
    private var audioReady = false

    private var transcript = ""
    private var pendingBuffers = 0
    private var responseActive = false
    private var sleepAfterReply = false
    /// Holding the screen to ask. Released before the session was ready: ask as soon as it is.
    private var holding = false
    private var askWhenReady = false
    private var chirpedThisResponse = false
    /// Turns that were questions (said while holding, or committed when you let go).
    private var askedItems: Set<String> = []
    private var awaitingQuestion = false

    private func setState(_ new: State) {
        guard new != state else { return }
        state = new
        onStateChange?(new)
    }

    // MARK: Wake and sleep

    func toggle() {
        state == .asleep ? wake() : sleep()
    }

    func wake() {
        guard state == .asleep else { return }
        setState(.waking)
        AVAudioApplication.requestRecordPermission { granted in
            DispatchQueue.main.async {
                guard granted else {
                    self.onCaption?("I need the microphone. Turn it on for Bluey in the iPhone's Settings.", true)
                    self.setState(.asleep)
                    return
                }
                guard let requestToken = self.requestToken else { self.setState(.asleep); return }
                requestToken { token in
                    DispatchQueue.main.async {
                        guard self.state == .waking else { return }
                        guard let token else { self.setState(.asleep); return }
                        self.connect(token)
                    }
                }
            }
        }
    }

    func sleep() {
        if socket != nil { onSessionEnd?() }
        askedItems = []
        awaitingQuestion = false
        socket?.cancel(with: .normalClosure, reason: nil)
        socket = nil
        stopAudio()
        transcript = ""
        pendingBuffers = 0
        responseActive = false
        sleepAfterReply = false
        holding = false
        askWhenReady = false
        toolsRunning = 0
        level = 0
        setState(.asleep)
    }

    /// Says a quick hi (for checking the chirp volume).
    func sayHi() {
        guard socket != nil else { wake(); return }
        send(["type": "response.create", "response": ["instructions": "Reply with a quick, cheerful hi in under eight words."]])
    }

    // MARK: Hold to ask

    /// You pressed and held the screen: what you say now is the question.
    func beginAsk() {
        holding = true
        onCaption?("", false)  // clears his last bubble
        if state == .asleep { wake(); return }
        guard socket != nil else { return }
        if state == .listening || state == .speaking { setState(.asking) }
    }

    /// You let go: he answers (or does the thing) using everything he's heard as context.
    func endAsk() {
        guard holding else { return }
        holding = false
        guard socket != nil, state != .waking else { askWhenReady = true; return }
        ask()
    }

    private func ask() {
        askWhenReady = false
        setState(.thinking)
        awaitingQuestion = true
        // Close off what you just said (it may still be mid-sentence) and ask for a reply.
        send(["type": "input_audio_buffer.commit"])
        send(["type": "response.create"])
    }

    // MARK: Connection

    private func connect(_ token: String) {
        var request = URLRequest(url: URL(string: "wss://api.openai.com/v1/realtime?model=\(Self.model)")!)
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        let socket = URLSession.shared.webSocketTask(with: request)
        self.socket = socket
        socket.resume()
        receive(on: socket)
        do {
            try startAudio()
        } catch {
            onCaption?("I couldn't start the microphone: \(error.localizedDescription)", true)
            sleep()
            return
        }
        onSessionStart?()
        chirp(syllables: 2)
        if askWhenReady {
            ask()
        } else {
            setState(holding ? .asking : .listening)
        }
    }

    private func send(_ event: [String: Any]) {
        guard let socket, let data = try? JSONSerialization.data(withJSONObject: event),
              let text = String(data: data, encoding: .utf8) else { return }
        socket.send(.string(text)) { error in
            if let error { NSLog("Googly realtime send error: \(error)") }
        }
    }

    private func receive(on socket: URLSessionWebSocketTask) {
        socket.receive { [weak self] result in
            guard let self, socket === self.socket else { return }
            switch result {
            case .success(.string(let text)):
                if let data = text.data(using: .utf8),
                   let event = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                    DispatchQueue.main.async { self.handle(event) }
                }
                self.receive(on: socket)
            case .success:
                self.receive(on: socket)
            case .failure(let error):
                NSLog("Googly realtime closed: \(error)")
                DispatchQueue.main.async { if socket === self.socket { self.sleep() } }
            }
        }
    }

    // MARK: Events

    private func handle(_ event: [String: Any]) {
        guard let type = event["type"] as? String else { return }
        switch type {
        case "response.created":
            responseActive = true
            transcript = ""
            chirpedThisResponse = false

        case "response.output_text.delta", "response.output_audio_transcript.delta":
            if let delta = event["delta"] as? String {
                transcript += delta
                if !chirpedThisResponse, !transcript.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                    chirpedThisResponse = true
                    setState(.speaking)
                    chirp(syllables: min(max(transcript.split(separator: " ").count, 3), 5))
                }
                onCaption?(transcript, false)
            }

        case "input_audio_buffer.committed":
            if let item = event["item_id"] as? String {
                let asked = holding || awaitingQuestion
                if asked { askedItems.insert(item) }
                if awaitingQuestion, !holding { awaitingQuestion = false }
                onUserTurn?(item, asked)
            }

        case "conversation.item.input_audio_transcription.completed":
            if let item = event["item_id"] as? String, let text = event["transcript"] as? String {
                onUserWords?(item, text, askedItems.contains(item))
            }

        case "response.done":
            responseActive = false
            if !transcript.isEmpty {
                onCaption?(transcript, true)
                onReply?(transcript)
            }
            let output = (event["response"] as? [String: Any])?["output"] as? [[String: Any]] ?? []
            let calls = output.filter { $0["type"] as? String == "function_call" }
            if !calls.isEmpty {
                if state != .speaking { setState(.thinking) }
                runTools(calls)
            }
            finishIfQuiet()

        case "error":
            let error = event["error"] as? [String: Any]
            if (error?["code"] as? String) == "input_audio_buffer_commit_empty" { awaitingQuestion = false }
            let message = (error?["message"] as? String) ?? "Something went wrong."
            NSLog("Googly realtime error: \(message)")

        default:
            break
        }
    }

    private func runTools(_ calls: [[String: Any]]) {
        var remaining = calls.count
        toolsRunning += 1
        var images: [String] = []
        for call in calls {
            let name = call["name"] as? String ?? ""
            let callID = call["call_id"] as? String ?? ""
            let arguments = call["arguments"] as? String ?? "{}"
            if name == "go_to_sleep" { sleepAfterReply = true }
            let finish: (String, String?) -> Void = { [weak self] output, image in
                DispatchQueue.main.async {
                    guard let self, self.socket != nil else { return }
                    if name == "web_research", let range = output.range(of: "\n---REPORT---\n") {
                        self.onReport?(String(output[range.upperBound...]))
                    }
                    self.send(["type": "conversation.item.create",
                               "item": ["type": "function_call_output", "call_id": callID, "output": output]])
                    if let image { images.append(image) }
                    remaining -= 1
                    if remaining == 0 {
                        self.toolsRunning = max(0, self.toolsRunning - 1)
                        // Screenshots go in as a user image so he can actually see the screen.
                        for image in images {
                            self.send(["type": "conversation.item.create",
                                       "item": ["type": "message", "role": "user",
                                                "content": [["type": "input_image", "image_url": "data:image/jpeg;base64,\(image)"]]]])
                        }
                        self.send(["type": "response.create"])
                    }
                }
            }
            if let runTool { runTool(name, arguments, finish) } else { finish("The Mac isn't connected.", nil) }
        }
    }

    private var toolsRunning = 0

    /// Back to listening once he's replied and chirped (or asleep, if he said goodbye).
    private func finishIfQuiet() {
        guard pendingBuffers == 0, !responseActive, toolsRunning == 0 else { return }
        if sleepAfterReply { sleep(); return }
        if state == .speaking || state == .thinking { setState(holding ? .asking : .listening) }
    }

    // MARK: Audio

    private func startAudio() throws {
        #if os(iOS)
        let session = AVAudioSession.sharedInstance()
        try session.setCategory(.playAndRecord, mode: .voiceChat, options: [.defaultToSpeaker, .allowBluetoothHFP])
        try session.setActive(true)
        #endif

        if !audioReady {
            let input = engine.inputNode
            try input.setVoiceProcessingEnabled(true)  // echo cancellation, so he doesn't hear himself
            engine.attach(player)
            engine.connect(player, to: engine.mainMixerNode, format: playFormat)
            player.installTap(onBus: 0, bufferSize: 1024, format: playFormat) { [weak self] buffer, _ in
                guard let self, let samples = buffer.floatChannelData?[0] else { return }
                var sum: Float = 0
                for i in 0..<Int(buffer.frameLength) { sum += samples[i] * samples[i] }
                let rms = sqrt(sum / Float(max(buffer.frameLength, 1)))
                self.level = min(1, Double(rms) * 5)
            }
            audioReady = true
        }
        let input = engine.inputNode
        let inputFormat = input.outputFormat(forBus: 0)
        converter = AVAudioConverter(from: inputFormat, to: wireFormat)
        input.removeTap(onBus: 0)
        input.installTap(onBus: 0, bufferSize: 2400, format: inputFormat) { [weak self] buffer, _ in
            self?.sendMic(buffer)
        }
        player.volume = Float(volume)
        engine.prepare()
        try engine.start()
        player.play()
    }

    private func stopAudio() {
        engine.inputNode.removeTap(onBus: 0)
        player.stop()
        engine.stop()
        #if os(iOS)
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
        #endif
    }

    private func sendMic(_ buffer: AVAudioPCMBuffer) {
        guard let converter else { return }
        let ratio = wireFormat.sampleRate / buffer.format.sampleRate
        let capacity = AVAudioFrameCount(Double(buffer.frameLength) * ratio + 32)
        guard let out = AVAudioPCMBuffer(pcmFormat: wireFormat, frameCapacity: capacity) else { return }
        var fed = false
        var error: NSError?
        converter.convert(to: out, error: &error) { _, status in
            if fed { status.pointee = .noDataNow; return nil }
            fed = true
            status.pointee = .haveData
            return buffer
        }
        guard error == nil, out.frameLength > 0, let samples = out.int16ChannelData?[0] else { return }
        let data = Data(bytes: samples, count: Int(out.frameLength) * 2)
        DispatchQueue.main.async {
            self.send(["type": "input_audio_buffer.append", "audio": data.base64EncodedString()])
        }
    }

    /// A tiny cartoon chirp: a few soft, round, bell-like notes from a happy pentatonic scale,
    /// each with a little upward "boop" at the start, like a small creature humming.
    private func chirp(syllables: Int) {
        guard audioReady else { return }
        let rate = playFormat.sampleRate
        // C major pentatonic, two octaves up high (C6…E7), so it always sounds sweet together.
        let scale = [1046.5, 1174.7, 1318.5, 1568.0, 1760.0, 2093.0, 2349.3, 2637.0]
        var index = Int.random(in: 1...3)
        var samples: [Float] = []
        for i in 0..<syllables {
            if i > 0 { index = min(max(index + [-1, 1, 1, 2].randomElement()!, 0), scale.count - 1) }
            let note = scale[index] * 0.5  // drop an octave: rounder, less piercing
            let duration = i == syllables - 1 ? 0.13 : Double.random(in: 0.07...0.09)
            let count = Int(duration * rate)
            var phase = 0.0
            for n in 0..<count {
                let time = Double(n) / rate
                let t = Double(n) / Double(count)
                // Scoops up into the note over the first 25 ms, with a gentle wobble on the last one.
                let scoop = 1 - 0.18 * exp(-time / 0.012)
                let wobble = i == syllables - 1 ? 1 + 0.012 * sin(time * 2 * .pi * 18) : 1
                phase += 2 * .pi * note * scoop * wobble / rate
                let attack = min(1, time / 0.006)
                let envelope = attack * exp(-t * 3.2) * (1 - pow(t, 6))
                let wave = sin(phase) + 0.12 * sin(2 * phase)
                samples.append(Float(wave * envelope * 0.26))
            }
            samples += [Float](repeating: 0, count: Int(rate * 0.028))
        }
        guard let buffer = AVAudioPCMBuffer(pcmFormat: playFormat, frameCapacity: AVAudioFrameCount(samples.count)),
              let out = buffer.floatChannelData?[0] else { return }
        buffer.frameLength = AVAudioFrameCount(samples.count)
        samples.withUnsafeBufferPointer { out.update(from: $0.baseAddress!, count: samples.count) }
        pendingBuffers += 1
        player.scheduleBuffer(buffer) { [weak self] in
            DispatchQueue.main.async {
                guard let self else { return }
                self.pendingBuffers = max(0, self.pendingBuffers - 1)
                if self.pendingBuffers == 0 { self.level = 0 }
                self.finishIfQuiet()
            }
        }
    }
}
