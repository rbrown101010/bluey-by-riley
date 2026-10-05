import AppKit
import ApplicationServices
import Carbon.HIToolbox

/// Low-level hands on the keyboard and mouse, used only when the user asks him to do something.
/// Positions are in points, top-left origin of the main display (the overlay's space, which is also
/// Quartz's global space).
enum ComputerControl {
    enum ControlError: LocalizedError {
        case notTrusted
        case unknownKey(String)

        var errorDescription: String? {
            switch self {
            case .notTrusted:
                return "I need Accessibility permission to click and type. The user has to allow Bluey in System Settings, Privacy & Security, Accessibility."
            case .unknownKey(let key):
                return "I don't know the key \"\(key)\"."
            }
        }
    }

    /// True once the user has allowed Bluey under Accessibility.
    static var isTrusted: Bool { AXIsProcessTrusted() }

    /// Shows the system prompt that sends the user to the Accessibility settings.
    static func askForPermission() {
        let key = kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String
        AXIsProcessTrustedWithOptions([key: true] as CFDictionary)
    }

    static func openAccessibilitySettings() {
        if let url = URL(string: "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility") {
            NSWorkspace.shared.open(url)
        }
    }

    private static let source = CGEventSource(stateID: .hidSystemState)

    /// Where the real mouse pointer is right now.
    static var mouseLocation: CGPoint { CGEvent(source: nil)?.location ?? .zero }

    /// Puts the real pointer back where the user left it.
    static func warp(to point: CGPoint) {
        CGWarpMouseCursorPosition(point)
        CGAssociateMouseAndMouseCursorPosition(1)
    }

    // MARK: Mouse

    static func click(at point: CGPoint, right: Bool = false, count: Int = 1) async {
        let down: CGEventType = right ? .rightMouseDown : .leftMouseDown
        let up: CGEventType = right ? .rightMouseUp : .leftMouseUp
        let button: CGMouseButton = right ? .right : .left
        post(.mouseMoved, at: point, button: button)
        try? await Task.sleep(for: .milliseconds(30))
        for i in 1...max(1, count) {
            post(down, at: point, button: button, clickState: i)
            try? await Task.sleep(for: .milliseconds(35))
            post(up, at: point, button: button, clickState: i)
            if i < count { try? await Task.sleep(for: .milliseconds(80)) }
        }
    }

    static func dragBegin(at point: CGPoint) {
        post(.mouseMoved, at: point, button: .left)
        post(.leftMouseDown, at: point, button: .left, clickState: 1)
    }

    static func dragMove(to point: CGPoint) {
        post(.leftMouseDragged, at: point, button: .left)
    }

    static func dragEnd(at point: CGPoint) {
        post(.leftMouseUp, at: point, button: .left, clickState: 1)
    }

    /// Scrolls smoothly at a point. Positive `dy` scrolls down the page, positive `dx` scrolls right.
    static func scroll(dx: Int, dy: Int, at point: CGPoint) async {
        post(.mouseMoved, at: point, button: .left)
        let steps = 12
        for _ in 0..<steps {
            let event = CGEvent(scrollWheelEvent2Source: source, units: .pixel, wheelCount: 2,
                                wheel1: Int32(-dy / steps), wheel2: Int32(-dx / steps), wheel3: 0)
            event?.location = point
            event?.post(tap: .cghidEventTap)
            try? await Task.sleep(for: .milliseconds(16))
        }
    }

    private static func post(_ type: CGEventType, at point: CGPoint, button: CGMouseButton, clickState: Int = 0) {
        let event = CGEvent(mouseEventSource: source, mouseType: type, mouseCursorPosition: point, mouseButton: button)
        if clickState > 0 { event?.setIntegerValueField(.mouseEventClickState, value: Int64(clickState)) }
        event?.flags = []
        event?.post(tap: .cghidEventTap)
    }

    // MARK: Keyboard

