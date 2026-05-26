# Implementation Plan: TP-7 Audio Player

## Overview

Build a web-based, interactive 2D replica of the Teenage Engineering TP-7 audio player as a React/TypeScript SPA using Vite. The implementation follows an incremental approach: project scaffolding → core hook logic → UI components → interaction wiring → polish and testing.

## Tasks

- [x] 1. Set up project structure and core interfaces
  - [x] 1.1 Initialize Vite + React + TypeScript project
    - Run `npm create vite` with React TypeScript template
    - Install dev dependencies: vitest, @testing-library/react, fast-check, jsdom
    - Configure vitest in `vite.config.ts` with jsdom environment
    - Create directory structure: `src/components/`, `src/hooks/`, `src/types/`, `src/tests/`
    - _Requirements: 9.1_

  - [x] 1.2 Define TypeScript interfaces and types
    - Create `src/types/index.ts` with `TapeMotorState`, `ScratchState`, `AudioEngineRefs`, `Point`, and `TapeMotorAPI` interfaces
    - Define `INITIAL_STATE`, `INITIAL_REFS`, `INITIAL_SCRATCH` constants
    - Export all component prop interfaces: `TP7PlayerProps`, `ReelSVGProps`, `TransportControlsProps`, `DisplayPanelProps`
    - _Requirements: 7.1, 7.3_

- [x] 2. Implement useTapeMotor hook — core state and transport
  - [x] 2.1 Implement hook skeleton with state management
    - Create `src/hooks/useTapeMotor.ts`
    - Set up `useState` for `TapeMotorState`, `useRef` for `AudioEngineRefs`, `ScratchState`, and RAF ID
    - Implement cleanup `useEffect` that closes AudioContext and cancels RAF on unmount
    - Return the `TapeMotorAPI` shape with stub methods
    - _Requirements: 7.1, 7.3, 8.3, 8.4_

  - [x] 2.2 Implement loadFile method
    - Create/resume AudioContext on first call (browser autoplay policy)
    - Validate file MIME type starts with `audio/`
    - Stop current playback if active
    - Decode audio via `audioContext.decodeAudioData`
    - Update state: `isLoaded`, `fileName`, `duration`, `currentTime=0`, `rotationDeg=0`, `playbackRate=1.0`
    - Handle decode errors gracefully (state unchanged on failure)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 8.1, 8.2_

  - [x] 2.3 Implement play, pause, and stop methods
    - `play()`: Create new `AudioBufferSourceNode`, connect to destination, start at `startOffset`, set `isPlaying=true`, start RAF loop. No-op if already playing or no file loaded.
    - `pause()`: Stop source node, store `currentTime` as `startOffset`, set `isPlaying=false`, cancel RAF. No-op if not playing.
    - `stop()`: Stop source node, reset `currentTime=0`, `rotationDeg=0`, `startOffset=0`, set `isPlaying=false`, cancel RAF. No-op if already stopped with no file.
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [ ]* 2.4 Write property tests for state bounds invariant
    - **Property 1: State Bounds Invariant**
    - Generate arbitrary sequences of operations (play, pause, stop, load)
    - Assert `playbackRate` in [-4.0, 4.0], `currentTime` in [0, duration], `rotationDeg` in [0, 360)
    - **Validates: Requirements 3.4, 5.1, 5.2**

  - [ ]* 2.5 Write property tests for state machine consistency
    - **Property 3: State Machine Consistency**
    - Generate arbitrary sequences of user actions
    - Assert player is always in exactly one state: idle, playing, paused, or scratching
    - **Validates: Requirements 7.1**

  - [ ]* 2.6 Write property tests for idempotent controls
    - **Property 4: Idempotent Controls**
    - Generate states where player is already playing/stopped
    - Assert calling play() when playing or stop() when stopped produces no state change
    - **Validates: Requirements 2.5, 2.6**

  - [ ]* 2.7 Write property tests for stop resets and pause preserves
    - **Property 7: Stop Resets to Zero**
    - Assert that stop() always results in `currentTime=0` and `rotationDeg=0`
    - **Property 8: Pause Preserves Position**
    - Assert that pause() preserves `currentTime` and `rotationDeg`
    - **Validates: Requirements 2.2, 2.3**

- [x] 3. Implement useTapeMotor hook — animation loop and scratch
  - [x] 3.1 Implement requestAnimationFrame animation loop
    - Create `tick` callback with `useCallback`
    - During normal playback: derive `currentTime` from AudioContext timing, compute `rotationDeg` as `(currentTime * 360 * playbackRate) % 360`
    - Detect end-of-track (`currentTime >= duration`) and call `stop()`
    - Schedule next frame with `requestAnimationFrame`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 5.4_

  - [x] 3.2 Implement scratch interaction handlers
    - `onScratchStart`: Set `isScratchActive=true`, pause playback if playing, initialize scratch state with current angle/timestamp, set pointer capture
    - `onScratchMove`: Calculate angular delta with ±π wraparound, compute velocity with EMA (0.3/0.7), map to `playbackRate` via `velocity / (2π)` clamped to [-4.0, 4.0], update `rotationDeg` and `currentTime`
    - `onScratchEnd`: Set `isScratchActive=false`, release pointer capture, resume playback if was playing before scratch
    - Skip velocity calculation when `deltaTime < 1ms`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 5.1, 5.3_

  - [ ]* 3.3 Write property tests for scratch velocity calculation
    - **Property 9: Scratch Velocity Calculation**
    - Generate arbitrary pointer positions and timestamps
    - Assert `playbackRate` equals EMA-smoothed angular velocity / 2π, clamped to [-4.0, 4.0]
    - **Validates: Requirements 4.2, 5.3**

  - [ ]* 3.4 Write property tests for scratch entry/exit behavior
    - **Property 10: Scratch Entry Pauses Playback**
    - Assert initiating scratch sets `isScratchActive=true` and pauses playback
    - **Property 11: Scratch Exit Resumes If Was Playing**
    - Assert releasing pointer resumes playback from new position if was playing before
    - **Validates: Requirements 4.1, 4.4**

  - [ ]* 3.5 Write property tests for rotation-time sync and end-of-track
    - **Property 2: Rotation-Time Synchronization**
    - Assert `rotationDeg` is derivable from `currentTime` and `playbackRate` during normal playback
    - **Property 12: End-of-Track Stops Playback**
    - Assert that when `currentTime >= duration`, player transitions to stopped state
    - **Validates: Requirements 3.1, 5.4**

