# Motion Balance Game

Motion Balance Game is a one-to-one WebRTC experience where your phone becomes a motion controller. By tilting your phone, you control a ball and try to keep it balanced on a platform displayed on the desktop screen.

---

## How to run

```bash
npm install
npm start
```

Open the printed local IP address in your browser (for example `http://192.168.0.201:3000`).
Do not use `localhost`, otherwise the QR code won't work when scanning it from your phone.

---

## Development Diary

### Week 1 — Reaching a first working MVP

The focus this week was getting the entire pipeline working end-to-end: the server, signalling, WebRTC connection, gyroscope input, and a visible response on screen. The goal wasn't to build a polished game yet, but to prove that all the moving parts could talk to each other reliably.

I started by setting up the project structure, configuring an Express server with Socket.io, and creating both the desktop and controller pages. From the beginning, the project followed GitHub Flow: development happened on a `feature/project-setup` branch off `dev`, keeping `main` clean and stable.

For signalling, I reused the same approach shown in class. Socket.io handles the handshake by relaying `peerOffer`, `peerAnswer`, and `peerIce` messages between devices, and then steps out of the way once the connection is established. Unlike the class examples, this project doesn't use video or audio streams. Instead, it relies on a WebRTC data channel to send small amounts of tilt data. That required a slightly different setup and some extra research beyond the provided examples.

Once the WebRTC connection was stable, implementing the gyroscope input was relatively straightforward. The controller reads `beta` and `gamma` values from the `DeviceOrientationEvent` and sends them as JSON over the data channel whenever the phone moves. On the desktop side, those values are used to update the ball's movement.

One of the biggest challenges this week turned out not to be code-related at all. On iPhone, the app kept returning "motion permission denied," even though the permission request was implemented correctly. After investigating, it became clear that iOS blocks access to motion sensors on plain `http://` pages. The workaround was to use ngrok to tunnel the local server through an `https://` connection:

```bash
ngrok http 3000
```

This solved the issue and allowed the permission prompt to appear. However, it's only a temporary solution, since the ngrok URL doesn't show the QR code correctly. Finding a more stable local HTTPS setup is something to revisit later.

By the end of the week, the core loop was working: open the desktop page, navigate to the URL manually, tap "Enable Motion" on the phone, and tilt the device to move the ball. That completed the MVP for week one.

---

## AI Reflection

I used Claude (Anthropic) as a coding assistant during this week.

The parts that were close to the class material — such as the server setup, Socket.io signalling, and QR code generation — followed patterns we had already seen. For areas that went beyond the examples, like setting up a WebRTC data channel and handling iOS motion permissions, I used AI to help explore implementation details and understand how the pieces fit together.

AI was helpful for speeding up development and getting unstuck when working with unfamiliar APIs. At the same time, the iOS permission issue was a good reminder that not every problem is a code bug. Understanding why something fails and reasoning about platform constraints still required manual investigation and critical thinking beyond what AI could directly provide.

In the coming weeks, this technical foundation will be expanded with actual game mechanics and refinements to the interaction.