    /// Types text as if on a keyboard, calling `onChunk` as each bit goes in (for the typing animation).
    static func type(_ text: String, onChunk: (String) -> Void) async {
        // Short text types at a natural pace; long text goes in faster, a few characters at a time.
        let chunkSize = text.count > 160 ? 6 : 1
        let pause: Duration = text.count > 160 ? .milliseconds(12) : .milliseconds(22)
        var chunk = ""
        for character in text {
            if character == "\n" || character == "\r" || character == "\t" {
                if !chunk.isEmpty {
                    typeUnicode(chunk)
                    onChunk(chunk)
                    chunk = ""
                    try? await Task.sleep(for: pause)
                }
                pressKey(code: character == "\t" ? kVK_Tab : kVK_Return, flags: [])
                try? await Task.sleep(for: pause)
                continue
            }
            chunk.append(character)
            if chunk.count >= chunkSize {
                typeUnicode(chunk)
                onChunk(chunk)
                chunk = ""
                try? await Task.sleep(for: pause)
            }
        }
        if !chunk.isEmpty {
            typeUnicode(chunk)
            onChunk(chunk)
        }
    }

    private static func typeUnicode(_ text: String) {
        let units = Array(text.utf16)
        for pressed in [true, false] {
            guard let event = CGEvent(keyboardEventSource: source, virtualKey: 0, keyDown: pressed) else { continue }
            units.withUnsafeBufferPointer { buffer in
                event.keyboardSetUnicodeString(stringLength: buffer.count, unicodeString: buffer.baseAddress)
            }
            event.flags = []
            event.post(tap: .cghidEventTap)
        }
    }

    private static func pressKey(code: Int, flags: CGEventFlags) {
        for pressed in [true, false] {
            let event = CGEvent(keyboardEventSource: source, virtualKey: CGKeyCode(code), keyDown: pressed)
            event?.flags = flags
            event?.post(tap: .cghidEventTap)
        }
    }

    /// Presses a key or shortcut like "cmd+t", "return", "cmd+shift+n" or "down".
    /// Returns a short label for it, like "⌘T".
    @discardableResult
    static func press(_ combo: String) throws -> String {
        var flags: CGEventFlags = []
        var label = ""
        var keyCode: Int?
        var keyLabel = ""
        let parts = combo.lowercased().replacingOccurrences(of: " ", with: "").split(separator: "+").map(String.init)
        for part in parts where !part.isEmpty {
            switch part {
            case "cmd", "command", "⌘", "meta", "super":
                flags.insert(.maskCommand)
                label += "⌘"
            case "shift", "⇧":
                flags.insert(.maskShift)
                label += "⇧"
            case "option", "opt", "alt", "⌥":
                flags.insert(.maskAlternate)
                label += "⌥"
            case "ctrl", "control", "⌃":
                flags.insert(.maskControl)
                label += "⌃"
            case "fn":
                flags.insert(.maskSecondaryFn)
            default:
                guard let code = keyCodes[part] else { throw ControlError.unknownKey(part) }
                keyCode = code
                keyLabel = keyLabels[part] ?? part.uppercased()
            }
        }
        guard let keyCode else { throw ControlError.unknownKey(combo) }
        pressKey(code: keyCode, flags: flags)
        return label + keyLabel
    }

