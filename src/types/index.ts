export interface Point {
  x: number;
  y: number;
}

export interface TapeMotorState {
  // Audio state
  isLoaded: boolean;
  isPlaying: boolean;
  fileName: string | null;
  duration: number;
  currentTime: number;
  playbackRate: number;
  error: string | null;

  // Physics/visual state
  rotationDeg: number;
  isScratchActive: boolean;
  momentumVelocity: number; // deg/frame for coasting after scratch

  // Tape stop state
  isTapeStopped: boolean;

  // Rocker state
  rockerSpeed: number;
  isRockerHeld: boolean;
  isComboScrubbing: boolean;

  // Recording state
  isRecording: boolean;
  recordingTime: number;

  // Volume & display
  volume: number;
  displayMode: 'time' | 'remaining' | 'percent';
  isLooping: boolean;
  loopStart: number | null;
  loopEnd: number | null;

  // Waveform
  waveformData: number[]; // normalized peaks 0-1, ~200 samples

  // Tape effects
  tapeEffectsEnabled: boolean;

  // Theme
  darkMode: boolean;

  // Progress
  progress: number; // 0-1

  // Multi-track
  tracks: TrackInfo[];
  activeTrackIndex: number;
}

export interface TrackInfo {
  id: string;
  fileName: string;
  duration: number;
  waveformData: number[];
}

export interface ScratchState {
  isActive: boolean;
  startAngle: number;
  lastAngle: number;
  lastTimestamp: number;
  velocity: number;
  accumulatedRotation: number;
  wasPlayingBeforeScratch: boolean;
}

export interface TapeStopState {
  isActive: boolean;
  wasPlayingBefore: boolean;
  rampStartTime: number;
  rampStartRate: number;
}

export interface RockerState {
  isHeld: boolean;
  direction: 'ff' | 'rw' | null;
  speedLevel: number;
}

export interface RecordingRefs {
  mediaStream: MediaStream | null;
  mediaRecorder: MediaRecorder | null;
  chunks: Blob[];
  startTime: number;
  timerInterval: number | null;
}

export interface AudioEngineRefs {
  audioContext: AudioContext | null;
  sourceNode: AudioBufferSourceNode | null;
  audioBuffer: AudioBuffer | null;
  startOffset: number;
  startTime: number;
}

export interface TapeMotorAPI {
  state: TapeMotorState;
  play(): void;
  pause(): void;
  stop(): void;
  record(): void;
  stopRecording(): void;
  exportRecording(): void;
  loadFile(file: File): Promise<void>;
  onScratchStart(e: React.PointerEvent, reelCenter: Point): void;
  onScratchMove(e: React.PointerEvent, reelCenter: Point): void;
  onScratchEnd(): void;
  onTapeStopStart(): void;
  onTapeStopEnd(): void;
  onRockerPress(direction: 'ff' | 'rw'): void;
  onRockerRelease(): void;
  volumeUp(): void;
  volumeDown(): void;
  setVolume(v: number): void;
  cycleDisplayMode(): void;
  toggleLoop(): void;
  toggleTapeEffects(): void;
  toggleDarkMode(): void;
  skipForward(): void;
  skipBackward(): void;
  selectTrack(index: number): void;
  removeTrack(index: number): void;
  nextTrack(): void;
  prevTrack(): void;
  loadFromBuffer(buffer: ArrayBuffer, fileName: string): Promise<void>;
  loadDemoTrack(): Promise<void>;
}

export const INITIAL_STATE: TapeMotorState = {
  isLoaded: false,
  isPlaying: false,
  fileName: null,
  duration: 0,
  currentTime: 0,
  playbackRate: 1.0,
  error: null,
  rotationDeg: 0,
  isScratchActive: false,
  momentumVelocity: 0,
  isTapeStopped: false,
  rockerSpeed: 0,
  isRockerHeld: false,
  isComboScrubbing: false,
  isRecording: false,
  recordingTime: 0,
  volume: 0.8,
  displayMode: 'time',
  isLooping: false,
  loopStart: null,
  loopEnd: null,
  waveformData: [],
  tapeEffectsEnabled: false,
  darkMode: false,
  progress: 0,
  tracks: [],
  activeTrackIndex: -1,
};

export const INITIAL_REFS: AudioEngineRefs = {
  audioContext: null,
  sourceNode: null,
  audioBuffer: null,
  startOffset: 0,
  startTime: 0,
};

export const INITIAL_SCRATCH: ScratchState = {
  isActive: false,
  startAngle: 0,
  lastAngle: 0,
  lastTimestamp: 0,
  velocity: 0,
  accumulatedRotation: 0,
  wasPlayingBeforeScratch: false,
};

export const INITIAL_TAPE_STOP: TapeStopState = {
  isActive: false,
  wasPlayingBefore: false,
  rampStartTime: 0,
  rampStartRate: 1.0,
};

export const INITIAL_ROCKER: RockerState = {
  isHeld: false,
  direction: null,
  speedLevel: 0,
};

export const INITIAL_RECORDING: RecordingRefs = {
  mediaStream: null,
  mediaRecorder: null,
  chunks: [],
  startTime: 0,
  timerInterval: null,
};
