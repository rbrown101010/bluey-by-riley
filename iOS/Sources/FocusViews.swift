import SwiftUI

struct FocusFaceHUD: View {
    @ObservedObject var focus: FocusClient
    @ObservedObject var link: MacLink
    @ObservedObject var live: LiveVoice
    var open: () -> Void
    var pair: () -> Void
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 3) {
                    Text(focus.current.flatMap { $0.status == .ended ? nil : $0.task } ?? "What's the mission?")
                        .font(.fredoka(22)).lineLimit(2)
                    Text(status).font(.plexMono(10)).foregroundStyle(.white.opacity(0.65))
                    if let locked = focus.current?.blocked, !locked.isEmpty, focus.current?.status != .ended {
                        Label("Locked: \(locked.joined(separator: ", "))", systemImage: "lock.fill")
                            .font(.plexMono(11)).foregroundStyle(Color(hex: 0xEBAC73))
                    }
                    if focus.developerMode {
                        Text("Developer Mode · 4× clock · checks every 10s")
                            .font(.plexMono(10)).foregroundStyle(.white.opacity(0.8))
                    }
                    if !feedback.isEmpty {
                        Text(feedback).font(.plexSans(12)).lineLimit(2).foregroundStyle(.white.opacity(0.85))
                    }
                    if live.state == .asking {
                        Capsule().fill(Color.white).frame(width: 20 + live.inputLevel * 100, height: 3)
                    }
                }.frame(maxWidth: 360, alignment: .leading)
                Spacer()
            }
            Spacer()
            HStack(alignment: .bottom, spacing: 12) {
                HStack(spacing: 2) {
                    if !link.connected {
                        icon("qrcode.viewfinder", label: "Pair Mac", action: pair)
                    } else if let session = focus.current, session.status != .ended {
                        icon(session.status == .running ? "pause.fill" : "play.fill",
                             label: session.status == .running ? "Pause focus" : "Resume focus") {
                            focus.command(session.status == .running ? "focusPause" : "focusResume")
                        }.disabled(!focus.fresh)
                        icon("stop.fill", label: "End focus") { focus.command("focusEnd") }
                            .disabled(!focus.fresh)
                        if session.status == .running, session.checks.last(where: { $0.activity != .paused })?.activity == .offTask {
                            icon(session.appealing == true ? "hourglass" : "briefcase.fill", label: "That's work, check again") {
                                focus.command("focusAppeal")
                            }.disabled(!focus.fresh || session.appealing == true)
                        }
                    }
                    icon("scope", label: "Focus sessions", action: open)
                    Image(systemName: voiceIcon)
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(live.state == .asleep ? .white.opacity(0.35) : .white)
                        .frame(width: 34, height: 34)
                        .background(Circle().fill(Color.white.opacity(0.07)))
                        .padding(5)
                        .accessibilityLabel(voiceStatus)
                }
                Spacer(minLength: 24)
                Text(FocusSession.clock(countdown))
                    .font(.system(size: 76, weight: .semibold, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(.white)
                    .lineLimit(1)
                    .minimumScaleFactor(0.65)
                    .accessibilityLabel("Time remaining")
                    .accessibilityValue(FocusSession.clock(countdown))
            }
        }
        .foregroundStyle(.white)
        .padding(.horizontal, 24).padding(.top, 18).padding(.bottom, 18)
    }
    private func icon(_ symbol: String, label: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: symbol)
                .font(.system(size: 15, weight: .semibold))
                .frame(width: 34, height: 34)
                .background(Circle().fill(Color.white.opacity(0.09)))
                .padding(5)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(label)
    }
    private var countdown: Double {
        focus.current.flatMap { $0.status == .ended ? nil : $0.remaining } ?? 1800
    }
    private var feedback: String { focus.nudgeText.isEmpty ? live.feedback : focus.nudgeText }
    private var voiceIcon: String {
        switch live.state {
        case .asleep: return "mic.slash"
        case .waking: return "arrow.triangle.2.circlepath"
        case .listening: return "ear"
        case .asking: return "mic.fill"
        case .thinking: return "ellipsis"
        case .speaking: return "bubble.left.fill"
        }
    }
    private var voiceStatus: String {
        switch live.state {
        case .asleep: return "Hold Bluey to speak"
        case .waking: return "Voice connecting"
        case .listening: return "Listening. Hold Bluey to ask"
        case .asking: return "Recording your request"
        case .thinking: return "Thinking"
        case .speaking: return "Replying"
        }
    }
    private var status: String {
        guard link.connected else { return "Pair your Mac to focus together" }
        guard let session = focus.current, session.status != .ended else { return "Hold Bluey and describe a task" }
        guard focus.fresh else { return "Connection lost · monitoring will pause" }
        if session.status == .paused { return "Paused" }
        if session.appealing == true { return "Checking whether that's work…" }
        guard let check = session.checks.last(where: { $0.activity != .paused }) else { return "Focusing together" }
        switch check.activity {
        case .offTask: return "Off task · \(check.probability.focusPercent) estimate\(check.nudged ? " · nudged" : "")"
        case .onTask: return "On task"
        case .uncertain: return "Not sure yet · checking again"
        default: return "Last check unavailable · trying again"
        }
    }
}

