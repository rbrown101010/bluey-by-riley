import AppKit
import Carbon.HIToolbox
import GooglyShared

@MainActor
final class AppDelegate: NSObject, NSApplicationDelegate, NSMenuDelegate {
    private let settings = Settings.shared
    private let overlay = CursorOverlay()
    private let server = PhoneServer()
    private var statusItem: NSStatusItem!
    private let codex = CodexController()
    private let focus = FocusCompanion()
    private let pairingPanel = PairingPanel()
    private let avatarWindow = AvatarWindow()
    private lazy var host = RealtimeHost(overlay: overlay, codex: codex)


    func applicationDidFinishLaunching(_ notification: Notification) {
        Fonts.registerBundled()
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        statusItem.button?.image = MenuIcon.make()
        statusItem.button?.toolTip = "Bluey"
        let menu = NSMenu()
        menu.delegate = self
        statusItem.menu = menu

        overlay.onFace = { [weak self] face in
            self?.server.send(face)
            self?.avatarWindow.update(face)
        }
        overlay.onLook = { [weak self] point in self?.avatarWindow.look(at: point) }
        if settings.showAvatarWindow { avatarWindow.show() }
        overlay.start()
        showDemoBubbleIfAsked()
        checkPermissions()
        if let path = ProcessInfo.processInfo.environment["GOOGLY_DEMO_TRANSCRIBE"], let audio = FileManager.default.contents(atPath: path) {
            // Transcribes an audio file into a throwaway notes folder, prints the lines and quits.
            Task {
                do {
                    let result = try await MeetingNotes.transcribe(audio: audio, session: "demo0000", index: 1, sessionStarted: Date())
                    for s in result.segments { print("[\(s.start)] \(s.speaker): \(s.text)") }
                    try? FileManager.default.removeItem(at: result.folder)
                } catch { print("failed:", error) }
                exit(0)
            }
        }
        if let question = ProcessInfo.processInfo.environment["GOOGLY_DEMO_RESEARCH"] {
            host.demoResearch(question, out: ProcessInfo.processInfo.environment["GOOGLY_DEMO_OUT"] ?? "/tmp/googly-report")
        }
        host.focus = focus
        focus.onChange = { [weak self] state in
            guard let data = try? JSONEncoder().encode(state), let text = String(data: data, encoding: .utf8) else { return }
            self?.server.broadcast(Packet(command: "focusState", text: text))
        }
        focus.onNudge = { [weak self] message, target in
            guard let self else { return }
            self.host.focusNudge(message, target: target)
            self.server.broadcast(Packet(command: "focusChirp", text: message))
            self.avatarWindow.react("stop")
        }
        focus.startService()
        if CommandLine.arguments.contains("--pair") {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) { self.pairingPanel.show() }
        }
        server.onPhonesChanged = { [weak self] names in
            self?.refreshIcon()
            if names.isEmpty { self?.focus.disconnected() }
            if names.isEmpty, self?.host.awake == true { self?.host.setAwake(false) }
        }
        server.onRequest = { [weak self] packet, reply in
            guard let self else { return }
            if packet.command?.hasPrefix("focus") == true {
                self.focus.heartbeat()
                let args = packet.text.flatMap { try? JSONSerialization.jsonObject(with: Data($0.utf8)) as? [String: Any] } ?? [:]
                var result = ""
                switch packet.command {
                case "focusStart": result = self.focus.start(task: args["task"] as? String ?? "", minutes: args["minutes"] as? Double ?? 30)
                case "focusPause": result = self.focus.pause()
                case "focusResume": result = self.focus.resume()
                case "focusEnd": result = self.focus.end()
                case "focusTestNudge": result = self.focus.testNudge()
                case "focusDeveloperMode":
                    if let enabled = args["developerMode"] as? Bool { result = self.focus.setDeveloperMode(enabled) }
                    else { result = "Specify whether Developer Mode is on or off." }
                case "focusSync": self.focus.sync()
                default: break
                }
                reply(Packet(command: "focusReply", callID: packet.callID, text: result))
            } else { self.host.handle(packet, reply: reply) }
        }
        server.start()
        host.onChange = { [weak self] in self?.refreshIcon() }
        codex.onEvent = { [weak self] event in self?.codexEvent(event) }
        codex.warmUp()

