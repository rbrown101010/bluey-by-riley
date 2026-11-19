import Foundation

/// Which character the phone shows (and the Mac's optional avatar window uses).
public enum AvatarStyle: String, CaseIterable, Sendable {
    case bluey, keramik

    public var title: String {
        switch self {
        case .bluey: return "Bluey"
        case .keramik: return "Keramik"
        }
    }

    public static let defaultsKey = "avatarStyle"

    public static var saved: AvatarStyle {
        get { AvatarStyle(rawValue: UserDefaults.standard.string(forKey: defaultsKey) ?? "") ?? .keramik }
        set { UserDefaults.standard.set(newValue.rawValue, forKey: defaultsKey) }
    }
}

/// Maps Bluey's moods onto the Keramik avatar's expressions. The avatar's HUD activities show sample
/// data, so only moods and reactions are used.
public enum KeramikMapping {
    public static func mood(_ mood: Mood) -> String {
        switch mood {
        case .listening, .resting: return "neutral"
        case .thinking: return "think"
        case .talking, .happy: return "happy"
        case .pointing: return "focus"
        case .sleepy: return "sleep"
        }
    }
}

#if canImport(WebKit) && canImport(SwiftUI)
import SwiftUI
import WebKit

/// A one-shot reaction (an arm with a sign, confetti …). A new `id` plays it again.
public struct KeramikReaction: Equatable, Sendable {
    public var name: String
    public var id: Int
    public init(_ name: String, id: Int) { self.name = name; self.id = id }
}

/// The user's own Keramik avatar (`vendor/keramik-avatar`), rendered by its web component in a
/// transparent web view. Purely visual: it ignores touches, so gestures on the face keep working.
public struct KeramikAvatarView {
    public var mood: String
    /// Where the eyes look, -1…1 (y down), like Bluey's gaze. Nil lets them wander on their own.
    public var gaze: CGPoint?
    public var reaction: KeramikReaction?
    /// How long a reaction stays before he goes back to `mood`.
    public var reactionSeconds: Double
    /// Size relative to the view's shorter fit; above 1 crops the empty margin around him.
    public var zoom: Double

    public init(mood: String, gaze: CGPoint? = nil, reaction: KeramikReaction? = nil, reactionSeconds: Double = 4, zoom: Double = 0.96) {
        self.zoom = zoom
        self.mood = mood
        self.gaze = gaze
        self.reaction = reaction
        self.reactionSeconds = reactionSeconds
    }

    public final class Coordinator: NSObject, WKNavigationDelegate {
        var ready = false
        var shownMood: String?
        var shownGaze: CGPoint?
        var playedReaction: Int?
        var pending: KeramikAvatarView?
        var reactionUntil = Date.distantPast
        weak var web: WKWebView?

        public func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            ready = true
            if let pending { apply(pending) }
        }

        /// Only http(s) links would leave the page; the avatar has none, so nothing navigates away.
        public func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction,
                            decisionHandler: @escaping @MainActor @Sendable (WKNavigationActionPolicy) -> Void) {
            decisionHandler(action.navigationType == .other ? .allow : .cancel)
        }

        func apply(_ view: KeramikAvatarView) {
            pending = view
            guard ready, let web else { return }
            if Self.moved(view.gaze, from: shownGaze) {
                shownGaze = view.gaze
                let look = view.gaze.map { String(format: "%.3f, %.3f", $0.x, $0.y) } ?? "null"
                web.evaluateJavaScript("window.ka && ka.look(\(look))")
            }
            if let reaction = view.reaction, reaction.id != playedReaction {
                playedReaction = reaction.id
                reactionUntil = Date().addingTimeInterval(view.reactionSeconds)
                web.evaluateJavaScript("window.ka && ka.react(\(Self.js(reaction.name)))")
                let id = reaction.id
                DispatchQueue.main.asyncAfter(deadline: .now() + view.reactionSeconds) { [weak self] in
                    guard let self, self.playedReaction == id, let latest = self.pending else { return }
                    self.shownMood = nil
                    self.reactionUntil = .distantPast
                    self.apply(latest)
                }
                return
            }
            guard Date() >= reactionUntil, view.mood != shownMood else { return }
            shownMood = view.mood
            web.evaluateJavaScript("window.ka && ka.setMood(\(Self.js(view.mood)))")
        }

        static func moved(_ a: CGPoint?, from b: CGPoint?) -> Bool {
            guard let a, let b else { return (a == nil) != (b == nil) }
            return abs(a.x - b.x) > 0.01 || abs(a.y - b.y) > 0.01
        }

        static func js(_ text: String) -> String {
            let data = try? JSONSerialization.data(withJSONObject: [text])
            let array = data.flatMap { String(data: $0, encoding: .utf8) } ?? "[\"neutral\"]"
            return String(array.dropFirst().dropLast())
        }
    }

    public func makeCoordinator() -> Coordinator { Coordinator() }

    func makeWebView(_ coordinator: Coordinator) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.suppressesIncrementalRendering = true
        if let script = Self.componentSource {
            config.userContentController.addUserScript(
                WKUserScript(source: script, injectionTime: .atDocumentEnd, forMainFrameOnly: true))
        }
        let web = WKWebView(frame: .zero, configuration: config)
        web.navigationDelegate = coordinator
        #if os(iOS)
        web.isOpaque = false
        web.backgroundColor = .clear
        web.scrollView.backgroundColor = .clear
        web.scrollView.isScrollEnabled = false
        web.isUserInteractionEnabled = false
        #else
        web.setValue(false, forKey: "drawsBackground")
        #endif
        coordinator.web = web
        coordinator.pending = self
        web.loadHTMLString(Self.page(zoom: zoom), baseURL: nil)
        return web
    }

    /// The component file with its ES module `export` lines removed, so it runs as a plain user script.
    static let componentSource: String? = {
        guard let url = Bundle.main.url(forResource: "keramik-avatar", withExtension: "js"),
              let text = try? String(contentsOf: url, encoding: .utf8) else { return nil }
        let lines = text.components(separatedBy: "\n").filter { !$0.hasPrefix("export ") }
        return lines.joined(separator: "\n")
            + "\nwindow.ka = document.getElementById('bot');\n"
    }()

    static func page(zoom: Double) -> String {
        let z = String(format: "%.1f", zoom * 100)
        return """
    <!doctype html><html><head><meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">
    <style>
      html, body { margin: 0; height: 100%; background: transparent; overflow: hidden; }
      body { display: flex; align-items: center; justify-content: center; }
      keramik-avatar { --ka-size: min(\(z)vw, calc(\(z)vh * 280 / 260)); flex-shrink: 0; }
    </style></head>
    <body><keramik-avatar id="bot" shape="kapsel" boot></keramik-avatar></body></html>
    """
    }
}

#if os(iOS)
extension KeramikAvatarView: UIViewRepresentable {
    public func makeUIView(context: Context) -> WKWebView { makeWebView(context.coordinator) }
    public func updateUIView(_ web: WKWebView, context: Context) { context.coordinator.apply(self) }
}
#else
extension KeramikAvatarView: NSViewRepresentable {
    public func makeNSView(context: Context) -> WKWebView { makeWebView(context.coordinator) }
    public func updateNSView(_ web: WKWebView, context: Context) { context.coordinator.apply(self) }
}
#endif
#endif