struct FocusDashboard: View {
    @ObservedObject var focus: FocusClient
    @ObservedObject var link: MacLink
    @Environment(\.dismiss) private var dismiss
    @State private var task = ""
    @State private var minutes = 30.0
    @State private var reason = ""
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    VStack(alignment: .leading, spacing: 8) {
                        Toggle("Developer Mode", isOn: Binding(
                            get: { focus.developerMode },
                            set: { focus.command("focusDeveloperMode", developerMode: $0) }
                        )).disabled(!link.connected || !focus.fresh)
                            .accessibilityIdentifier("focusDeveloperMode")
                        Text("4× clock and a screen check every 10 real seconds. Repeated off-task checks nudge after about 20–30 real seconds, plus request time. Applies immediately; test sessions are labelled in history.")
                            .font(.plexSans(12)).foregroundStyle(.secondary)
                        if focus.developerMode {
                            Button("Test a nudge") { focus.command("focusTestNudge") }
                                .buttonStyle(.bordered).disabled(!link.connected || !focus.fresh)
                        }
                    }
                    if let finished = focus.current, finished.status == .ended {
                        Text("Lovely bit of focus.").font(.fredoka(26))
                        FocusSummary(session: finished)
                            .padding(16).background(Color.white.opacity(0.05), in: RoundedRectangle(cornerRadius: 12))
                    }
                    if let session = focus.current, session.status != .ended {
                        FocusSummary(session: session)
                        Text(focus.fresh ? session.detail : "Connection lost. Reconnect before resuming.")
                            .font(.plexSans(13)).foregroundStyle(.secondary)
                        HStack {
                            Button(session.status == .running ? "Pause" : "Resume") {
                                focus.command(session.status == .running ? "focusPause" : "focusResume")
                            }
                            Button("End focus") { focus.command("focusEnd") }
                        }.buttonStyle(.bordered).disabled(!link.connected || !focus.fresh)
                        if session.status == .running {
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Flagged off task by mistake?").font(.fredoka(20))
                                TextField("Why it's part of your work (optional)", text: $reason).textFieldStyle(.roundedBorder)
                                Button(session.appealing == true ? "Checking…" : "That's my work, check again") {
                                    focus.command("focusAppeal", reason: reason); reason = ""
                                }.buttonStyle(.borderedProminent)
                                    .disabled(!link.connected || !focus.fresh || session.appealing == true)
                                Text("A smarter model looks at the last off-task screen. If it's work, that site counts as work for this session. If not, it's locked until the session ends.")
                                    .font(.plexSans(12)).foregroundStyle(.secondary)
                            }
                        }
                    } else {
                        Text("A little company. A little focus.").font(.fredoka(26))
                        Text("Hold Bluey and say what you're working on, or type it here.").font(.plexSans(14))
                        TextField("What are we working on?", text: $task).textFieldStyle(.roundedBorder)
                            .accessibilityIdentifier("focusTask")
                        Stepper("\(Int(minutes)) minutes", value: $minutes, in: 1...240, step: 5)
                        Button("Start focus") { focus.command("focusStart", task: task, minutes: minutes) }
                            .buttonStyle(.borderedProminent).disabled(task.trimmingCharacters(in: .whitespaces).isEmpty || !link.connected)
                            .accessibilityIdentifier("startFocus")
                    }
                    if !focus.message.isEmpty { Text(focus.message).font(.plexSans(13)).foregroundStyle(.secondary) }
                    Text("While focusing, Bluey sends your main Mac display, task, elapsed time, idle duration and recent check results to OpenAI every \(focus.developerMode ? 10 : 30) real seconds. Brief detours are fine. Stillness isn't distraction.")
                        .font(.plexSans(13)).foregroundStyle(.secondary)
                    Text("Screen Recording is required on Mac; microphone is needed for voice. Screenshots aren't saved by Bluey. Pause, end, lock, sleep or disconnect stops capture. Resume is always manual. OpenAI processing follows your API account's data controls.")
                        .font(.plexSans(13)).foregroundStyle(.secondary)
                    Divider()
                    Text("Your focus sessions").font(.fredoka(23))
                    if focus.history.isEmpty { Text("Your first timeline will appear here when you finish.").foregroundStyle(.secondary) }
                    ForEach(focus.history) { session in
                        FocusSummary(session: session)
                            .padding(16).background(Color.white.opacity(0.05), in: RoundedRectangle(cornerRadius: 12))
                    }
                }.padding(24)
            }.background(Color.black).navigationTitle("bluey · focus friend")
                .toolbar { ToolbarItem(placement: .topBarTrailing) { Button("Back to Bluey") { dismiss() } } }
        }.preferredColorScheme(.dark).tint(Color(hex: Palette.berry2))
    }
}