- [ ] 4. Checkpoint - Core hook complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement UI components
  - [x] 5.1 Implement DisplayPanel component
    - Create `src/components/DisplayPanel.tsx`
    - Format time as MM:SS using a helper function
    - Show file name, current time, duration, and playback rate when loaded
    - Show "NO TAPE" indicator when no file is loaded
    - Style as LCD/OLED display with monospace font, dark background, and glowing text
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 9.4_

  - [ ]* 5.2 Write property test for time formatting
    - **Property 13: Time Formatting**
    - Generate arbitrary time values in seconds
    - Assert formatter produces string matching MM:SS pattern
    - **Validates: Requirements 6.1**

  - [x] 5.3 Implement ReelSVG component
    - Create `src/components/ReelSVG.tsx`
    - Render SVG with hub, spokes, and outer ring details
    - Apply `transform: rotate(${rotationDeg}deg)` via inline style
    - Set `will-change: transform` on the SVG element
    - Attach `onPointerDown`, `onPointerMove`, `onPointerUp` handlers from props
    - Use `React.forwardRef` to expose SVG ref for center calculation
    - _Requirements: 9.2, 9.5, 3.2, 4.3_

  - [x] 5.4 Implement TransportControls component
    - Create `src/components/TransportControls.tsx`
    - Render play, pause, and stop buttons with skeuomorphic styling
    - Disable all buttons when `isLoaded` is false
    - Show active/pressed visual states
    - Wire `onClick` handlers to `onPlay`, `onPause`, `onStop` props
    - _Requirements: 2.4, 9.3_

  - [x] 5.5 Implement TP7Player container component
    - Create `src/components/TP7Player.tsx`
    - Instantiate `useTapeMotor` hook
    - Render chassis container with skeuomorphic styling
    - Compose `DisplayPanel`, `ReelSVG`, and `TransportControls` with correct props
    - Implement drag-and-drop: `onDragOver` (preventDefault), `onDrop` (extract file, validate MIME, call `loadFile`)
    - Compute reel center from ref for scratch handlers
    - _Requirements: 1.1, 1.3, 9.1_

- [ ] 6. Checkpoint - UI components complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Integration wiring and final polish
  - [x] 7.1 Wire App component and global styles
    - Update `src/App.tsx` to render `TP7Player`
    - Create `src/App.css` with global styles: centered layout, dark background, body reset
    - Ensure the player is the sole content of the page
    - _Requirements: 9.1_

  - [x] 7.2 Implement performance optimizations
    - Apply `rotationDeg` via direct DOM ref manipulation (`element.style.transform`) instead of React state re-renders for the reel
    - Ensure `useTapeMotor` returns stable method references via `useCallback`
    - Verify `will-change: transform` is set on the reel element
    - _Requirements: 3.2, 9.5_

  - [ ]* 7.3 Write property tests for file loading state
    - **Property 5: File Loading Produces Correct State**
    - Generate valid audio file metadata
    - Assert state reflects `isLoaded=true`, correct file name, correct duration, `currentTime=0`, `rotationDeg=0`
    - **Property 6: Invalid Files Are Rejected**
    - Generate non-audio MIME types
    - Assert state remains unchanged after attempted load
    - **Property 14: Loading During Playback Stops Current**
    - Assert loading a new file while playing stops current playback first
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**

  - [ ]* 7.4 Write integration tests for full player lifecycle
    - Test drag-and-drop file loading flow
    - Test play → pause → resume → stop cycle
    - Test component unmount cleanup (AudioContext closed, RAF cancelled)
    - _Requirements: 8.3, 8.4, 2.1, 2.2, 2.3_

- [ ] 8. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The reel rotation is applied via direct DOM manipulation for performance (not React state)
- Web Audio API requires a new AudioBufferSourceNode per play — the decoded AudioBuffer is reused
- All audio processing is local with zero network requests

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["2.1"] },
    { "id": 3, "tasks": ["2.2", "2.3"] },
    { "id": 4, "tasks": ["2.4", "2.5", "2.6", "2.7", "3.1"] },
    { "id": 5, "tasks": ["3.2"] },
    { "id": 6, "tasks": ["3.3", "3.4", "3.5"] },
    { "id": 7, "tasks": ["5.1", "5.3", "5.4"] },
    { "id": 8, "tasks": ["5.2", "5.5"] },
    { "id": 9, "tasks": ["7.1", "7.2"] },
    { "id": 10, "tasks": ["7.3", "7.4"] }
  ]
}
```
