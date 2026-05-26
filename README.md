# TP-7 Web Audio Player

A web-based interactive replica of the Teenage Engineering TP-7 audio recorder/player. Built with React, TypeScript, and the Web Audio API.

## Features

- **Motorized Reel** — Spins in sync with audio playback, displays real-time waveform visualization
- **Audible Scratching** — Drag the disc to scrub audio with vinyl-style scratch effects
- **Tape Stop** — Hold the center hub to decelerate playback with a tape-stop ramp
- **Momentum Physics** — Release after scratching and the reel coasts with inertia
- **Side Rocker** — Fast-forward/rewind at 2×/4×/8× speed
- **Recording** — Capture microphone audio directly, auto-loads as a playable track
- **Multi-Track** — Load multiple files, switch between them, manage a track list
- **Tape Effects** — Toggle lo-fi saturation + high-frequency rolloff for analog warmth
- **Loop Mode** — Set loop points and loop seamlessly
- **Volume Control** — +/- buttons and a draggable knurled dial
- **Progress Ring** — Orange arc around the reel shows playback position
- **Dark Mode** — Full dark theme with proper contrast
- **WAV Export** — Download any track or recording as a .wav file
- **SoundCloud Integration** — Search and stream tracks (requires API token)
- **Keyboard Shortcuts** — Full keyboard control

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Space | Play / Pause |
| ← → | Skip ±5 seconds |
| ↑ ↓ | Volume up / down |
| R | Record / Stop recording |
| L | Toggle loop |
| T | Toggle tape effects |
| D | Toggle dark mode |
| E | Export as WAV |
| M | Cycle display mode |

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

## SoundCloud Integration (Optional)

1. Register an app at [soundcloud.com/you/apps](https://soundcloud.com/you/apps) (requires Artist Pro)
2. Get an OAuth token via Client Credentials flow
3. Create a `.env` file:

```
VITE_SOUNDCLOUD_TOKEN=your_access_token
```

4. Restart the dev server

## Tech Stack

- React 18 + TypeScript
- Vite
- Web Audio API (playback, effects, recording)
- MediaRecorder API (mic capture)
- Pointer Events (scratch interaction)
- requestAnimationFrame (reel animation)
- Zero runtime dependencies beyond React

## License

MIT