private struct FocusSummary: View {
    let session: FocusSession
    private struct Inspection: Identifiable { let id: String }
    @State private var inspection: Inspection?
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(session.task).font(.fredoka(22))
            if session.usedDeveloperMode == true {
                Text("Developer test · \(FocusSession.clock(session.realActiveElapsed)) real active time · timeline uses focus-clock time")
                    .font(.plexMono(11)).foregroundStyle(.secondary)
            }
            Text("\(session.startedAt.formatted(date: .abbreviated, time: .shortened)) · \(FocusSession.clock(session.elapsed)) active")
                .font(.plexMono(11)).foregroundStyle(.secondary)
            if let locked = session.blocked, !locked.isEmpty {
                Label("Locked this session: \(locked.joined(separator: ", "))", systemImage: "lock.fill")
                    .font(.plexSans(12)).foregroundStyle(Color(hex: 0xEBAC73))
            }
            if let approved = session.approved, !approved.isEmpty {
                Label("Approved as work: \(approved.joined(separator: ", "))", systemImage: "checkmark.seal")
                    .font(.plexSans(12)).foregroundStyle(.green)
            }
            Button { inspect("all") } label: {
                FocusTimeline(session: session).frame(height: 40)
            }.buttonStyle(.plain).accessibilityLabel("Inspect focus checks")
            HStack(spacing: 16) {
                legend("On task", .green, category: "on_task")
                legend("Off task", Color(hex: 0xEBAC73), category: "off_task")
                legend("Unknown", .gray, category: "uncertain")
            }.font(.plexSans(11))
            Text("Tap a category to see probabilities and confidence. Grey also includes unchecked time. Pauses are excluded.")
                .font(.plexSans(11)).foregroundStyle(.secondary)
        }
        .sheet(item: $inspection) { selection in FocusCheckList(session: session, category: selection.id) }
    }
    private func inspect(_ category: String) {
        inspection = Inspection(id: category)
    }
    private func legend(_ name: String, _ color: Color, category: String) -> some View {
        Button { inspect(category) } label: {
            HStack(spacing: 5) { Rectangle().fill(color).frame(width: 9, height: 9); Text(name) }
                .frame(minHeight: 44).contentShape(Rectangle())
        }.buttonStyle(.plain).accessibilityLabel("Inspect \(name) confidence")
    }
}

