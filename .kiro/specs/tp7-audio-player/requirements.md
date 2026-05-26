# Requirements Document

## Introduction

This document defines the requirements for a web-based, interactive 2D replica of the Teenage Engineering TP-7 audio player. The application is a single-page React/TypeScript app that allows users to load audio files via drag-and-drop, control playback with transport buttons, and interact with a spinning reel via pointer-based scratch gestures. All audio processing uses the native Web Audio API with zero external runtime dependencies beyond React.

## Glossary

- **Player**: The TP-7 audio player web application
- **Reel**: The interactive SVG element representing the tape reel that rotates during playback and responds to pointer interaction
- **Transport_Controls**: The set of play, pause, and stop buttons that control audio playback
- **Display_Panel**: The UI element showing current time, duration, playback rate, and file name
- **Tape_Motor**: The custom React hook (`useTapeMotor`) that serves as the unified state manager for audio and physics state
- **Scratch_Interaction**: The pointer-based drag gesture on the reel that allows the user to manually control audio position and speed
- **Playback_Rate**: The speed multiplier for audio playback, ranging from -4.0 to 4.0
- **Rotation_Angle**: The current rotation of the reel SVG in degrees, always in the range [0, 360)
- **Audio_Context**: The Web Audio API AudioContext instance used for decoding and playing audio

## Requirements

### Requirement 1: Audio File Loading

**User Story:** As a user, I want to load audio files by dragging and dropping them onto the player, so that I can quickly start listening without navigating file dialogs.

#### Acceptance Criteria

1. WHEN a user drops a file with an audio MIME type onto the Player, THE Tape_Motor SHALL decode the file and store the resulting AudioBuffer
2. WHEN a file is successfully loaded, THE Player SHALL update state to reflect the loaded track including file name and duration
3. WHEN a user drops a non-audio file onto the Player, THE Player SHALL reject the file and maintain the current state
4. WHEN a file is dropped while audio is currently playing, THE Tape_Motor SHALL stop the current playback before loading the new file
5. IF the audio file cannot be decoded, THEN THE Player SHALL display an error indication and remain in the previous state

### Requirement 2: Transport Controls

**User Story:** As a user, I want play, pause, and stop buttons, so that I can control audio playback with familiar transport actions.

#### Acceptance Criteria

1. WHEN the user presses play and a file is loaded, THE Tape_Motor SHALL create a new AudioBufferSourceNode and start playback from the current offset
2. WHEN the user presses pause during playback, THE Tape_Motor SHALL stop the source node and store the current time as the resume offset
3. WHEN the user presses stop, THE Tape_Motor SHALL stop the source node and reset the current time and rotation angle to zero
4. WHILE no file is loaded, THE Transport_Controls SHALL be visually disabled and non-interactive
5. WHEN play is called while already playing, THE Tape_Motor SHALL treat it as a no-op without errors or state corruption
6. WHEN stop is called while already stopped, THE Tape_Motor SHALL treat it as a no-op without errors or state corruption

### Requirement 3: Reel Animation

**User Story:** As a user, I want to see the reel spin in sync with the audio, so that I get visual feedback of playback progress reminiscent of a physical tape machine.

#### Acceptance Criteria

1. WHILE audio is playing, THE Tape_Motor SHALL drive a requestAnimationFrame loop that updates the Rotation_Angle in sync with the audio timeline
2. WHEN playback is active, THE Reel SHALL render with a CSS transform rotation matching the current Rotation_Angle
3. WHEN playback stops or pauses, THE Tape_Motor SHALL cancel the animation frame loop
4. THE Rotation_Angle SHALL always remain in the range [0, 360)

### Requirement 4: Scratch Interaction

**User Story:** As a user, I want to click and drag the reel to scratch the audio like a DJ, so that I can scrub through the track and create scratch effects.

#### Acceptance Criteria

1. WHEN the user presses down on the Reel with the primary pointer button, THE Tape_Motor SHALL enter scratch mode and pause normal playback
2. WHILE scratch mode is active, THE Tape_Motor SHALL calculate angular velocity from pointer movement and map it to Playback_Rate
3. WHILE scratch mode is active, THE Reel SHALL rotate to follow the pointer position
4. WHEN the user releases the pointer, THE Tape_Motor SHALL exit scratch mode and resume playback from the new position if it was playing before
5. WHILE scratch mode is active, THE Tape_Motor SHALL set pointer capture on the Reel element to prevent event leakage
6. WHEN pointer movement produces a time delta less than 1 millisecond, THE Tape_Motor SHALL skip the velocity calculation and use the previous velocity value

### Requirement 5: Playback Rate and Bounds

**User Story:** As a user, I want the playback speed to respond to my scratch gestures within safe limits, so that I get expressive control without audio distortion beyond reasonable bounds.

#### Acceptance Criteria

1. THE Tape_Motor SHALL constrain Playback_Rate to the range [-4.0, 4.0] at all times
2. THE Tape_Motor SHALL constrain current time to the range [0, duration] at all times
3. WHEN scratch angular velocity is calculated, THE Tape_Motor SHALL apply exponential moving average smoothing with a factor of 0.3 for new values and 0.7 for previous values
4. WHEN the current time reaches or exceeds the duration during playback, THE Tape_Motor SHALL stop playback and reset to the beginning

### Requirement 6: Display Panel

**User Story:** As a user, I want to see the current playback time, file name, and speed on a display, so that I have clear feedback about the player state.

#### Acceptance Criteria

1. WHILE a file is loaded, THE Display_Panel SHALL show the current time formatted as MM:SS
2. WHILE a file is loaded, THE Display_Panel SHALL show the total duration
3. WHILE a file is loaded, THE Display_Panel SHALL show the current Playback_Rate
4. WHILE a file is loaded, THE Display_Panel SHALL show the file name
5. WHILE no file is loaded, THE Display_Panel SHALL show a "NO TAPE" indicator

### Requirement 7: State Machine Consistency

**User Story:** As a developer, I want the player to always be in exactly one valid state, so that the UI and audio behavior are predictable and bug-free.

#### Acceptance Criteria

1. THE Player SHALL always be in exactly one of the following states: idle (no file loaded), playing, paused, or scratching
2. WHEN transitioning between states, THE Tape_Motor SHALL ensure no intermediate invalid state is observable by consuming components
3. THE Tape_Motor SHALL be the single source of truth for audio position and reel rotation across all components

### Requirement 8: Audio Context Management

**User Story:** As a user, I want the player to work correctly in browsers that require user gestures for audio, so that I can use the player without encountering silent failures.

#### Acceptance Criteria

1. WHEN the Audio_Context is null on first interaction, THE Tape_Motor SHALL create a new AudioContext instance
2. WHEN the Audio_Context is in a suspended state, THE Tape_Motor SHALL resume it before proceeding with playback or file loading
3. WHEN the Player component unmounts, THE Tape_Motor SHALL close the Audio_Context and cancel all pending animation frames
4. WHEN the Player component unmounts during active playback, THE Tape_Motor SHALL stop the source node and release all resources

### Requirement 9: Skeuomorphic UI

**User Story:** As a user, I want the player to look and feel like a physical TP-7 device, so that the experience is visually engaging and authentic.

#### Acceptance Criteria

1. THE Player SHALL render a chassis container styled to resemble the physical TP-7 housing
2. THE Reel SHALL render as an SVG with spoke and hub details
3. THE Transport_Controls SHALL render as skeuomorphic buttons with visual pressed and active states
4. THE Display_Panel SHALL be styled as an LCD or OLED display
5. THE Reel SHALL use CSS `will-change: transform` to promote to its own compositor layer for smooth animation
