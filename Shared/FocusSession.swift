import Foundation

public enum FocusActivity: String, Codable, Sendable {
    case onTask = "on_task", offTask = "off_task", uncertain, unavailable, paused
}

public struct FocusCheck: Codable, Identifiable, Equatable, Sendable {
    public var id = UUID()
    public var elapsed: Double
    public var activity: FocusActivity
    public var probability: Double
    public var confidence: Double
    /// Full choice estimates. Optional so history from older builds still decodes.
    public var probabilities: [String: Double]?
    /// Focus-clock seconds represented by this observation; older checks used 30.
    public var sampleDuration: Double?
    public var nudged = false
    /// Skipped because the user's appeal verified this app or site as work for the session.
    public var approved: Bool?
    public init(elapsed: Double, activity: FocusActivity, probability: Double = 0, confidence: Double = 0,
                probabilities: [String: Double]? = nil, sampleDuration: Double? = nil) {
        self.elapsed = elapsed; self.activity = activity
        self.probability = probability; self.confidence = confidence
        self.probabilities = probabilities
        self.sampleDuration = sampleDuration
    }
    public func estimate(for category: FocusActivity) -> Double? {
        guard [.onTask, .offTask, .uncertain].contains(activity),
              [.onTask, .offTask, .uncertain].contains(category) else { return nil }
        // Older checks retained only P(off_task). Never infer P(on_task) from its complement.
        let value = probabilities?[category.rawValue] ?? (category == .offTask ? probability : nil)
        guard let value, value.isFinite, (0...1).contains(value) else { return nil }
        return value
    }
}

/// Mac-authoritative state. No images, screen text, audio or API keys are persisted here.
public struct FocusSession: Codable, Identifiable, Equatable, Sendable {
    public enum Status: String, Codable, Sendable { case running, paused, ended }
    public var id = UUID()
    public var task: String
    public var duration: Double
    public var startedAt = Date()
    public var elapsed: Double = 0
    public var status: Status = .running
    public var detail = "First check in 30 seconds"
    public var checks: [FocusCheck] = []
    // Optional fields preserve decoding of existing session history.
    public var developerMode: Bool?
    public var usedDeveloperMode: Bool?
    public var realElapsed: Double?
    /// Sites or apps a verified appeal accepted as work, or locked for the rest of this session.
    public var approved: [String]?
    public var blocked: [String]?
    public var appealing: Bool?
    public var isDeveloperMode: Bool { developerMode == true }
    public var clockRate: Double { isDeveloperMode ? 4 : 1 }
    public var checkInterval: Double { isDeveloperMode ? 10 : 30 } // real seconds
    public var observationDuration: Double { checkInterval * clockRate }
    public var realActiveElapsed: Double { realElapsed ?? elapsed }
    public var remaining: Double { max(0, duration - elapsed) }
    public init(task: String, duration: Double = 1800, developerMode: Bool = false) {
        self.task = String(task.prefix(500)); self.duration = min(14400, max(60, duration))
        self.developerMode = developerMode; self.usedDeveloperMode = developerMode; self.realElapsed = 0
        self.detail = "First check in \(Int(checkInterval)) seconds"
    }
    public static func clock(_ seconds: Double) -> String {
        let n = max(0, Int(seconds.rounded(.up)))
        return String(format: "%02d:%02d", n / 60, n % 60)
    }
    public mutating func advance(_ seconds: Double) {
        guard status == .running, seconds.isFinite, seconds > 0 else { return }
        realElapsed = realActiveElapsed + min(seconds, remaining / clockRate)
        elapsed = min(duration, elapsed + seconds * clockRate)
        if elapsed >= duration { status = .ended; detail = "Time's up. Lovely bit of focus." }
    }
    public mutating func pause(_ reason: String) {
        guard status == .running else { return }
        status = .paused; detail = reason
        checks.append(FocusCheck(elapsed: elapsed, activity: .paused))
    }
    public mutating func resume() {
        guard status == .paused else { return }
        status = .running; detail = "Resumed. Next check in \(Int(checkInterval)) seconds"
    }
    public mutating func setDeveloperMode(_ enabled: Bool) {
        developerMode = enabled
        if enabled { usedDeveloperMode = true }
    }
    public mutating func end() { status = .ended; detail = "Session finished" }
}