    private static let keyCodes: [String: Int] = {
        var map: [String: Int] = [
            "a": kVK_ANSI_A, "b": kVK_ANSI_B, "c": kVK_ANSI_C, "d": kVK_ANSI_D, "e": kVK_ANSI_E, "f": kVK_ANSI_F,
            "g": kVK_ANSI_G, "h": kVK_ANSI_H, "i": kVK_ANSI_I, "j": kVK_ANSI_J, "k": kVK_ANSI_K, "l": kVK_ANSI_L,
            "m": kVK_ANSI_M, "n": kVK_ANSI_N, "o": kVK_ANSI_O, "p": kVK_ANSI_P, "q": kVK_ANSI_Q, "r": kVK_ANSI_R,
            "s": kVK_ANSI_S, "t": kVK_ANSI_T, "u": kVK_ANSI_U, "v": kVK_ANSI_V, "w": kVK_ANSI_W, "x": kVK_ANSI_X,
            "y": kVK_ANSI_Y, "z": kVK_ANSI_Z,
            "0": kVK_ANSI_0, "1": kVK_ANSI_1, "2": kVK_ANSI_2, "3": kVK_ANSI_3, "4": kVK_ANSI_4,
            "5": kVK_ANSI_5, "6": kVK_ANSI_6, "7": kVK_ANSI_7, "8": kVK_ANSI_8, "9": kVK_ANSI_9,
            "return": kVK_Return, "enter": kVK_Return, "tab": kVK_Tab, "space": kVK_Space, "spacebar": kVK_Space,
            "delete": kVK_Delete, "backspace": kVK_Delete, "forwarddelete": kVK_ForwardDelete, "del": kVK_ForwardDelete,
            "escape": kVK_Escape, "esc": kVK_Escape,
            "left": kVK_LeftArrow, "right": kVK_RightArrow, "up": kVK_UpArrow, "down": kVK_DownArrow,
            "home": kVK_Home, "end": kVK_End, "pageup": kVK_PageUp, "pagedown": kVK_PageDown,
            "-": kVK_ANSI_Minus, "minus": kVK_ANSI_Minus, "=": kVK_ANSI_Equal, "equal": kVK_ANSI_Equal, "plus": kVK_ANSI_Equal,
            "[": kVK_ANSI_LeftBracket, "]": kVK_ANSI_RightBracket, ";": kVK_ANSI_Semicolon, "'": kVK_ANSI_Quote,
            ",": kVK_ANSI_Comma, "comma": kVK_ANSI_Comma, ".": kVK_ANSI_Period, "period": kVK_ANSI_Period,
            "/": kVK_ANSI_Slash, "slash": kVK_ANSI_Slash, "\\": kVK_ANSI_Backslash, "`": kVK_ANSI_Grave,
        ]
        let functionKeys = [kVK_F1, kVK_F2, kVK_F3, kVK_F4, kVK_F5, kVK_F6, kVK_F7, kVK_F8, kVK_F9, kVK_F10, kVK_F11, kVK_F12]
        for (i, code) in functionKeys.enumerated() { map["f\(i + 1)"] = code }
        return map
    }()

    private static let keyLabels: [String: String] = [
        "return": "↩", "enter": "↩", "tab": "⇥", "space": "Space", "spacebar": "Space", "delete": "⌫", "backspace": "⌫",
        "forwarddelete": "⌦", "del": "⌦", "escape": "esc", "esc": "esc", "left": "←", "right": "→", "up": "↑", "down": "↓",
        "home": "↖", "end": "↘", "pageup": "⇞", "pagedown": "⇟",
    ]

    // MARK: Apps and links

    /// Opens (or brings forward) an app by name, like "Safari" or "notes".
    static func openApp(_ name: String) async -> String {
        let wanted = name.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
            .replacingOccurrences(of: ".app", with: "")
        if let running = NSWorkspace.shared.runningApplications.first(where: {
            $0.activationPolicy == .regular && $0.localizedName?.lowercased() == wanted
        }) {
            running.activate()
            return "Switched to \(running.localizedName ?? name)."
        }
        guard let url = findApp(wanted) else { return "I couldn't find an app called \(name)." }
        let configuration = NSWorkspace.OpenConfiguration()
        configuration.activates = true
        do {
            _ = try await NSWorkspace.shared.openApplication(at: url, configuration: configuration)
            return "Opened \(url.deletingPathExtension().lastPathComponent)."
        } catch {
            return "I couldn't open \(name): \(error.localizedDescription)"
        }
    }

    static func findApp(_ wanted: String) -> URL? {
        let folders = ["/Applications", "/Applications/Utilities", "/System/Applications", "/System/Applications/Utilities",
                       NSHomeDirectory() + "/Applications", "/System/Library/CoreServices"]
        var apps: [URL] = []
        for folder in folders {
            guard let items = try? FileManager.default.contentsOfDirectory(atPath: folder) else { continue }
            for item in items where item.hasSuffix(".app") {
                apps.append(URL(fileURLWithPath: folder).appendingPathComponent(item))
            }
        }
        func name(_ url: URL) -> String { url.deletingPathExtension().lastPathComponent.lowercased() }
        return apps.first { name($0) == wanted }
            ?? apps.first { name($0).hasPrefix(wanted) }
            ?? apps.first { name($0).contains(wanted) }
    }

    /// Opens a website or link in the default browser.
    static func openURL(_ text: String) -> String {
        var address = text.trimmingCharacters(in: .whitespacesAndNewlines)
        if !address.contains("://") { address = "https://" + address }
        guard let url = URL(string: address), let host = url.host, ["http", "https"].contains(url.scheme?.lowercased() ?? "") else {
            return "That doesn't look like a web address."
        }
        NSWorkspace.shared.open(url)
        return "Opened \(host)."
    }
}
