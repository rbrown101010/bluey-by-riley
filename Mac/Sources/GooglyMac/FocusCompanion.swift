import AppKit
import GooglyShared

/// The Mac owns the clock, check cadence and cancellation. The phone only sends commands
/// and renders authoritative snapshots. Generation guards discard every late callback.
@MainActor
final class FocusCompanion {
    private(set) var current: FocusSession?
    private(set) var history: [FocusSession] = []
    var onChange: ((FocusSync) -> Void)?
    var onNudge: ((String, Target?) -> Void)?
    var connected = false
    private(set) var developerMode: Bool
    private let settings: UserDefaults?
    private var lastPing = -Double.infinity
    private var lastTick = ProcessInfo.processInfo.systemUptime
    private var lastCheck: Double = 0
    private var policy = FocusNudgePolicy()
    private var timer: Timer?
    private var work: Task<Void, Never>?
    private var generation = UUID()
    private var revision = 0
    private let countdown = FocusCountdown()
    private var observers: [NSObjectProtocol] = []
    private let file: URL
    private let now: () -> Double
    private let permission: () -> Bool
    private let hasKey: () -> Bool
    private let capture: () async throws -> ScreenSnapshot
    private let classify: (ScreenSnapshot, FocusSession, Double) async throws -> FocusDecision
    private let prepareNudge: (ScreenSnapshot, String) async throws -> FocusAPI.Nudge
    private let screenUnlocked: () -> Bool
    private let showsCountdown: Bool
    private let frontContext: @MainActor () -> FocusContext?
    private let verifyAppeal: (ScreenSnapshot, String, String, String) async throws -> FocusAPI.Appeal
    private let leave: @MainActor (FocusContext, FocusContext?, Bool) -> Void
    /// Where the user last worked on task, and the latest off-task evidence. Memory only.
    private var workContext: FocusContext?
    private var offTask: (screen: ScreenSnapshot, context: FocusContext)?
    private var appealWork: Task<Void, Never>?
    private var lastEnforced = -Double.infinity

