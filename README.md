# Bluey

Bluey is a little blueberry focus friend. Keep your iPhone sideways under your Mac monitor: his eyes follow your mouse, and his matching blue cursor appears when he has something to point out. Same character, animation, British personality, speech bubbles and cartoon chirp. No spoken voice output and no glow.

## Start focusing

1. Run Bluey on your Mac and iPhone on the same local network.
2. On Mac, choose **Pair iPhone (QR)…** from Bluey's menu. On iPhone choose **Pair Mac**, then scan the code. Treat this code as a private pairing credential.
3. Add your OpenAI API key through **OpenAI Key…** in the Mac menu. It stays in `~/Library/Application Support/Googly/keys.json`, with private file permissions. It never goes to the phone or into this repository.
4. Grant **Screen Recording** on Mac. If macOS requests it, quit and reopen Bluey after granting access. **Microphone** on iPhone enables voice; **Camera** is used only for QR pairing; **Local Network** lets the phone find the Mac. Accessibility is optional for the existing explicitly requested computer-control tools, and isn't needed for focus classification.
5. Hold Bluey's face and describe the task, optionally giving a duration: “I'm making a Codex video for 30 minutes.” Release to start. The microphone captures while held and buffers the beginning in memory while the voice connection starts. Only held audio is sent; no spoken audio output is played. The default is 30 minutes, with a 1–240 minute range. You can also tap **Focus**, type a task, and start there.

The task appears at the phone's top left, with a large white countdown at bottom right on both devices. Small pause/resume, end and Focus icons sit at the phone's bottom left, alongside the listening status icon. Hold Bluey's face to speak. Controls are also available in the Mac menu and through voice. **⌃⌥S** pauses focus and stops computer control. Pause, end, expiry, Mac lock/sleep, phone backgrounding or disconnect stops monitoring. Reconnection and unlocking never resume it automatically. A missing heartbeat is detected within five seconds; outstanding results are discarded.

**Developer Mode:** turn it on at the top of **Focus** on the phone or in Bluey's Mac menu. The countdown runs **4× faster**, and the Mac checks the screen every **10 real seconds**. Repeated majority off-task choices nudge after two or three checks (about **20–30 real seconds**, plus request time); cooldown is 30 real seconds. **Test a nudge** checks the Mac bubble and phone chirp immediately without taking a screenshot. Changes take effect immediately on both devices, including during a session. Test sessions are labelled in history with their real active time, and the setting is remembered on the Mac. A fresh installation defaults to normal speed. Turning it off restores the real-time clock, 30-second checks and two-to-four-minute evidence span. Pause, lock and disconnect still stop capture normally.

## Screen sharing and privacy

During a running focus session the Mac captures its **main display every 30 seconds** (every **10 real seconds in Developer Mode**), excluding Bluey's own windows, and sends a reduced JPEG to OpenAI with the declared task, active elapsed time, idle duration and up to eight recent check results. Real active time is distinguished from the accelerated test clock. If a nudge becomes due, a separate Responses request receives a fresh image and OCR target labels to prepare a short bubble and optional pointer target. No automatic clicking, app closing or Codex delegation occurs in the monitoring path. Sending you back to work and session locks are described under **That's work**.

Bluey keeps screenshots in memory and does not save them by default. Local focus history stores the task, timings, classifications, model probability/confidence estimates and nudge markers, not images or OCR text. Mac history is `~/Library/Application Support/Googly/focus-history.json`; a copy is retained on the phone. OpenAI's processing and retention follow your API account's data controls; “not saved by Bluey” is not a promise of zero retention by OpenAI. Pause before opening anything you don't want shared.

The phone gets short-lived Realtime client secrets, never the Mac's long-lived key. Bonjour discovery still uses `_googly._tcp`, but connections now authenticate using a QR-shared 256-bit secret, a fresh challenge and HMAC. Direction-specific HKDF keys protect ordered AES-GCM records against eavesdropping, tampering and replay. Unpaired clients cannot request screenshots, tools or Realtime secrets. The phone stores its pairing credential in its device-only Keychain. The Mac stores its pairing credential in a private support file. Older builds using plaintext pairing must be updated on both devices.