private struct FocusCheckList: View {
    let session: FocusSession
    @State var category: String
    @Environment(\.dismiss) private var dismiss
    private var checks: [FocusCheck] {
        session.checks.reversed().filter {
            if $0.activity == .paused { return false }
            if category == "all" { return true }
            if category == "uncertain" { return [.uncertain, .unavailable].contains($0.activity) }
            return $0.activity.rawValue == category
        }
    }
    var body: some View {
        NavigationStack {
            List {
                Section {
                    Picker("Show checks", selection: $category) {
                        Text("All").tag("all")
                        Text("On task").tag("on_task")
                        Text("Off task").tag("off_task")
                        Text("Unknown").tag("uncertain")
                    }.pickerStyle(.segmented)
                    Text("Each check is a periodic observation. Developer Mode checks every 10 real seconds with a 4× clock. Category probabilities and overall decision confidence are separate model estimates, not guarantees.")
                        .font(.plexSans(13)).foregroundStyle(.secondary)
                }
                Section("Latest checks first") {
                    if checks.isEmpty {
                        Text("No checks recorded in this category yet. Unchecked time has no confidence estimate.")
                            .foregroundStyle(.secondary)
                    }
                    ForEach(checks) { check in
                        NavigationLink {
                            FocusCheckDetail(check: check)
                        } label: {
                            VStack(alignment: .leading, spacing: 5) {
                                HStack {
                                    Text(check.activity.focusName).font(.fredoka(20))
                                    Spacer()
                                    Text(FocusSession.clock(check.elapsed)).font(.plexMono(12))
                                }
                                if let estimate = check.estimate(for: check.activity) {
                                    Text("Category probability \(estimate.focusPercent) · confidence \(check.confidence.focusPercent)")
                                        .font(.plexSans(12)).foregroundStyle(.secondary)
                                } else if check.activity == .unavailable {
                                    Text("Check unavailable or stale · no valid estimate")
                                        .font(.plexSans(12)).foregroundStyle(.secondary)
                                } else {
                                    Text("Category probability not saved · confidence \(check.confidence.focusPercent)")
                                        .font(.plexSans(12)).foregroundStyle(.secondary)
                                }
                            }.padding(.vertical, 4)
                        }
                    }
                }
            }.navigationTitle("Focus checks")
                .toolbar { ToolbarItem(placement: .topBarTrailing) { Button("Done") { dismiss() } } }
        }.preferredColorScheme(.dark)
    }
}

private struct FocusCheckDetail: View {
    let check: FocusCheck
    var body: some View {
        List {
            Section {
                LabeledContent("Observation", value: check.activity.focusName)
                LabeledContent("Active session time", value: FocusSession.clock(check.elapsed))
            }
            if check.activity == .unavailable {
                Text("This check failed or arrived too late. It has no valid confidence estimate and does not count toward a nudge.")
            } else {
                Section("Category probabilities") {
                    ForEach([FocusActivity.onTask, .offTask, .uncertain], id: \.rawValue) { category in
                        LabeledContent(category.focusName, value: check.estimate(for: category)?.focusPercent ?? "Not saved")
                    }
                }
                Section("Decision confidence") {
                    LabeledContent("Overall confidence", value: check.confidence.focusPercent)
                    Text("Confidence is reported separately by the API. It is not the probability of a particular category.")
                        .font(.plexSans(13)).foregroundStyle(.secondary)
                }
                if check.probabilities == nil {
                    Text("This older check saved only the Off task probability and overall confidence. The other probabilities weren't saved.")
                        .foregroundStyle(.secondary)
                }
                if check.nudged { Label("Bluey gave a gentle nudge after this check", systemImage: "bubble.left") }
                if check.approved == true { Label("Skipped: approved as work after your appeal", systemImage: "checkmark.seal") }
            }
        }.navigationTitle("Check details")
    }
}

private extension FocusActivity {
    var focusName: String {
        switch self {
        case .onTask: return "On task"
        case .offTask: return "Off task"
        case .uncertain: return "Unknown"
        case .unavailable: return "Unavailable"
        case .paused: return "Paused"
        }
    }
}

private extension Double {
    var focusPercent: String { formatted(.percent.precision(.fractionLength(0...1))) }
}

struct FocusTimeline: View {
    let session: FocusSession
    var body: some View {
        Canvas { context, size in
            context.fill(Path(CGRect(origin: .zero, size: size)), with: .color(.gray.opacity(0.35)))
            let total = max(1, session.status == .ended ? session.elapsed : session.duration)
            for check in session.checks where [.onTask, .offTask].contains(check.activity) {
                let span = check.sampleDuration ?? 30
                let start = max(0, check.elapsed - span)
                let rect = CGRect(x: start / total * size.width, y: 0,
                                  width: min(span, check.elapsed) / total * size.width, height: size.height)
                context.fill(Path(rect), with: .color(check.activity == .onTask ? .green : Color(hex: 0xEBAC73)))
            }
        }.overlay(Rectangle().stroke(.white.opacity(0.3), lineWidth: 1))
            .accessibilityLabel("Focus timeline: green on task, peach off task, grey unknown")
    }
}
