# Motion Balance Game
A one-to-one WebRTC experience where your phone becomes a motion controller. Tilt your phone to move a ball and dodge obstacles on the desktop screen.

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

---

## How to play

1. Open the desktop URL in your browser (printed in the terminal after `npm start`)
2. Click anywhere on the page to unlock sound
3. Scan the QR code with your phone
4. Tap "Enable Motion" on your phone
5. Tilt your phone left and right to move the ball between lanes
6. Dodge the orange obstacles falling from the top
7. You have 3 lives — obstacles turn red when hit
8. When all lives are gone, tilt to restart

---

## Development Diary

### Week 1 — Getting the pipeline working

The goal this week wasn't to build a game. It was to prove that all the pieces could talk to each other: the server, the signalling, the WebRTC connection, and the gyroscope input.

I set up an Express server with Socket.io and built both the desktop and controller pages. The project used GitHub Flow from the start, with feature branches off `dev` to keep `main` stable.

The signalling follows the same pattern from class — Socket.io relays `peerOffer`, `peerAnswer`, and `peerIce` between devices, then steps aside once the connection is established. The difference here is that there's no video or audio. Everything runs through a WebRTC data channel, which required some extra research beyond the class examples.

The gyroscope part was more straightforward. The controller reads `beta` and `gamma` from `DeviceOrientationEvent` and sends them as JSON over the data channel. The desktop receives them and moves the ball.

The biggest challenge wasn't the code — it was iOS. The app kept returning "motion permission denied" even though the permission request looked correct. After digging into it, the issue was that iOS blocks motion sensors on plain `http://` pages. I used ngrok as a temporary fix:

```bash
ngrok http 3000
```

That got the permission prompt working, but the ngrok URL broke the QR code. Good enough to unblock progress, but not a real solution.

By the end of the week the basic loop worked: scan the QR, tap "Enable Motion," tilt the phone, ball moves. MVP done.

---

### Week 2 — HTTPS and first game mechanics

Two things happened this week: the HTTPS problem got a real fix, and the project became an actual game.

For HTTPS, I generated a self-signed certificate with `openssl` and updated the server to load it in development using a `NODE_ENV` variable and `dotenv`. In production it falls back to plain `http`, since hosting platforms handle SSL themselves. The certificate files and `.env` are in `.gitignore` so they don't end up in the repo. This went on a `feature/https` branch and merged into `main`.

With that sorted, I reconsidered the game concept. The original idea — balancing a ball on a platform — didn't give the controls much purpose. After thinking it through, I switched to an endless runner: the ball sits at the bottom across three lanes, obstacles fall from the top, and you tilt to dodge. It's a better fit for the controls and simple enough to actually finish.

The mechanics came together across two branches. On `feature/ball-movement`, I removed vertical movement, fixed the ball near the bottom, constrained it to three lane positions, and drew lane dividers on the canvas. On `feature/obstacles`, I added a spawner that drops rectangles into random lanes every 1.5 seconds. They move down each frame and get removed when they leave the screen.

The runner loop is now visible. Next up: collision detection and scoring.

---

### Week 4 — Refactoring, collision, and game feel

This week was about cleaning up the code and making the game actually playable.

The first change was simplifying the signalling server. The original `index.js` had three separate socket events (`peerOffer`, `peerAnswer`, `peerIce`) to handle the WebRTC handshake. These were replaced with a single `signal` event that just relays whatever it receives to the target peer — the server doesn't need to know what type of signal it is. This went on `feature/simplify-signalling`.

The client-side WebRTC code got the same treatment. All the manual `RTCPeerConnection` setup — ICE candidates, offers, answers, data channel creation — was replaced with SimplePeer, a lightweight library that wraps all of that into a few lines. This worked cleanly with the new single `signal` event. Both `index.html` and `controller.html` got significantly shorter and easier to read. This went on `feature/simplepeer` but was committed together with the server change.

Collision detection was added on `feature/collision`. Rather than using a physics library, the check is done manually with a circle-rectangle algorithm: find the closest point on the rectangle to the ball center, then check if the distance is within the ball's radius. Three lines of math, no dependencies.

On `feature/lives`, three lives were added so the game doesn't end on the first hit. Obstacles turn red when hit. The game over screen now stays visible for 3 seconds before showing the restart prompt, giving the player time to read their score. Restarting is done by tilting the phone.

Finally, on `feature/sound`, a collision sound effect was added using the Web Audio API. Browsers block audio until the user interacts with the page, so a click listener silently unlocks the audio on first interaction before any gameplay starts.

---

## AI Reflection

I used Claude (Anthropic) as an assistant throughout this project.

Some parts were written with significant AI help. The HTTPS server configuration — loading the certificate, the `isDevelopment` check, switching between `http` and `https` — was mostly AI-generated after I explained what I needed. The obstacle system (`spawnObstacle`, the lane positions, the spawn interval) was also largely written by AI, though built up step by step with explanations along the way. Same for the rewrite of `update` and `draw` when the game concept shifted to a runner.

What helped most in those moments wasn't just getting the code — it was being asked questions before and after. Things like "what do you think this line does?" or "why would passing the same array reference cause a problem?" That approach forced me to think through the logic rather than just copy a solution. By the time the code was written, I understood why it worked.

For the signalling and WebRTC setup, I followed class patterns closely and used AI more to fill in gaps and debug than to write from scratch.

AI also helped with scoping. When I was deciding on a game concept, talking through the options — what was realistic, what fit the controls, what was too complex — saved time and helped me avoid overbuilding.

The iOS permission issue was a good example of where AI couldn't help directly. That required actually reading error messages, testing on the device, and reasoning about platform constraints. No prompt was going to find that.

In week 4, AI helped in a few specific places. The collision detection function was written with AI — the circle-rectangle math is not something you would reach for immediately, and AI explained the logic behind finding the closest point on a rectangle before writing it. The SimplePeer refactor was also largely AI-driven, though the reasoning behind it (simpler signalling, less boilerplate) was discussed and made sense before touching the code.

Debugging was another area where AI was useful. At one point the WebRTC connection stopped working after the refactor — the desktop peer was being created too early, before any signal arrived, which caused a "wrong state" error. AI helped identify the issue and explained why creating the peer lazily (only on first signal) fixed it. The audio autoplay error was similar — the browser blocking sound without user interaction was not obvious at first, and AI pointed to the fix quickly.

The most useful thing overall was using AI to understand, not just to produce.