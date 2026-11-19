import AppKit
import SwiftUI
import GooglyShared

/// A small floating window with the user's Keramik avatar, mirroring the mood Bluey shows on the phone.
/// Drag it anywhere; it stays above other windows and never takes focus.
@MainActor
final class AvatarWindow {
    private final class Model: ObservableObject {
        @Published var mood = "neutral"
        @Published var reaction: KeramikReaction?
    }

    /// Lets the transparent window be dragged by the avatar itself.
    private final class DragView: NSView {
        override func hitTest(_ point: NSPoint) -> NSView? { frame.contains(point) ? self : nil }
        override func mouseDown(with event: NSEvent) { window?.performDrag(with: event) }
    }

    private struct Content: View {
        @ObservedObject var model: Model
        var body: some View { KeramikAvatarView(mood: model.mood, reaction: model.reaction) }
    }

    private let model = Model()
    private var panel: NSPanel?

    var isShown: Bool { panel?.isVisible == true }

    func show() {
        if panel == nil { panel = makePanel() }
        panel?.orderFrontRegardless()
    }

    func hide() { panel?.orderOut(nil) }

    func update(_ face: FaceState) {
        let mood = KeramikMapping.mood(face.mood)
        if model.mood != mood { model.mood = mood }
    }

    func react(_ name: String) {
        model.reaction = KeramikReaction(name, id: (model.reaction?.id ?? 0) + 1)
    }

    private func makePanel() -> NSPanel {
        let size = NSSize(width: 220, height: 205)
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
