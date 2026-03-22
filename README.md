# Dodge Runner
A one-to-one WebRTC experience where your phone becomes a motion controller. Tilt your phone to move a fruit and dodge flies on the desktop screen.

---

## How to run
```bash
npm install
npm start
```

Open the printed local IP address in your browser (for example `https://192.168.0.201:3000`).

Do not use `localhost` — the QR code won't work on your phone from there. The server runs over HTTPS, so your browser will show a security warning for the self-signed certificate. Click "Advanced" and proceed.

---

## Requirements

- Node.js v18 or higher
- A phone and laptop on the same WiFi network
- `openssl` installed (comes with macOS and most Linux systems)

---

## HTTPS setup

The phone needs HTTPS to access the gyroscope. Run this once in the project root to generate a self-signed certificate:

```bash
openssl req -x509 -out localhost.crt -keyout localhost.key \
  -newkey rsa:2048 -nodes -sha256 \
  -subj '/CN=localhost' -extensions EXT -config <( \
   printf "[dn]\nCN=localhost\n[req]\ndistinguished_name = dn\n[EXT]\nsubjectAltName=DNS:localhost\nkeyUsage=digitalSignature\nextendedKeyUsage=serverAuth")
```

Then create a `.env` file in the project root:

```
NODE_ENV=development
```

In production, SSL is handled by the hosting platform, so the app runs over HTTP internally.

---

## How to play

1. Run `npm start` and open the printed HTTPS IP address on your desktop browser
2. Scan the QR code with your phone
3. Tap "Enable Motion" on your phone
4. Once motion is enabled, the desktop shows a START GAME button — click it
5. Tilt your phone left and right to move the fruit between lanes
6. Dodge the flies falling from the top
7. You have 3 lives — flies turn transparent when hit
8. When all lives are gone, a restart button appears on your phone
9. Use the sound icon (top right on phone) to pause or resume the music

---

## Development Diary

### Phase 1 — Pipeline & WebRTC setup

The goal was not to build a game, but to validate the full pipeline: the server, the signalling, the WebRTC connection, and the gyroscope input.

I set up an Express server with Socket.io and built both the desktop and controller pages. The signalling follows a standard WebRTC pattern — Socket.io relays offer, answer, and ICE candidate messages between devices, then steps aside once the connection is established. Unlike typical examples, this project skips video and audio streams entirely and relies on a WebRTC data channel to send tilt data, which required extra research.

The gyroscope part was more straightforward. The controller reads `beta` and `gamma` from `DeviceOrientationEvent` and sends them as JSON over the data channel. The desktop receives them and moves the player object (at this stage, a simple ball — later replaced with a fruit sprite).

The biggest challenge wasn't the code — it was iOS. The app kept returning "motion permission denied" even though the permission request was implemented correctly. After investigating, the issue was that iOS blocks motion sensors on plain `http://` pages. I used ngrok as a temporary workaround to unblock development, while a proper solution was deferred to the next phase.

By the end of this phase the core loop worked: scan the QR, tap "Enable Motion," tilt the phone, ball moves.

---

### Phase 2 — HTTPS & core mechanics

Two things happened here: a proper HTTPS fix, and the first real game mechanics.

For HTTPS, I generated a self-signed certificate with `openssl` and updated the server to load it in development using a `NODE_ENV` environment variable. This solved the iOS motion permission issue properly, without depending on ngrok.

With that stable, I reconsidered the game concept. The original balance game idea didn't give the tilt controls a clear purpose. I switched to an endless runner: the player stays at the bottom of the screen across three lanes, obstacles fall from the top, and you tilt to dodge. This decision was driven by wanting the controls to feel intentional rather than incidental.

The lane system restricted horizontal movement to three fixed positions, which made the tilt input more readable and the game more legible. Obstacles spawn randomly in one of the three lanes every 1.5 seconds, move downward each frame, and are removed when they leave the screen.

---

### Phase 3 — Refactoring & gameplay

This phase focused on code quality and making the game actually playable.

The signalling server was simplified: three separate socket events (`peerOffer`, `peerAnswer`, `peerIce`) were replaced with a single `signal` event that relays whatever it receives to the target peer. The server no longer needs to know what type of signal it is handling.

The client-side WebRTC code was refactored using SimplePeer, a lightweight library that abstracts the manual `RTCPeerConnection` setup into a few lines. The decision to use SimplePeer was based on readability — the original code was correct but verbose, and the abstraction made the intent of the code clearer without sacrificing control.

A simple circle–rectangle collision check was implemented without external dependencies. The approach finds the closest point on a rectangle to the circle center and checks if the distance falls within the radius. Three lives were added so the game doesn't end on the first hit. The game over screen shows the final score and sends a restart signal to the phone after a short delay.

---

### Phase 4 — Polish & game feel

This phase was about making the game feel complete.

The game flow was redesigned around a clear sequence: connect → enable motion → start game → play → game over → restart from phone. Disconnection handling was added to cover both clean disconnects and unexpected drops — when the phone leaves, the desktop returns to the QR screen.

CSS was moved into a single external file and the visual theme was redesigned around a retro arcade aesthetic: pixel font, neon glow, CRT scanlines, and a cyan/red palette.

The ball was replaced with a pitaya sprite and the obstacles became flies, drawn with `ctx.drawImage()`. This made the game concept immediately readable without needing instructions.

Difficulty scales over time — obstacle speed increases incrementally based on the score, so early gameplay is approachable and later gameplay requires more precise control.

Data smoothing was added to make the gyroscope input usable. Raw sensor values are noisy — the phone shakes slightly even when held still, which caused the player to drift. Two improvements were made: a deadzone ignores values below a threshold, filtering out small unintentional movements; and a low-pass filter blends each new reading with the previous value, preventing sudden spikes from jerking the player across the screen. Together these make movement feel stable and deliberate rather than jittery.

Background music plays during the game. The phone controller has a sound icon in the top right that sends play/pause commands over the data channel — making the data channel useful for more than just tilt. Collision sound is set louder than the music so hits are always audible. A sync message ensures the button state on the phone stays accurate after a restart.

---

## AI Reflection

I used Claude (Anthropic) as an assistant throughout this project.

Several parts were implemented with AI assistance and refined manually. The HTTPS server configuration was initially generated with AI after explaining the requirements, then adjusted to fit the project structure. The obstacle system and game loop were built with AI help, but the lane logic, spawn timing, and difficulty curve were tuned through testing. The collision detection and SimplePeer refactor were also implemented with AI assistance — in both cases, the reasoning was discussed before writing code, so the decisions were understood rather than just copied.

What helped most was the approach: instead of just producing code, AI consistently asked questions first. That forced me to think through the logic before seeing a solution, which made a real difference in actually understanding what was being built.

The iOS permission issue was a clear example of where AI couldn't help. No prompt was going to identify that iOS blocks motion sensors on plain HTTP — that required reading error messages, testing on the device, and reasoning about platform constraints. That kind of debugging is still manual work.

The most useful thing was using AI to understand, not just to produce.