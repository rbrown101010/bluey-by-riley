import AppKit

/// The frontmost app and, for known browsers, the active tab. Kept in memory only.
struct FocusContext: Equatable {
    let bundleID: String
    let name: String
    let host: String?
    let url: URL?
    let isBrowser: Bool
    /// What an appeal approves or locks: a site for browsers, the app otherwise.
    /// A browser whose tab can't be read has no key, so a lock never covers the whole browser.
    var key: String? { host ?? (isBrowser ? nil : name) }
}

@MainActor
enum FrontContext {
    /// Safari uses "current tab"; Chromium browsers (Chrome, Brave, Edge, Arc) use "active tab".
    static let browsers: [String: String] = [
        "com.apple.Safari": "current tab", "com.google.Chrome": "active tab", "com.brave.Browser": "active tab",
        "com.microsoft.edgemac": "active tab", "company.thebrowser.Browser": "active tab",
    ]
    /// Browsers whose tab Bluey can't read. They get no key, so they are never locked as a whole app.
    static let unreadableBrowsers: Set<String> = [
        "org.mozilla.firefox", "org.mozilla.firefoxdeveloperedition", "app.zen-browser.zen",
        "com.operasoftware.Opera", "com.vivaldi.Vivaldi", "org.torproject.torbrowser",
    ]

    static func current() -> FocusContext? {
        guard let app = NSWorkspace.shared.frontmostApplication, let id = app.bundleIdentifier,
              id != Bundle.main.bundleIdentifier else { return nil }
        var url: URL?
        if let tab = browsers[id] {
            url = run("tell application id \"\(id)\" to return URL of \(tab) of front window").flatMap(URL.init(string:))
        }
        let host = url?.host?.lowercased().replacingOccurrences(of: "^www\\.", with: "", options: .regularExpression)
        return FocusContext(bundleID: id, name: app.localizedName ?? id, host: host?.isEmpty == false ? host : nil,
                            url: url, isBrowser: browsers[id] != nil || unreadableBrowsers.contains(id))
    }

    /// Sends the user back to their work. When `lock` is set, the locked tab is navigated away
    /// (to the work page in the same browser, or a blank page) or the locked app is hidden.
    static func leave(_ from: FocusContext, to work: FocusContext?, lock: Bool) {
        let sameApp = work?.bundleID == from.bundleID
        // Never redirect a locked tab to a page on the locked site itself.
        let workURL = sameApp && !(lock && work?.key == from.key) ? work?.url.flatMap(safe) : nil
        if lock {
            if let tab = browsers[from.bundleID] {
                let target = workURL ?? "about:blank"
                _ = run("tell application id \"\(from.bundleID)\" to set URL of \(tab) of front window to \"\(target)\"")
            } else {
                NSRunningApplication.runningApplications(withBundleIdentifier: from.bundleID).first?.hide()
            }
        }
        guard let work else { return }
        if sameApp {
            // Same browser, different page: open the work page without touching the current tab.
            if !lock, let url = work.url, workURL != nil, url != from.url,
               let appURL = NSWorkspace.shared.urlForApplication(withBundleIdentifier: work.bundleID) {
                NSWorkspace.shared.open([url], withApplicationAt: appURL, configuration: NSWorkspace.OpenConfiguration())
            }
        } else {
            NSRunningApplication.runningApplications(withBundleIdentifier: work.bundleID).first?.activate()
        }
    }

    /// Only plain web URLs are written into AppleScript, with quotes and backslashes rejected.
    private static func safe(_ url: URL) -> String? {
        let text = url.absoluteString
        guard ["http", "https"].contains(url.scheme?.lowercased() ?? ""), !text.contains("\""), !text.contains("\\") else { return nil }
        return text
    }

    private static func run(_ source: String) -> String? {
        var error: NSDictionary?
        let script = NSAppleScript(source: "with timeout of 2 seconds\n\(source)\nend timeout")
        let result = script?.executeAndReturnError(&error)
        return error == nil ? result?.stringValue : nil
    }
}