        // ⌥Space wakes him up or puts him back to sleep (same as double tapping him on the phone).
        HotKeys.shared.register(keyCode: kVK_Space, modifiers: optionKey) { [weak self] in self?.toggleAwake() }
        // ⌃⌥P point here, ⌃⌥F follow mouse, ⌃⌥D stop pointing, ⌃⌥H hide, ⌃⌥T talk test.
        HotKeys.shared.register(keyCode: kVK_ANSI_P) { [weak self] in self?.pointHere() }
        HotKeys.shared.register(keyCode: kVK_ANSI_F) { [weak self] in self?.toggleFollow() }
        HotKeys.shared.register(keyCode: kVK_ANSI_D) { [weak self] in self?.overlay.goHome() }
        HotKeys.shared.register(keyCode: kVK_ANSI_H) { [weak self] in self?.toggleShow() }
        HotKeys.shared.register(keyCode: kVK_ANSI_T) { [weak self] in self?.overlay.talkTest() }
        // ⌃⌥S stops him using the computer right away.
        HotKeys.shared.register(keyCode: kVK_ANSI_S) { [weak self] in self?.stopActions() }

        if Keychain.get(.openai) == nil {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in self?.editKeys() }
        }
    }

    func applicationWillTerminate(_ notification: Notification) {
        focus.shutdown()
        codex.shutdown()
    }

    /// A Codex job finished or wants a yes. Awake, he hears about it and says so himself (bubble, chirp,
    /// and it lands in the phone's session history). Asleep, the bubble shows here and the phone chirps.
    private func codexEvent(_ event: CodexController.Event) {
        let (note, line, isApproval): (String, String, Bool) = {
            switch event {
            case .finished(let note, let line): return (note, line, false)
            case .approval(let note, let line): return (note, line, true)
            }
        }()
        if host.awake, !server.phoneNames.isEmpty {
            server.broadcast(Packet(command: "codexNote", text: note))
            return
        }
        Task { @MainActor in
            // Approvals need the exact ask; finished jobs get a proper one-liner from him.
            let text = isApproval ? line : (await CodexLine.write(note) ?? line)
            self.host.showReply(text)
            self.server.broadcast(Packet(command: "codexChirp", text: text))
        }
    }

    @objc private func addCodexFolder() {
        NSApp.activate(ignoringOtherApps: true)
        let panel = NSOpenPanel()
        panel.canChooseDirectories = true
        panel.canChooseFiles = false
        panel.allowsMultipleSelection = true
        panel.prompt = "Add"
        panel.message = "Folders Codex can work in when you ask Bluey"
        guard panel.runModal() == .OK else { return }
        CodexProjects.added = CodexProjects.added + panel.urls.map(\.path).filter { !CodexProjects.added.contains($0) }
    }

    @objc private func openCodexJob(_ item: NSMenuItem) {
        if let id = item.representedObject as? String { codex.open(threadID: id) }
    }

    @objc private func openCodex() { NSWorkspace.shared.open(URL(string: "codex://")!) }

    private func refreshIcon() {
        statusItem.button?.appearsDisabled = server.phoneNames.isEmpty
    }

    // MARK: Actions

    @objc private func pointHere() {
        let m = NSEvent.mouseLocation
        guard let screen = NSScreen.screens.first else { return }
        overlay.mode = .pinned(CGPoint(x: m.x - screen.frame.minX, y: screen.frame.maxY - m.y))
    }

    @objc private func toggleFollow() {
        settings.followMouse.toggle()
        overlay.goHome()
    }

    @objc private func dock() { overlay.goHome() }

    /// For checking the speech bubble's look: GOOGLY_DEMO_BUBBLE=top|middle|home shows a sample reply.
    private func showDemoBubbleIfAsked() {
        guard let where_ = ProcessInfo.processInfo.environment["GOOGLY_DEMO_BUBBLE"],
              let size = NSScreen.screens.first?.frame.size else { return }
        let y: CGFloat = where_ == "top" ? 40 : size.height * 0.55
        let thing = CGRect(x: size.width * 0.3, y: y, width: 90, height: 22)
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            if where_ != "home" {
                self.overlay.mode = .pinned(CGPoint(x: thing.midX, y: thing.maxY + 3))
                self.overlay.view.speechTarget = thing
            }
            self.overlay.view.caption = ProcessInfo.processInfo.environment["GOOGLY_DEMO_TEXT"]
                ?? "That's the prompt box, where you type your question. Cheeky little thing."
        }
        // GOOGLY_DEMO_OUT=path.png saves a picture of the overlay (on dark grey) and quits.
        if let out = ProcessInfo.processInfo.environment["GOOGLY_DEMO_OUT"] {
            DispatchQueue.main.asyncAfter(deadline: .now() + 2.5) {
                let view = self.overlay.view
                let scale: CGFloat = 1
                let w = Int(view.bounds.width * scale), h = Int(view.bounds.height * scale)
                guard let ctx = CGContext(data: nil, width: w, height: h, bitsPerComponent: 8, bytesPerRow: 0,
                                          space: CGColorSpaceCreateDeviceRGB(),
                                          bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { exit(1) }
                ctx.setFillColor(NSColor(white: 0.12, alpha: 1).cgColor)
                ctx.fill(CGRect(x: 0, y: 0, width: w, height: h))
                ctx.setFillColor(NSColor(white: 0.5, alpha: 1).cgColor)
                ctx.fill(CGRect(x: thing.minX, y: view.bounds.height - thing.maxY, width: thing.width, height: thing.height))
                ctx.scaleBy(x: scale, y: scale)
                view.layer?.presentation()?.render(in: ctx) ?? view.layer?.render(in: ctx)
                if let image = ctx.makeImage() {
                    let rep = NSBitmapImageRep(cgImage: image)
                    try? rep.representation(using: .png, properties: [:])?.write(to: URL(fileURLWithPath: out))
                }
                exit(0)
            }
        }
    }
    @objc private func toggleShow() { settings.showCursor.toggle() }
    @objc private func testAvatarMood(_ item: NSMenuItem) {
        if let id = item.representedObject as? String { avatarWindow.test(mood: id) }
    }
    @objc private func testAvatarReaction(_ item: NSMenuItem) {
        if let id = item.representedObject as? String { avatarWindow.react(id) }
    }
    @objc private func toggleAvatarWindow() {
        settings.showAvatarWindow.toggle()
        if settings.showAvatarWindow { avatarWindow.show() } else { avatarWindow.hide() }
    }
    @objc private func pairPhone() { pairingPanel.show() }
    @objc private func pauseFocus() { focus.pause() }
    @objc private func resumeFocus() { _ = focus.resume() }
    @objc private func endFocus() { _ = focus.end() }
    @objc private func toggleFocusDeveloperMode() { focus.setDeveloperMode(!focus.developerMode) }
    @objc private func setTrail(_ item: NSMenuItem) {
        if let raw = item.representedObject as? String, let trail = PointerTrail(rawValue: raw) { settings.trail = trail }
    }
    @objc private func talkTest() { overlay.talkTest() }

    @objc private func setSize(_ item: NSMenuItem) { settings.cursorSize = Double(item.tag) }
    @objc private func setPhonePosition(_ item: NSMenuItem) { settings.phonePosition = Double(item.tag) / 100 }
    @objc private func toggleAwake() {
        server.broadcast(Packet(command: host.awake ? "sleep" : "wake"))
    }

    /// On launch, asks for whatever he still needs (so Bluey shows up in those Settings lists),
    /// and keeps a small status file so it's easy to check what's allowed.
    private func checkPermissions() {
        guard ProcessInfo.processInfo.environment["GOOGLY_DEMO_OUT"] == nil else { return }
        // Focus only needs Screen Recording. Accessibility is optional for explicit computer control.
        if !CGPreflightScreenCaptureAccess() { CGRequestScreenCaptureAccess() }
        let status = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("Googly/status.txt")
        Timer.scheduledTimer(withTimeInterval: 3, repeats: true) { _ in
            let text = "accessibility=\(ComputerControl.isTrusted) screenRecording=\(CGPreflightScreenCaptureAccess()) computerControl=\(Settings.shared.computerControl)\n"
            try? text.write(to: status, atomically: true, encoding: .utf8)
        }.fire()
    }

    @objc private func openNotes() {
        try? FileManager.default.createDirectory(at: MeetingNotes.root, withIntermediateDirectories: true)
        NSWorkspace.shared.open(MeetingNotes.root)
    }

    @objc private func stopActions() {
        focus.pause("Stopped with ⌃⌥S")
        host.stopActions()
    }

    @objc private func toggleComputerControl() {
        settings.computerControl.toggle()
        // Focus only needs Screen Recording. Accessibility is optional for explicit computer control.
        restartIfAwake()  // his tools change with this switch
    }

    @objc private func allowComputerControl() {
        ComputerControl.askForPermission()
        ComputerControl.openAccessibilitySettings()
    }

    /// Wakes him again so a new personality or set of tools takes effect right away.
    private func restartIfAwake() {
        guard host.awake else { return }
        server.broadcast(Packet(command: "sleep"))
        DispatchQueue.main.asyncAfter(deadline: .now() + 1) { self.server.broadcast(Packet(command: "wake")) }
    }

    @objc private func editPersonality() {
        NSApp.activate(ignoringOtherApps: true)
        let alert = NSAlert()
        alert.messageText = "His Personality"
        alert.informativeText = "Describe who he is and how he talks. How he looks at and points at your screen stays built in."
        let scroll = NSScrollView(frame: NSRect(x: 0, y: 0, width: 480, height: 220))
        scroll.hasVerticalScroller = true
        scroll.borderType = .bezelBorder
        let text = NSTextView(frame: scroll.bounds)
        text.autoresizingMask = [.width]
        text.isRichText = false
        text.font = NSFont.systemFont(ofSize: 13)
        text.string = RealtimeHost.personality
        text.textContainerInset = NSSize(width: 6, height: 6)
        scroll.documentView = text
        alert.accessoryView = scroll
        alert.addButton(withTitle: "Save")
        alert.addButton(withTitle: "Cancel")
        alert.addButton(withTitle: "Reset to Default")
        alert.window.initialFirstResponder = text
        switch alert.runModal() {
        case .alertFirstButtonReturn: RealtimeHost.personality = text.string
        case .alertThirdButtonReturn: RealtimeHost.personality = ""
        default: return
        }
        restartIfAwake()
    }

    @objc private func editKeys() {
        NSApp.activate(ignoringOtherApps: true)
        let alert = NSAlert()
        alert.messageText = "OpenAI API Key"
        alert.informativeText = "Saved privately on this Mac (not in the project files). The phone only ever gets short-lived keys."
        let field = NSSecureTextField(frame: NSRect(x: 0, y: 0, width: 360, height: 24))
        field.placeholderString = Keychain.get(.openai) == nil ? "sk-…" : "Key saved. Paste a new one to replace it."
        alert.accessoryView = field
        alert.addButton(withTitle: "Save")
        alert.addButton(withTitle: "Cancel")
        alert.window.initialFirstResponder = field
        guard alert.runModal() == .alertFirstButtonReturn else { return }
        let key = field.stringValue.trimmingCharacters(in: .whitespacesAndNewlines)
        if !key.isEmpty { Keychain.set(.openai, key) }
    }

    @objc private func setMood(_ item: NSMenuItem) {
        if let mood = item.representedObject as? String, let m = Mood(rawValue: mood) { settings.mood = m }
    }

    // MARK: Menu

    func menuNeedsUpdate(_ menu: NSMenu) {
        menu.removeAllItems()

        let phones = server.phoneNames
        let status = NSMenuItem(title: phones.isEmpty ? "Waiting for the phone app…" : "Phone connected: \(phones.joined(separator: ", "))",
                                action: nil, keyEquivalent: "")
        status.isEnabled = false
        menu.addItem(status)
        menu.addItem(item("Pair iPhone (QR)…", #selector(pairPhone)))
        if let session = focus.current, session.status != .ended {
            let title = NSMenuItem(title: "Focus: \(session.task) · \(FocusSession.clock(session.remaining))", action: nil, keyEquivalent: "")
            title.isEnabled = false; menu.addItem(title)
            menu.addItem(item(session.status == .running ? "Pause Focus" : "Resume Focus", session.status == .running ? #selector(pauseFocus) : #selector(resumeFocus)))
            menu.addItem(item("End Focus", #selector(endFocus)))
        }
        let developer = item("Developer Mode (4× · checks every 10s)", #selector(toggleFocusDeveloperMode))
        developer.state = focus.developerMode ? .on : .off
        menu.addItem(developer)
        let wake = NSMenuItem(title: host.awake ? "Go to Sleep (Follow Mode)" : "Wake Up and Talk",
                              action: #selector(toggleAwake), keyEquivalent: " ")
        wake.keyEquivalentModifierMask = [.option]
        wake.target = self
        wake.isEnabled = !phones.isEmpty
        menu.addItem(wake)
        menu.addItem(.separator())

        let control = item("Let Him Use the Computer", #selector(toggleComputerControl))
        control.state = settings.computerControl ? .on : .off
        menu.addItem(control)
        if settings.computerControl && !ComputerControl.isTrusted {
            menu.addItem(item("Allow Clicking and Typing (Accessibility)…", #selector(allowComputerControl)))
        }
        menu.addItem(item("Stop Him", #selector(stopActions), key: "s"))
        menu.addItem(.separator())

        let point = item("Point Here", #selector(pointHere), key: "p")
        menu.addItem(point)
        let follow = item("Eyes Follow My Mouse", #selector(toggleFollow), key: "f")
        follow.state = settings.followMouse ? .on : .off
        menu.addItem(follow)
        menu.addItem(item("Stop Pointing", #selector(dock), key: "d"))
        menu.addItem(item("Talk Test", #selector(talkTest), key: "t"))
        menu.addItem(.separator())

        let moodMenu = NSMenu()
        for mood in Mood.allCases where mood != .talking && mood != .pointing && mood != .sleepy {
            let m = item(mood.title, #selector(setMood(_:)))
            m.representedObject = mood.rawValue
            m.state = settings.mood == mood ? .on : .off
            moodMenu.addItem(m)
        }
        menu.addItem(submenu("Mood", moodMenu))

        let sizeMenu = NSMenu()
        for (name, size) in [("Small", 48), ("Medium", 72), ("Large", 96), ("Huge", 120)] {
            let s = item("\(name) (\(size) pt)", #selector(setSize(_:)))
            s.tag = size
            s.state = Int(settings.cursorSize) == size ? .on : .off
            sizeMenu.addItem(s)
        }
        menu.addItem(submenu("Cursor Size", sizeMenu))

        let phoneMenu = NSMenu()
        for (name, pos) in [("Left", 20), ("Center", 50), ("Right", 80)] {
            let p = item(name, #selector(setPhonePosition(_:)))
            p.tag = pos
            p.state = Int((settings.phonePosition * 100).rounded()) == pos ? .on : .off
            phoneMenu.addItem(p)
        }
        menu.addItem(submenu("Phone Sits Under", phoneMenu))

        if CodexController.isInstalled {
            let codexMenu = NSMenu()
            for job in codex.jobs.suffix(8).reversed() {
                let j = item("\(job.project): \(CodexController.short(job.prompt, 40)) (\(job.status))", #selector(openCodexJob(_:)))
                j.representedObject = job.threadID
                codexMenu.addItem(j)
            }
            if !codex.jobs.isEmpty { codexMenu.addItem(.separator()) }
            codexMenu.addItem(item("Add Project Folder…", #selector(addCodexFolder)))
            codexMenu.addItem(item("Open Codex", #selector(openCodex)))
            menu.addItem(submenu(codex.approvals.isEmpty ? "Codex" : "Codex (waiting for you)", codexMenu))
        }
        menu.addItem(item("Open Meeting Notes", #selector(openNotes)))
        menu.addItem(item("Personality…", #selector(editPersonality)))
        menu.addItem(item("OpenAI Key…", #selector(editKeys)))
        menu.addItem(.separator())

        let trailMenu = NSMenu()
        for trail in PointerTrail.allCases {
            let t = item(trail.title, #selector(setTrail(_:)))
            t.representedObject = trail.rawValue
            t.state = settings.trail == trail ? .on : .off
            trailMenu.addItem(t)
        }
        menu.addItem(submenu("Pointer Trail", trailMenu))

        let show = item("Show Cursor", #selector(toggleShow), key: "h")
        show.state = settings.showCursor ? .on : .off
        menu.addItem(show)
        let avatar = NSMenuItem(title: "Show Keramik Avatar", action: #selector(toggleAvatarWindow), keyEquivalent: "")
        avatar.target = self
        avatar.state = settings.showAvatarWindow ? .on : .off
        menu.addItem(avatar)
        let testMenu = NSMenu()
        for mood in KeramikTest.moods {
            let m = NSMenuItem(title: mood.title, action: #selector(testAvatarMood(_:)), keyEquivalent: "")
            m.target = self; m.representedObject = mood.id; testMenu.addItem(m)
        }
        testMenu.addItem(.separator())
        for reaction in KeramikTest.reactions + [("", "")] + KeramikTest.activities + [("", "")] + KeramikTest.power {
            if reaction.id.isEmpty { testMenu.addItem(.separator()); continue }
            let r = NSMenuItem(title: reaction.title, action: #selector(testAvatarReaction(_:)), keyEquivalent: "")
            r.target = self; r.representedObject = reaction.id; testMenu.addItem(r)
        }
        menu.addItem(submenu("Test Avatar", testMenu))

        menu.addItem(.separator())
        menu.addItem(NSMenuItem(title: "Quit Bluey", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q"))
    }

    /// Menu item that shows its global shortcut (⌃⌥ + key) when given one.
    private func item(_ title: String, _ action: Selector, key: String = "") -> NSMenuItem {
        let item = NSMenuItem(title: title, action: action, keyEquivalent: key)
        item.keyEquivalentModifierMask = [.control, .option]
        item.target = self
        return item
    }

    private func submenu(_ title: String, _ menu: NSMenu) -> NSMenuItem {
        let item = NSMenuItem(title: title, action: nil, keyEquivalent: "")
        item.submenu = menu
        return item
    }
}

/// The little blueberry blob with eyes for the menu bar.
enum MenuIcon {
    static func make() -> NSImage {
        let image = NSImage(size: NSSize(width: 22, height: 18), flipped: true) { rect in
            let body = NSBezierPath(ovalIn: NSRect(x: 1, y: 2, width: 20, height: 16))
            NSGradient(colors: Palette.gradient.map { NSColor(hex: $0) })?.draw(in: body, angle: -60)
            NSColor.white.setFill()
            NSBezierPath(ovalIn: NSRect(x: 5, y: 6, width: 5.5, height: 5.5)).fill()
            NSBezierPath(ovalIn: NSRect(x: 11.5, y: 6, width: 5.5, height: 5.5)).fill()
            NSColor(hex: Palette.ink).setFill()
            NSBezierPath(ovalIn: NSRect(x: 6.3, y: 6.8, width: 3, height: 3)).fill()
            NSBezierPath(ovalIn: NSRect(x: 12.8, y: 6.8, width: 3, height: 3)).fill()
            return true
        }
        image.isTemplate = false
        return image
    }
}