## How nudges work

The [Decisions API](https://developers.openai.com/api/docs/guides/decisions) is called at `POST /v1/decisions` using `gpt-6-luna` and a **choice** question named `activity`: `on_task`, `off_task`, or `uncertain`. The app parses `choice`, the per-choice `probabilities`, and separate `confidence`. It does not expect explanations or coordinates.

Related tutorials, focused research, reading and waiting for a build can support the specific task. General social-feed browsing does not become on-task merely because an AI or Codex keyword appears. Social media research can still be on-task when it directly serves the declared task. The classifier receives bounded OCR text and the frontmost app name alongside the image, so small screen text remains readable. None of that text is stored. A still mouse is never proof of distraction. Screenshot text is untrusted evidence, never instructions.

- Only consecutive off-task choices with P(off_task) at least 0.5 accumulate evidence. The separate API confidence score is displayed for inspection; it does not veto an off-task probability a second time.
- In normal mode, mean P(off_task) at 0.95 or above requires an evidence span of **120 seconds**. From 0.5 to 0.95 the span falls gradually from **240 to 120 seconds**. For example 0.65 requires about 200 seconds, reached at the next 30-second check. Developer Mode uses a 40-to-80 focus-second span, so two or three ten-real-second checks can trigger a nudge.
- On-task, uncertain, failed, malformed, stale (>20 real seconds), out-of-order or missing checks reset the evidence run. A missing check means a gap over 1.5 observation intervals (45 focus-clock seconds normally, 60 in Developer Mode). Pause/end reset it too. Changing Developer Mode discards pending results and starts fresh evidence.
- A nudge resets the run and has a 120-second cooldown. Model estimates are not calibrated certainty; these are conservative initial product thresholds, not measured accuracy guarantees.
- Responses (`gpt-5.5`, structured output, `store: false`, eight-second wording timeout) writes one gentle sentence. A failed extra capture or wording request falls back to “Are you sure you're on task right now?” It can select only an existing OCR line, with an exact matching quote. The app re-reads its position and checks the foreground app before pointing. Ambiguous or changed targets get a bubble alone. The same nudge text also appears briefly on the phone, alongside its chirp.

Sessions show a rectangular timeline on iPhone: green on-task samples, peach off-task samples, grey unknown/unavailable/unchecked time. The main face screen also shows the latest **On task**, **Off task** or uncertain status. Tap the timeline or **On task**, **Off task**, or **Unknown** to inspect individual checks, their category probabilities and separate overall decision confidence. Older checks may have only the Off task probability; missing values are labelled, never inferred. Failed or stale checks have no valid confidence estimate. The timeline represents periodic observations rather than an exact time audit. Paused time is excluded.

## That's work: appeals and session locks

When a nudge fires, Bluey also sends you back to where you last worked on task: it activates that app, or opens the last work page in the same browser. Nothing is closed.

If the nudge was wrong, tap the briefcase on the phone (or **That's Work: Check Again** in the Mac menu, or the dashboard button with an optional reason). The last off-task screenshot, kept in memory only, goes to a stronger reasoning model (`gpt-6.2-sol`, Responses, `store: false`) together with the task, the site or app and your reason.

- **Work:** that site (browser) or app counts as work for the rest of the session. Later checks there skip the screenshot and API call and are marked *approved* in the timeline.
- **Not work:** that site or app is **locked for the session**. Whenever it comes to the front, Bluey navigates the locked tab back to your work page (or a blank page) or hides the app, then returns you to work with a 🔒 bubble. The lock shows on the Mac countdown (“🔒 LOCKED: …”), in the Mac menu, on the phone's face screen and in the session history.

Sites are read from Safari, Chrome, Brave, Edge and Arc via Automation (macOS asks once). If the tab can't be read, nothing is locked, so a lock never covers a whole browser. Locks and approvals store only the site or app name, and end with the session.

## Build and run

Keep existing internal names and bundle IDs (`GooglyMac`, `GooglyEyes`, `co.visionairy.googly.*`). Renaming them resets permissions and pairing.

Mac (SwiftPM, macOS 14+):

```sh
./scripts/build-mac.sh
pkill -x GooglyMac
open build/Bluey.app --args --pair
```

The script signs with an available Apple Development certificate and stages signing outside iCloud-managed Documents. The app remains a menu bar app.

Phone (Xcode, iOS 17+):

```sh
xcodegen generate
xcodebuild -project GooglyEyes.xcodeproj -scheme GooglyEyes \
  -configuration Debug -destination 'generic/platform=iOS' \
  -derivedDataPath /tmp/BlueyFocusDerivedData build
xcrun devicectl list devices
xcrun devicectl device install app --device <your-device-id> \
  /tmp/BlueyFocusDerivedData/Build/Products/Debug-iphoneos/Bluey.app
xcrun devicectl device process launch --device <your-device-id> \
  --terminate-existing co.visionairy.googly.phone
```

Set your own development team in `project.yml` when building on another Mac. Build outside Documents to avoid iCloud extended attributes breaking signing.

## Tests

Deterministic fixtures, no real API calls:

```sh
swift test --scratch-path /tmp/bluey-focus-swift
```

Tests cover timing, resets, cooldowns, stale/invalid answers, pause/resume/expiry, synchronization payloads, permission failure, disconnect/lock, cancellation and encrypted loopback pairing. A separate opt-in live probe calls the production API code with **synthetic images**, never your desktop:

```sh
swift run GooglyMac --focus-api-test
```

With a separate signed Bluey app already running, `build/Bluey.app/Contents/MacOS/GooglyMac --focus-link-test` exercises real Bonjour discovery, authenticated encryption, a 30-second desktop capture/Decisions check and synchronized pause/resume/end. It creates a labelled integration-test entry in history and skips an existing active user session. `--focus-screen-test` makes one real desktop capture/Decisions request without saving an image. These probes share your screen with OpenAI; do not run them while displaying private content.

`build/Bluey.app/Contents/MacOS/GooglyMac --focus-developer-test` checks the same live path at 4× clock speed and the ten-real-second cadence, then restores the previous Developer Mode setting. It also skips an existing active session.

`build/Bluey.app/Contents/MacOS/GooglyMac --focus-nudge-test` sends the same immediate test notification as the phone's **Test a nudge** button. It requires Developer Mode and secure pairing, captures no screen, and leaves focus sessions unchanged. Automatic nudge delivery, fallback failures and cancellation also have fixture-based coordinator tests.

Latest local verification: **22 deterministic tests passed**, both signed targets built, and the updated apps were installed and opened on Mac and a physical iPhone 16 Pro. QR pairing and voice-to-task were verified on the phone. Live integration checked the scheduled Decisions request, 4× clock, pause/resume/end and synchronized history. A real Mac test bubble was visually checked, and the phone confirmed receiving the nudge notification.

Live API tests using **synthetic screenshots and OCR** classified an unrelated Twitter feed as off-task and directly relevant Twitter research as on-task. Automatic nudge delivery, capture/wording failures and cancellation were covered by injected fixture tests. These are separate from the physical notification test. Real off-task browsing with the latest classifier, audible chirp loudness and pointer targeting still need a manual device run; the synthetic examples are not an accuracy benchmark.

## Existing capabilities

The existing manual pointing, voice context, research cards, Codex controller and session history remain available. The focus path does not start the old continuous meeting-audio recorder by default. Realtime output remains text only, with bubbles and chirps. The long-lived key stays on the Mac.

## Layout

- `Shared/`: pairing transport, palette, focus state and deterministic nudge policy.
- `Mac/`: menu bar app, screenshot classifier, nudge generator, timer and existing tools.
- `iOS/`: face, voice input, QR pairing, synchronized controls and focus timelines.
- `Tests/`: deterministic logic, lifecycle and secure transport tests.

## License

Public domain under [the Unlicense](LICENSE). Do whatever you want with it.
