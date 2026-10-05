import SwiftUI

/// Shown until the phone finds the Mac: a sleepy blob and how to wake him up.
struct PairingView: View {
    var onPlay: () -> Void

    var body: some View {
        HStack(spacing: 56) {
            SleepyBlob()
                .frame(width: 220, height: 190)

            VStack(alignment: .leading, spacing: 14) {
                Text("Wake me up from your Mac")
                    .font(.fredoka(32))
                    .foregroundStyle(Color(hex: 0xF4F1FA))
                Text("Open Bluey in your Mac's menu bar. Keep both on the same Wi-Fi and I'll find it.")
                    .font(.plexSans(16))
                    .foregroundStyle(Color(hex: Palette.inkSoft))
                    .frame(maxWidth: 380, alignment: .leading)
                HStack(spacing: 10) {
                    ProgressView().tint(Color(hex: Palette.berry1))
                    Text("Looking for your Mac")
                        .font(.plexMono(13))
                        .foregroundStyle(Color(hex: Palette.inkSoft))
                }
                .padding(.top, 4)
                Button(action: onPlay) {
                    Text("Play without the Mac")
                        .font(.plexSans(15).weight(.semibold))
                        .foregroundStyle(Color(hex: 0xF4F1FA))
                        .padding(.horizontal, 18)
                        .frame(minHeight: 44)
                        .background(Color(hex: Palette.panel), in: RoundedRectangle(cornerRadius: 14))
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 72)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.black)
    }
}

private struct SleepyBlob: View {
    var body: some View {
        TimelineView(.animation) { timeline in
            let t = timeline.date.timeIntervalSinceReferenceDate
            ZStack {
                BlobShape()
                    .fill(BlobShape.linear)
                    .overlay(BlobShape().fill(RadialGradient(colors: [.white.opacity(0.5), .white.opacity(0)],
                                                             center: UnitPoint(x: 0.3, y: 0.22), startRadius: 0, endRadius: 80)))
                    .opacity(0.9)
                HStack(spacing: 26) {
                    Capsule().fill(Color(hex: Palette.ink)).frame(width: 46, height: 7)
                    Capsule().fill(Color(hex: Palette.ink)).frame(width: 46, height: 7)
                }
                .offset(y: -18)
                Ellipse().fill(Color(hex: Palette.nose)).frame(width: 18, height: 12).offset(x: 4, y: 21)
                Text("z").font(.fredoka(26)).foregroundStyle(Color(hex: Palette.berry3))
                    .offset(x: 110, y: -95 - 4 * sin(t * 1.5))
                Text("z").font(.fredoka(18)).foregroundStyle(Color(hex: Palette.berry4))
                    .offset(x: 128, y: -122 - 4 * sin(t * 1.5 + 1))
            }
            .scaleEffect(1 + 0.02 * sin(t * 1.1), anchor: .bottom)
        }
    }
}