public struct FocusSync: Codable, Sendable {
    public var current: FocusSession?
    public var history: [FocusSession]
    public var revision: Int
    public var sentAt: Date
    public var developerMode: Bool?
    public init(current: FocusSession?, history: [FocusSession], revision: Int, developerMode: Bool = false) {
        self.current = current; self.history = history; self.revision = revision; self.sentAt = Date()
        self.developerMode = developerMode
    }
}

/// Count consecutive fresh off-task choices with majority probability. The API's separate
/// confidence score is diagnostic, not a second probability threshold. Estimates aren't guarantees.
public struct FocusNudgePolicy {
    private var run: [FocusCheck] = []
    private var lastNudge = -Double.infinity
    private let maximumGap: Double
    private let developerMode: Bool
    public init(maximumGap: Double = 45, developerMode: Bool = false) {
        self.maximumGap = maximumGap; self.developerMode = developerMode
    }
    public mutating func reset() { run = [] }
    public mutating func observe(_ check: FocusCheck, age: Double) -> Bool {
        guard age >= 0, age <= 20, check.elapsed.isFinite,
              check.activity == .offTask, check.probability.isFinite, check.confidence.isFinite,
              (0.5...1).contains(check.probability), (0...1).contains(check.confidence) else {
            reset(); return false
        }
        if let last = run.last {
            guard check.elapsed > last.elapsed else { reset(); return false }
            if check.elapsed - last.elapsed > maximumGap { reset() }
        }
        run.append(check)
        let strength = run.map(\.probability).reduce(0, +) / Double(run.count)
        let minimum = developerMode ? 40.0 : 120.0
        let maximum = developerMode ? 80.0 : 240.0
        let required = strength >= 0.95 ? minimum : maximum - max(0, strength - 0.5) / 0.45 * (maximum - minimum)
        guard run.count >= 2, check.elapsed - (run.first?.elapsed ?? check.elapsed) >= max(minimum, required),
              check.elapsed - lastNudge >= 120 else { return false }
        lastNudge = check.elapsed; reset(); return true
    }
}

public struct FocusDecision: Equatable {
    public let activity: FocusActivity
    public let probability: Double
    public let confidence: Double
    public let probabilities: [String: Double]
    public enum DecodeError: LocalizedError {
        case invalidAnswer
        public var errorDescription: String? { "Decisions returned an unsupported or malformed answer. This check was skipped." }
    }
    /// The Decisions choice contract has no explanation or coordinates.
    public static func decode(_ data: Data) throws -> FocusDecision {
        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              let answers = json["answers"] as? [[String: Any]],
              let a = answers.first(where: { $0["name"] as? String == "activity" }),
              a["type"] as? String == "choice",
              let value = a["choice"] as? String, let activity = FocusActivity(rawValue: value),
              [.onTask, .offTask, .uncertain].contains(activity),
              let confidence = a["confidence"] as? Double, confidence.isFinite, (0...1).contains(confidence),
              let ps = a["probabilities"] as? [[String: Any]], ps.count == 3 else { throw DecodeError.invalidAnswer }
        var values: [String: Double] = [:]
        for p in ps {
            guard let v = p["value"] as? String, ["on_task", "off_task", "uncertain"].contains(v),
                  values[v] == nil, let n = p["probability"] as? Double, n.isFinite, (0...1).contains(n) else {
                throw DecodeError.invalidAnswer
            }
            values[v] = n
        }
        guard abs(values.values.reduce(0, +) - 1) < 0.02,
              let off = values["off_task"] else { throw DecodeError.invalidAnswer }
        return FocusDecision(activity: activity, probability: off, confidence: confidence, probabilities: values)
    }
}
