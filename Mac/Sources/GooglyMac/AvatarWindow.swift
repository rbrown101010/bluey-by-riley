import AppKit
import SwiftUI
import GooglyShared

/// A small floating window with the user's Keramik avatar, mirroring the mood Bluey shows on the phone.
/// Drag it anywhere; it stays above other windows and never takes focus.
@MainActor
final class AvatarWindow {
    private final class Model: ObservableObject {
        @Published var mood = "neutral"
        @Published var gaze = CGPoint.zero
        @Published var reaction: KeramikReaction?
    }

    /// Lets the transparent window be dragged by the avatar itself.
    private final class DragView: NSView {
        override func hitTest(_ point: NSPoint) -> NSView? { frame.contains(point) ? self : nil }
        override func mouseDown(with event: NSEvent) { window?.performDrag(with: event) }
    }

    private struct Content: View {
        @ObservedObject var model: Model
        var body: some View { KeramikAvatarView(mood: model.mood, gaze: model.gaze, reaction: model.reaction) }
    }

    private let model = Model()
    private var panel: NSPanel?

    var isShown: Bool { panel?.isVisible == true }

    func show() {
        if panel == nil { panel = makePanel() }
        guard let panel else { return }
        // Keep it fully on screen (a remembered spot may be off-screen after a size or display change).
        if let visible = (panel.screen ?? NSScreen.main)?.visibleFrame {
            var frame = panel.frame
            frame.origin.x = min(max(frame.minX, visible.minX), visible.maxX - frame.width)
            frame.origin.y = min(max(frame.minY, visible.minY), visible.maxY - frame.height)
            panel.setFrame(frame, display: false)
        }
        panel.orderFrontRegardless()
    }

    func hide() { panel?.orderOut(nil) }

    func update(_ face: FaceState) {
        let mood = KeramikMapping.mood(face.mood)
        if model.mood != mood { model.mood = mood }
    }

    /// Turns his eyes toward a point on screen (global coordinates), seen from where this window sits.
    func look(at point: CGPoint) {
        guard let panel, panel.isVisible else { return }
        let center = CGPoint(x: panel.frame.midX, y: panel.frame.midY)
        let screen = (panel.screen ?? NSScreen.main)?.frame.size ?? CGSize(width: 1440, height: 900)
        let gaze = CGPoint(x: max(-1, min(1, (point.x - center.x) / (screen.width * 0.35))),
                           y: max(-1, min(1, (center.y - point.y) / (screen.height * 0.35))))
        if abs(gaze.x - model.gaze.x) > 0.02 || abs(gaze.y - model.gaze.y) > 0.02 { model.gaze = gaze }
    }

    func react(_ name: String) {
        model.reaction = KeramikReaction(name, id: (model.reaction?.id ?? 0) + 1)
    }

    private func makePanel() -> NSPanel {
        let size = NSSize(width: 340, height: 316)
        let screen = NSScreen.main?.visibleFrame ?? NSRect(x: 0, y: 0, width: 1440, height: 900)
        let panel = NSPanel(contentRect: NSRect(x: screen.maxX - size.width - 24, y: screen.minY + 24,
                                                width: size.width, height: size.height),
                            styleMask: [.borderless, .nonactivatingPanel], backing: .buffered, defer: false)
        panel.isOpaque = false
        panel.backgroundColor = .clear
        panel.hasShadow = false
        panel.level = .floating
        panel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
        panel.isReleasedWhenClosed = false
        panel.setFrameAutosaveName("KeramikAvatarWindow")
        panel.setContentSize(size)  // the remembered spot keeps its place, but takes the current size

        let container = NSView(frame: NSRect(origin: .zero, size: size))
        let host = NSHostingView(rootView: Content(model: model))
        host.frame = container.bounds
        host.autoresizingMask = [.width, .height]
        container.addSubview(host)
        let drag = DragView(frame: container.bounds)
        drag.autoresizingMask = [.width, .height]
        container.addSubview(drag)
        panel.contentView = container
        return panel
    }
}
