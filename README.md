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

## AI Reflection

I used Claude (Anthropic) as an assistant throughout this project.

The parts that were close to the class material — such as the server setup, Socket.io signalling, and QR code generation — followed patterns we had already seen. For areas that went beyond the examples, like setting up a WebRTC data channel and handling iOS motion permissions, I used AI to help explore implementation details and understand how the pieces fit together.

AI was helpful for speeding up development and getting unstuck when working with unfamiliar APIs. At the same time, the iOS permission issue was a good reminder that not every problem is a code bug. Understanding why something fails and reasoning about platform constraints still required manual investigation and critical thinking beyond what AI could directly provide.

Some parts were written with significant AI help. The obstacle system (`spawnObstacle`, the lane positions, the spawn interval) was largely written by AI, though built up step by step with explanations along the way. Same for the rewrite of `update` and `draw` when the game concept shifted to a runner.

What helped most in those moments wasn't just getting the code — it was being asked questions before and after. Things like "what do you think this line does?". That approach forced me to think through the logic rather than just copy a solution. By the time the code was written, I understood why it worked.

The most useful thing overall was using AI to understand, not just to produce.