    init(now: @escaping () -> Double = { ProcessInfo.processInfo.systemUptime },
         permission: @escaping () -> Bool = { CGPreflightScreenCaptureAccess() },
         hasKey: @escaping () -> Bool = { Keychain.get(.openai) != nil },
         screenUnlocked: @escaping () -> Bool = {
            let session = CGSessionCopyCurrentDictionary() as? [String: Any]
            return session?["CGSSessionScreenIsLocked"] as? Bool != true && session?["kCGSessionOnConsoleKey"] as? Bool != false
         },
         capture: @escaping () async throws -> ScreenSnapshot = { try await ScreenReader.snapshot() },
         classify: @escaping (ScreenSnapshot, FocusSession, Double) async throws -> FocusDecision = { try await FocusAPI.classify($0, session: $1, idle: $2) },
         prepareNudge: @escaping (ScreenSnapshot, String) async throws -> FocusAPI.Nudge = { try await FocusAPI.nudge($0, task: $1) },
         showsCountdown: Bool = true,
         historyFile: URL? = nil, settings: UserDefaults? = .standard,
         frontContext: @escaping @MainActor () -> FocusContext? = { FrontContext.current() },
         verifyAppeal: @escaping (ScreenSnapshot, String, String, String) async throws -> FocusAPI.Appeal = {
            try await FocusAPI.appeal($0, task: $1, context: $2, reason: $3)
         },
         leave: @escaping @MainActor (FocusContext, FocusContext?, Bool) -> Void = { FrontContext.leave($0, to: $1, lock: $2) }) {
        self.now = now; self.permission = permission; self.hasKey = hasKey
        self.capture = capture; self.classify = classify; self.screenUnlocked = screenUnlocked
        self.prepareNudge = prepareNudge
        self.frontContext = frontContext; self.verifyAppeal = verifyAppeal; self.leave = leave
        self.showsCountdown = showsCountdown; self.lastTick = now()
        self.settings = settings; self.developerMode = settings?.bool(forKey: "focusDeveloperMode") ?? false
        let dir = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("Googly")
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true, attributes: [.posixPermissions: 0o700])
        file = historyFile ?? dir.appendingPathComponent("focus-history.json")
        history = (try? Data(contentsOf: file)).flatMap { try? JSONDecoder().decode([FocusSession].self, from: $0) } ?? []
    }
    func startService() {
        let timer = Timer(timeInterval: 1, repeats: true) { [weak self] _ in
            Task { @MainActor in self?.tick() }
        }
        RunLoop.main.add(timer, forMode: .common)
        self.timer = timer
        for name in ["com.apple.screenIsLocked"] {
            observers.append(DistributedNotificationCenter.default().addObserver(forName: NSNotification.Name(name), object: nil, queue: .main) { [weak self] _ in
                Task { @MainActor in self?.pause("Mac locked. Resume when you're ready.") }
            })
        }
        for name in [NSWorkspace.willSleepNotification, NSWorkspace.screensDidSleepNotification, NSWorkspace.sessionDidResignActiveNotification] {
            observers.append(NSWorkspace.shared.notificationCenter.addObserver(forName: name, object: nil, queue: .main) { [weak self] _ in
                Task { @MainActor in self?.pause("Mac sleeping or locked. Resume when you're ready.") }
            })
        }
    }
    func shutdown() { pause("Bluey closed"); timer?.invalidate(); cancel() }
    func heartbeat() { lastPing = now(); connected = true; if !monitoring { publish() } }
    func disconnected() { connected = false; pause("Phone disconnected. Reconnect, then resume.") }
    func sync() { publish() }
    var monitoring: Bool { current?.status == .running }
    var hasSession: Bool { current != nil && current?.status != .ended }

    @discardableResult func setDeveloperMode(_ enabled: Bool) -> String {
        guard enabled != developerMode else { return "Developer Mode is already \(enabled ? "on" : "off")." }
        if monitoring { advanceClock() }
        cancel()
        developerMode = enabled; settings?.set(enabled, forKey: "focusDeveloperMode")
        if hasSession {
            current?.setDeveloperMode(enabled)
            current?.detail = enabled ? "Developer Mode: clock 4×, next check in 10 seconds" : "Normal speed. Next check in 30 seconds"
        }
        policy = FocusNudgePolicy(maximumGap: (current?.observationDuration ?? (enabled ? 40 : 30)) * 1.5,
                                  developerMode: enabled)
        lastTick = now(); lastCheck = current?.elapsed ?? 0
        if current?.status == .ended { finish() } else { publish(); persist() }
        return enabled ? "Developer Mode on: clock 4×, checks every 10 seconds." : "Developer Mode off: normal clock, checks every 30 seconds."
    }

    @discardableResult func start(task: String, minutes: Double = 30) -> String {
        let task = task.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !task.isEmpty else { return "Tell me the task first." }
        guard minutes.isFinite else { return "Use a duration between 1 and 240 minutes." }
        guard !hasSession else { return "There's already a focus session. End it before starting another." }
        guard freshConnection else { return "Connect the paired phone first." }
        guard permission() else { return "Screen Recording is off. Enable Bluey in System Settings > Privacy & Security > Screen Recording, then reopen Bluey." }
        guard hasKey() else { return "Add your OpenAI key in Bluey's Mac menu." }
        cancel(); appealWork?.cancel(); appealWork = nil
        workContext = nil; offTask = nil
        current = FocusSession(task: task, duration: min(240, max(1, minutes)) * 60, developerMode: developerMode)
        policy = FocusNudgePolicy(maximumGap: current!.observationDuration * 1.5, developerMode: developerMode)
        lastTick = now(); lastCheck = 0
        publish(); persist()
        return "Focus started: \(task), \(Int(min(240, max(1, minutes)))) minutes."
    }
    @discardableResult func pause(_ reason: String = "Paused") -> String {
        guard current?.status == .running else { return "Focus is already paused or ended." }
        advanceClock(); current?.pause(reason); cancel(); policy.reset(); publish(); persist()
        return "Focus paused."
    }
    @discardableResult func resume() -> String {
        guard current?.status == .paused else { return "There's no paused focus session." }
        guard freshConnection else { return "Reconnect the paired phone before resuming." }
        guard permission() else { return "Screen Recording permission is missing. Enable it in System Settings, then reopen Bluey." }
        current?.resume(); policy.reset(); cancel()
        lastTick = now(); lastCheck = current?.elapsed ?? 0
        publish(); persist(); return "Focus resumed."
    }
    @discardableResult func end() -> String {
        guard hasSession else { return "There's no running focus session." }
        advanceClock(); current?.end(); finish(); return "Focus finished. Your timeline is on the phone."
    }
    @discardableResult func testNudge() -> String {
        guard developerMode, freshConnection else { return "Enable Developer Mode and connect the phone first." }
        onNudge?("Oi, back to the mission. This is your test nudge.", nil)
        return "Test nudge sent to the Mac and phone."
    }
    private var freshConnection: Bool { connected && now() - lastPing < 5 }
    private var unlocked: Bool { screenUnlocked() }
    private var allowed: Bool { monitoring && freshConnection && unlocked && permission() }
    private func cancel() { generation = UUID(); work?.cancel(); work = nil }
    private func advanceClock() {
        let now = now()
        let delta = now - lastTick; lastTick = now
        // A suspended run loop is not evidence of active focus time.
        if delta <= 3 { current?.advance(delta) }
    }
    func tick() {
        guard monitoring else { return }
        guard freshConnection else { pause("Phone disconnected. Reconnect, then resume."); return }
        guard unlocked else { pause("Mac locked. Resume when ready."); return }
        guard permission() else { pause("Screen Recording permission lost. Enable it, then reopen Bluey."); return }
        if now() - lastTick > 3 { pause("Mac was inactive. Resume when ready."); return }
        advanceClock()
        if current?.status == .ended { finish(); return }
        publish()
        enforceLocks()
        if let session = current, session.elapsed - lastCheck >= session.observationDuration, work == nil {
            lastCheck = session.elapsed
            check(session: session)
        }
    }
    private func check(session: FocusSession) {
        let token = generation
        let began = now()
        work = Task { [weak self] in
            guard let self else { return }
            defer { if self.generation == token { self.work = nil } }
            do {
                guard self.allowed else { return }
                let context = self.frontContext()
                if let key = context?.key, session.approved?.contains(key) == true {
                    // A verified appeal already accepted this site or app; no screenshot or API call.
                    self.policy.reset(); self.workContext = context
                    var check = FocusCheck(elapsed: session.elapsed, activity: .onTask, sampleDuration: session.observationDuration)
                    check.approved = true
                    self.current?.checks.append(check)
                    self.current?.detail = "On task · \(key) approved as work"
                    self.publish(); self.persist(); return
                }
                let screen = try await self.capture()
                guard self.allowed, self.generation == token, !Task.isCancelled else { return }
                // A tab or app switch during capture would pair this screenshot with the wrong site.
                let stable = self.frontContext() == context ? context : nil
                let idle = CGEventSource.secondsSinceLastEventType(.combinedSessionState, eventType: CGEventType(rawValue: UInt32.max) ?? .null)
                let answer = try await self.classify(screen, session, idle.isFinite ? idle : 0)
                guard self.allowed, self.generation == token, !Task.isCancelled else { return }
                let age = now() - began
                var check = FocusCheck(elapsed: session.elapsed, activity: age <= 20 ? answer.activity : .unavailable,
                                       probability: answer.probability, confidence: answer.confidence,
                                       probabilities: age <= 20 ? answer.probabilities : nil,
                                       sampleDuration: session.observationDuration)
                let shouldNudge = self.policy.observe(check, age: age)
                if age <= 20, let context = stable {
                    if answer.activity == .onTask, context.key.map({ session.blocked?.contains($0) != true }) ?? true { self.workContext = context }
                    if answer.activity == .offTask { self.offTask = (screen, context) }
                }
                self.current?.detail = age > 20 ? "Last check was stale; skipped" : answer.activity == .uncertain ? "Not enough context to judge" : answer.activity == .onTask ? "On task" : "Off task · checking again before nudging"
                self.current?.checks.append(check)
                self.publish(); self.persist()
                if shouldNudge {
                    // Fresh evidence, separate API. Its output can only show a bubble or point.
                    guard self.allowed else { return }
                    var nudge = FocusAPI.Nudge(message: "Are you sure you're on task right now?", target: nil)
                    var target: Target?
                    self.current?.detail = "Off task · preparing a gentle nudge"; self.publish()
                    do {
                        let fresh = try await self.capture()
                        guard self.allowed, self.generation == token, !Task.isCancelled else { return }
                        let capturedAt = now()
                        let app = NSWorkspace.shared.frontmostApplication?.processIdentifier
                        nudge = try await self.prepareNudge(fresh, session.task)
                        if let candidate = nudge.target, now() - capturedAt < 15,
                           app == NSWorkspace.shared.frontmostApplication?.processIdentifier {
                            // Re-read locally to reject a stale target after a tab, scroll or layout change.
                            if let verify = try? await self.capture() {
                                target = verify.lines.map(\.line).first { $0.text == candidate.text &&
                                    abs($0.rect.midX - candidate.rect.midX) < 10 && abs($0.rect.midY - candidate.rect.midY) < 10 }
                            }
                        }
                    } catch {
                        // A failed extra capture or wording request must still deliver the fallback bubble.
                        self.current?.detail = "Off task · using a gentle reminder"
                    }
                    guard self.allowed, self.generation == token, !Task.isCancelled else { return }
                    self.onNudge?(nudge.message, target)
                    if let context = stable { self.leave(context, self.workContext, false) }
                    self.current?.detail = "Off task · Bluey nudged you · tap “That's work” if it is"
                    check.nudged = true
                    if let index = self.current?.checks.firstIndex(where: { $0.id == check.id }) { self.current?.checks[index] = check }
                    self.publish(); self.persist()
                }
            } catch {
                guard self.allowed, self.generation == token, !Task.isCancelled else { return }
                self.policy.reset()
                self.current?.checks.append(FocusCheck(elapsed: session.elapsed, activity: .unavailable,
                                                      sampleDuration: session.observationDuration))
                self.current?.detail = "Check unavailable: \(error.localizedDescription.prefix(180))"
                self.publish(); self.persist()
                // Authentication/permission issues need intervention, not repeated paid calls.
                if (error as? FocusAPI.Failure) != nil { self.pause(self.current?.detail ?? "OpenAI unavailable") }
            }
        }
    }
    /// "That's work": a stronger model re-checks the latest off-task screen. Work is approved for the
    /// session; anything else is locked for the session and the user is sent back to work.
    @discardableResult func appeal(reason: String = "") -> String {
        guard let session = current, session.status == .running else { return "Start or resume a focus session first." }
        guard session.appealing != true else { return "Already checking. One moment." }
        guard let evidence = offTask, let key = evidence.context.key else {
            return offTask == nil ? "There's no off-task check to appeal yet." : "Couldn't read the browser tab. Allow Bluey under Privacy & Security > Automation, then try again."
        }
        if session.blocked?.contains(key) == true || session.approved?.contains(key) == true {
            return "\(key) was already decided for this session."
        }
        current?.appealing = true
        current?.detail = "Checking whether \(key) is part of your work…"
        publish()
        let id = session.id
        appealWork = Task { [weak self] in
            guard let self else { return }
            let verdict: FocusAPI.Appeal
            do { verdict = try await self.verifyAppeal(evidence.screen, session.task, key, reason) } catch {
                guard !Task.isCancelled, self.current?.id == id, self.hasSession else { return }
                self.current?.appealing = nil
                self.current?.detail = "Couldn't verify \(key) right now. Nothing was locked."
                self.publish(); self.persist(); return
            }
            guard !Task.isCancelled, self.current?.id == id, self.hasSession else { return }
            self.current?.appealing = nil
            if self.offTask?.context.key == key { self.offTask = nil }
            if verdict.isWork {
                let approved = (self.current?.approved ?? []).filter { $0 != key } + [key]
                self.current?.approved = approved
                self.policy.reset()
                self.current?.detail = "✓ \(key) counts as work for this session"
                self.onNudge?("Fair enough, \(key) counts as work. \(verdict.reason)", nil)
            } else {
                let blocked = (self.current?.blocked ?? []).filter { $0 != key } + [key]
                self.current?.blocked = blocked
                self.current?.detail = "🔒 \(key) is locked for this session"
                self.onNudge?("🔒 \(key) is locked for this session. \(verdict.reason)", nil)
                if self.monitoring, let front = self.frontContext(), front.key == key { self.lastEnforced = self.now(); self.leave(front, self.workContext, true) }
            }
            self.publish(); self.persist()
        }
        return "Checking \(key) with a smarter model…"
    }
    /// Locked sites and apps send the user back to work whenever they come to the front.
    private func enforceLocks() {
        guard let blocked = current?.blocked, !blocked.isEmpty, now() - lastEnforced >= 2,
              let context = frontContext(), let key = context.key, blocked.contains(key) else { return }
        lastEnforced = now()
        leave(context, workContext, true)
        current?.detail = "🔒 \(key) is locked for this session · back to work"
        onNudge?("🔒 \(key) is locked for this session. Back to the mission.", nil)
    }
    private func finish() {
        cancel(); policy.reset(); appealWork?.cancel(); appealWork = nil
        if current?.appealing == true { current?.appealing = nil }
        if let current {
            history.removeAll { $0.id == current.id }; history.insert(current, at: 0)
            history = Array(history.prefix(30))
        }
        publish(); persist()
    }
    private func persist() {
        var saved = history
        if var session = current, session.status != .ended {
            session.status = .ended; session.detail = "App closed or restarted"
            saved.removeAll { $0.id == session.id }; saved.insert(session, at: 0)
        }
        if let data = try? JSONEncoder().encode(Array(saved.prefix(30))) {
            try? data.write(to: file, options: .atomic)
            try? FileManager.default.setAttributes([.posixPermissions: 0o600], ofItemAtPath: file.path)
        }
    }
    private func publish() {
        revision += 1
        if showsCountdown { countdown.update(current) }
        onChange?(FocusSync(current: current, history: history, revision: revision, developerMode: developerMode))
    }
}

