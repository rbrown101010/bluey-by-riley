import XCTest
import GooglyShared
@testable import GooglyMac

final class FocusLifecycleTests: XCTestCase {
    @MainActor func testRepeatedOffTaskChecksActuallyDeliverANudgeIncludingFailures() async throws {
        let answer = try FocusDecision.decode(Data(#"{"answers":[{"name":"activity","type":"choice","choice":"off_task","confidence":0.2,"probabilities":[{"value":"on_task","probability":0.005},{"value":"off_task","probability":0.99},{"value":"uncertain","probability":0.005}]}]}"#.utf8))
        for failure in ["none", "capture", "wording"] {
            var time = 100.0, captures = 0, wordingCalls = 0, delivered = 0
            let nudged = expectation(description: "Nudge delivered with \(failure)")
            let app = FocusCompanion(now: { time }, permission: { true }, hasKey: { true }, screenUnlocked: { true },
                capture: {
                    captures += 1
                    if failure == "capture", captures == 3 { throw CancellationError() }
                    return ScreenSnapshot(jpeg: Data(), lines: [], size: .zero)
                }, classify: { _, _, _ in answer }, prepareNudge: { _, _ in
                    wordingCalls += 1
                    if failure == "wording" { throw CancellationError() }
                    return FocusAPI.Nudge(message: "Oi, back to the mission.", target: nil)
                }, showsCountdown: false,
                historyFile: URL(fileURLWithPath: "/tmp/bluey-nudge-test-\(failure).json"), settings: nil)
            app.onNudge = { message, target in
                delivered += 1
                XCTAssertNil(target)
                XCTAssertEqual(message, failure == "none" ? "Oi, back to the mission." : "Are you sure you're on task right now?")
                nudged.fulfill()
            }
            app.setDeveloperMode(true); app.heartbeat(); _ = app.start(task: "Build Bluey in Codex")
            for _ in 1...20 { time += 1; app.heartbeat(); app.tick(); await Task.yield() }
            await fulfillment(of: [nudged], timeout: 2)
            XCTAssertEqual(delivered, 1)
            XCTAssertEqual(app.current?.checks.count, 2)
            XCTAssertEqual(app.current?.checks.last?.nudged, true)
            XCTAssertEqual(wordingCalls, failure == "capture" ? 0 : 1)
            _ = app.end()
        }
    }
    @MainActor func testPauseDuringNudgePreparationNeverShowsALateBubble() async throws {
        var time = 100.0
        var pending: CheckedContinuation<FocusAPI.Nudge, Error>?
        let preparing = expectation(description: "Nudge preparation started")
        let answer = try FocusDecision.decode(Data(#"{"answers":[{"name":"activity","type":"choice","choice":"off_task","confidence":0.99,"probabilities":[{"value":"on_task","probability":0.005},{"value":"off_task","probability":0.99},{"value":"uncertain","probability":0.005}]}]}"#.utf8))
        let app = FocusCompanion(now: { time }, permission: { true }, hasKey: { true }, screenUnlocked: { true },
            capture: { ScreenSnapshot(jpeg: Data(), lines: [], size: .zero) }, classify: { _, _, _ in answer },
            prepareNudge: { _, _ in
                try await withCheckedThrowingContinuation { pending = $0; preparing.fulfill() }
            }, showsCountdown: false, historyFile: URL(fileURLWithPath: "/tmp/bluey-nudge-pause.json"), settings: nil)
        app.onNudge = { _, _ in XCTFail("Paused focus must discard the prepared nudge") }
        app.setDeveloperMode(true); app.heartbeat(); _ = app.start(task: "Build Bluey")
        for _ in 1...20 { time += 1; app.heartbeat(); app.tick(); await Task.yield() }
        await fulfillment(of: [preparing], timeout: 2)
        _ = app.pause()
        pending?.resume(returning: FocusAPI.Nudge(message: "Too late", target: nil))
        await Task.yield()
        XCTAssertFalse(app.current?.checks.contains(where: \.nudged) == true)
        _ = app.end()
    }
    @MainActor func testDeveloperCadenceSwitchingSpeedAndPause() async throws {
        var time = 100.0, captures = 0
        let observed = expectation(description: "First ten-second check")
        let answer = try FocusDecision.decode(Data(#"{"answers":[{"name":"activity","type":"choice","choice":"on_task","confidence":0.95,"probabilities":[{"value":"on_task","probability":0.95},{"value":"off_task","probability":0.02},{"value":"uncertain","probability":0.03}]}]}"#.utf8))
        let app = FocusCompanion(now: { time }, permission: { true }, hasKey: { true }, screenUnlocked: { true },
            capture: { captures += 1; return ScreenSnapshot(jpeg: Data(), lines: [], size: .zero) },
            classify: { _, _, _ in answer }, showsCountdown: false,
            historyFile: URL(fileURLWithPath: "/tmp/bluey-focus-test-developer.json"), settings: nil)
        app.onChange = { state in
            if state.current?.checks.contains(where: { $0.activity == .onTask }) == true {
                app.onChange = nil; observed.fulfill()
            }
        }
        app.setDeveloperMode(true); app.heartbeat(); _ = app.start(task: "Test clock")
        for _ in 1...9 { time += 1; app.heartbeat(); app.tick() }
        XCTAssertEqual(app.current?.elapsed, 36); XCTAssertEqual(captures, 0)
        time += 1; app.heartbeat(); app.tick()
        await fulfillment(of: [observed], timeout: 2)
        XCTAssertEqual(captures, 1); XCTAssertEqual(app.current?.checks.last?.sampleDuration, 40)
        XCTAssertEqual(app.current?.realActiveElapsed, 10)
        _ = app.pause(); time += 2; app.heartbeat(); app.tick()
        XCTAssertEqual(app.current?.elapsed, 40)
        app.setDeveloperMode(false); _ = app.resume()
        for _ in 1...29 { time += 1; app.heartbeat(); app.tick() }
        XCTAssertEqual(captures, 1); XCTAssertEqual(app.current?.elapsed, 69)
        time += 1; app.heartbeat(); app.tick(); await Task.yield()
        XCTAssertEqual(captures, 2); XCTAssertEqual(app.current?.elapsed, 70)
        _ = app.end()
    }
    @MainActor func testDeveloperSettingPersistsAndSwitchCancelsAnOldCapture() async {
        let name = "co.visionairy.googly.tests.\(UUID())"
        let preferences = UserDefaults(suiteName: name)!
        defer { preferences.removePersistentDomain(forName: name) }
        var time = 100.0
        var continuation: CheckedContinuation<ScreenSnapshot, Error>?
        let app = FocusCompanion(now: { time }, permission: { true }, hasKey: { true }, screenUnlocked: { true },
            capture: { try await withCheckedThrowingContinuation { continuation = $0 } },
            classify: { _, _, _ in XCTFail("Speed change must discard the old capture"); throw CancellationError() },
            showsCountdown: false, historyFile: URL(fileURLWithPath: "/tmp/bluey-focus-test-speed-change.json"), settings: preferences)
        XCTAssertFalse(app.developerMode)
        app.setDeveloperMode(true); app.heartbeat(); _ = app.start(task: "Cancel old check")
        for _ in 1...10 { time += 1; app.heartbeat(); app.tick() }
        await Task.yield(); XCTAssertNotNil(continuation)
        app.setDeveloperMode(false)
        continuation?.resume(returning: ScreenSnapshot(jpeg: Data(), lines: [], size: .zero))
        await Task.yield(); XCTAssertTrue(app.current?.checks.isEmpty == true)
        app.setDeveloperMode(true)
        let reopened = FocusCompanion(showsCountdown: false,
            historyFile: URL(fileURLWithPath: "/tmp/bluey-focus-test-reopened.json"), settings: preferences)
        XCTAssertTrue(reopened.developerMode)
        _ = app.end()
    }
    @MainActor func testPermissionFailureNeverCaptures() async {
        var captures = 0
        let app = FocusCompanion(now: { 100 }, permission: { false }, hasKey: { true },
            capture: { captures += 1; throw CancellationError() }, showsCountdown: false,
            historyFile: URL(fileURLWithPath: "/tmp/bluey-focus-test-permission.json"), settings: nil)
        app.heartbeat()
        XCTAssertTrue(app.start(task: "Write").contains("Screen Recording"))
        app.tick(); await Task.yield()
        XCTAssertNil(app.current); XCTAssertEqual(captures, 0)
    }
    @MainActor func testDisconnectLockAndPermissionLossPauseBeforeCapture() async {
        for mode in ["disconnect", "lock", "permission"] {
            var time = 100.0, permission = true, unlocked = true, captures = 0
            let app = FocusCompanion(now: { time }, permission: { permission }, hasKey: { true },
                screenUnlocked: { unlocked }, capture: { captures += 1; throw CancellationError() },
                showsCountdown: false, historyFile: URL(fileURLWithPath: "/tmp/bluey-focus-test-\(mode).json"), settings: nil)
            app.heartbeat(); _ = app.start(task: "Write")
            if mode == "disconnect" { time += 6 }
            if mode == "lock" { unlocked = false }
            if mode == "permission" { permission = false }
            app.tick(); await Task.yield()
            XCTAssertEqual(app.current?.status, .paused); XCTAssertEqual(captures, 0)
        }
    }
    @MainActor func testThirtySecondCadenceCancellationAndNoAutoResume() async {
        var time = 100.0, captures = 0
        var continuation: CheckedContinuation<ScreenSnapshot, Error>?
        let app = FocusCompanion(now: { time }, permission: { true }, hasKey: { true }, screenUnlocked: { true },
            capture: {
                captures += 1
                return try await withCheckedThrowingContinuation { continuation = $0 }
            }, classify: { _, _, _ in XCTFail("Cancelled capture must not reach the API"); throw CancellationError() },
            showsCountdown: false, historyFile: URL(fileURLWithPath: "/tmp/bluey-focus-test-cancel.json"), settings: nil)
        app.heartbeat(); _ = app.start(task: "Write")
        for _ in 1...29 { time += 1; app.heartbeat(); app.tick() }
        XCTAssertEqual(captures, 0)
        time += 1; app.heartbeat(); app.tick()
        await Task.yield(); XCTAssertEqual(captures, 1)
        app.disconnected(); app.heartbeat(); app.tick()
        XCTAssertEqual(app.current?.status, .paused) // reconnection never resumes automatically
        continuation?.resume(returning: ScreenSnapshot(jpeg: Data(), lines: [], size: .zero))
        await Task.yield(); XCTAssertEqual(app.current?.checks.filter { $0.activity != .paused }.count, 0)
        _ = app.end()
    }
    @MainActor func testAppealLocksOrApprovesTheOffTaskSite() async throws {
        let off = try FocusDecision.decode(Data(#"{"answers":[{"name":"activity","type":"choice","choice":"off_task","confidence":0.9,"probabilities":[{"value":"on_task","probability":0.05},{"value":"off_task","probability":0.9},{"value":"uncertain","probability":0.05}]}]}"#.utf8))
        let on = try FocusDecision.decode(Data(#"{"answers":[{"name":"activity","type":"choice","choice":"on_task","confidence":0.9,"probabilities":[{"value":"on_task","probability":0.9},{"value":"off_task","probability":0.05},{"value":"uncertain","probability":0.05}]}]}"#.utf8))
        let work = FocusContext(bundleID: "com.apple.dt.Xcode", name: "Xcode", host: nil, url: nil, isBrowser: false)
        let feed = FocusContext(bundleID: "com.apple.Safari", name: "Safari", host: "reddit.com", url: nil, isBrowser: true)
        for isWork in [false, true] {
            var time = 100.0, front = work, classified = 0
            var leaves: [(from: String?, to: String?, lock: Bool)] = []
            let verdict = expectation(description: "Appeal answered")
            let app = FocusCompanion(now: { time }, permission: { true }, hasKey: { true }, screenUnlocked: { true },
                capture: { ScreenSnapshot(jpeg: Data(), lines: [], size: .zero) },
                classify: { _, _, _ in classified += 1; return front == work ? on : off },
                prepareNudge: { _, _ in FocusAPI.Nudge(message: "Back to it?", target: nil) }, showsCountdown: false,
                historyFile: URL(fileURLWithPath: "/tmp/bluey-appeal-\(isWork).json"), settings: nil,
                frontContext: { front },
                verifyAppeal: { _, _, key, _ in
                    XCTAssertEqual(key, "reddit.com"); defer { verdict.fulfill() }
                    return FocusAPI.Appeal(isWork: isWork, reason: "Checked.")
                },
                leave: { leaves.append(($0.key, $1?.key, $2)) })
            app.setDeveloperMode(true); app.heartbeat(); _ = app.start(task: "Build Bluey")
            func run(_ seconds: Int) async { for _ in 0..<seconds { time += 1; app.heartbeat(); app.tick(); await Task.yield(); await Task.yield() } }
            XCTAssertEqual(app.appeal(), "There's no off-task check to appeal yet.")
            await run(11)   // on-task check in Xcode remembers the work context
            front = feed
            await run(30)   // repeated off-task checks nudge and send the user back to Xcode
            XCTAssertTrue(leaves.contains { $0.from == "reddit.com" && $0.to == "Xcode" && !$0.lock })
            _ = app.appeal(reason: "Researching Reddit posts for the app")
            XCTAssertEqual(app.current?.appealing, true)
            await fulfillment(of: [verdict], timeout: 2)
            await Task.yield(); await Task.yield()
            XCTAssertNil(app.current?.appealing)
            if isWork {
                XCTAssertEqual(app.current?.approved, ["reddit.com"])
                let before = classified
                await run(11)
                XCTAssertEqual(classified, before, "Approved sites skip the classification call")
                XCTAssertEqual(app.current?.checks.last?.approved, true)
            } else {
                XCTAssertEqual(app.current?.blocked, ["reddit.com"])
                XCTAssertTrue(leaves.contains { $0.from == "reddit.com" && $0.to == "Xcode" && $0.lock })
                let count = leaves.count
                await run(3)
                XCTAssertGreaterThan(leaves.count, count, "A locked site keeps sending the user back")
            }
            _ = app.end()
        }
    }
}