@MainActor
private final class FocusCountdown {
    private var window: NSPanel?
    private let label = NSTextField(labelWithString: "")
    private let modeLabel = NSTextField(labelWithString: "")
    func update(_ session: FocusSession?) {
        guard let session, session.status != .ended else { window?.orderOut(nil); return }
        if window == nil, let screen = NSScreen.screens.first {
            let panel = NSPanel(contentRect: CGRect(x: screen.visibleFrame.maxX - 452, y: screen.visibleFrame.minY + 24, width: 420, height: 132),
                                styleMask: [.borderless, .nonactivatingPanel], backing: .buffered, defer: false)
            panel.isOpaque = false; panel.backgroundColor = .clear; panel.hasShadow = false
            panel.level = .floating; panel.ignoresMouseEvents = true
            panel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
            label.frame = CGRect(x: 0, y: 0, width: 420, height: 108)
            label.font = .monospacedDigitSystemFont(ofSize: 76, weight: .semibold)
            label.textColor = .white; label.alignment = .right
            modeLabel.frame = CGRect(x: 0, y: 108, width: 420, height: 20)
            modeLabel.font = .systemFont(ofSize: 12, weight: .medium)
            modeLabel.textColor = .white; modeLabel.alignment = .right
            panel.contentView?.addSubview(label); panel.contentView?.addSubview(modeLabel); window = panel
        }
        label.stringValue = (session.status == .paused ? "Ⅱ " : "") + FocusSession.clock(session.remaining)
        let locks = (session.blocked ?? []).isEmpty ? "" : "🔒 LOCKED: " + (session.blocked ?? []).joined(separator: ", ")
        modeLabel.stringValue = [locks, session.isDeveloperMode ? "DEVELOPER MODE · 4×" : ""].filter { !$0.isEmpty }.joined(separator: " · ")
        window?.orderFrontRegardless()
    }
}
