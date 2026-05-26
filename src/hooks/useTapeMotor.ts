import { useState, useRef, useCallback, useEffect } from 'react';
import {
  TapeMotorState, TapeMotorAPI, AudioEngineRefs, ScratchState,
  TapeStopState, RockerState, RecordingRefs, Point,
  INITIAL_STATE, INITIAL_REFS, INITIAL_SCRATCH,
  INITIAL_TAPE_STOP, INITIAL_ROCKER, INITIAL_RECORDING,
} from '../types';

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function extractWaveform(buffer: AudioBuffer, samples: number = 200): number[] {
  const data = buffer.getChannelData(0);
  const blockSize = Math.floor(data.length / samples);
  const peaks: number[] = [];
  for (let i = 0; i < samples; i++) {
    let max = 0;
    for (let j = 0; j < blockSize; j++) {
      const abs = Math.abs(data[i * blockSize + j]);
      if (abs > max) max = abs;
    }
    peaks.push(max);
  }
  return peaks;
}

function createTapeSaturationCurve(amount: number = 0.4): Float32Array {
  const samples = 256;
  const curve = new Float32Array(new ArrayBuffer(samples * 4));
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1;
    curve[i] = Math.tanh(x * (1 + amount * 2));
  }
  return curve;
}

const TAPE_STOP_DURATION = 200;
const MOMENTUM_FRICTION = 0.94;
const SKIP_SECONDS = 5;

export function useTapeMotor(): TapeMotorAPI {
  const [state, setState] = useState<TapeMotorState>(INITIAL_STATE);
  const stateRef = useRef<TapeMotorState>(INITIAL_STATE);
  const refs = useRef<AudioEngineRefs>({ ...INITIAL_REFS });
  const scratchRef = useRef<ScratchState>({ ...INITIAL_SCRATCH });
  const tapeStopRef = useRef<TapeStopState>({ ...INITIAL_TAPE_STOP });
  const rockerRef = useRef<RockerState>({ ...INITIAL_ROCKER });
  const recordingRef = useRef<RecordingRefs>({ ...INITIAL_RECORDING });
  const rafRef = useRef<number | null>(null);
  const reelElRef = useRef<HTMLElement | SVGElement | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const tapeFilterRef = useRef<BiquadFilterNode | null>(null);
  const tapeSaturatorRef = useRef<WaveShaperNode | null>(null);
  const momentumRef = useRef<number>(0);
  const trackBuffersRef = useRef<AudioBuffer[]>([]);

  useEffect(() => { stateRef.current = state; }, [state]);

  const setSourceRate = useCallback((rate: number) => {
    if (refs.current.sourceNode) {
      refs.current.sourceNode.playbackRate.value = Math.max(0.001, Math.abs(rate));
    }
  }, []);

  // --- Animation Loop ---
  const tick = useCallback(() => {
    const s = stateRef.current;
    const r = refs.current;
    const ts = tapeStopRef.current;
    const rocker = rockerRef.current;

    if (!r.audioContext) { rafRef.current = requestAnimationFrame(tick); return; }

    // Tape Stop Ramp
    if (ts.isActive && s.isLoaded) {
      const now = performance.now();
      const elapsed = now - ts.rampStartTime;
      const progress = clamp(elapsed / TAPE_STOP_DURATION, 0, 1);
      const rate = ts.rampStartRate * (1 - progress);
      setSourceRate(rate);
      const rotationDeg = ((s.currentTime * 360) % 360 + 360) % 360;
      setState(prev => ({ ...prev, playbackRate: rate, rotationDeg }));
      rafRef.current = requestAnimationFrame(tick); return;
    }

    // Momentum coasting (after scratch release)
    if (momentumRef.current !== 0 && !s.isScratchActive && !s.isPlaying) {
      momentumRef.current *= MOMENTUM_FRICTION;
      if (Math.abs(momentumRef.current) < 0.1) { momentumRef.current = 0; }
      else {
        const deltaDeg = momentumRef.current;
        const timeShift = (deltaDeg / 360) * 2;
        const newTime = clamp(s.currentTime + timeShift, 0, s.duration);
        const rotationDeg = ((s.rotationDeg + deltaDeg) % 360 + 360) % 360;
        refs.current.startOffset = newTime;
        setState(prev => ({ ...prev, rotationDeg, currentTime: newTime, progress: s.duration > 0 ? newTime / s.duration : 0 }));
      }
      rafRef.current = requestAnimationFrame(tick); return;
    }

    // Rocker FF/RW
    if (rocker.isHeld && rocker.direction && s.isLoaded && !s.isScratchActive) {
      const effectiveRate = Math.abs(rocker.speedLevel);
      setSourceRate(effectiveRate);
      const ctxElapsed = r.audioContext.currentTime - r.startTime;
      let currentTime = rocker.direction === 'rw'
        ? r.startOffset - (ctxElapsed * effectiveRate)
        : r.startOffset + ctxElapsed * effectiveRate;
      currentTime = clamp(currentTime, 0, s.duration);
      const speed = rocker.direction === 'ff' ? rocker.speedLevel : -rocker.speedLevel;
      const rotationDeg = ((currentTime * 360 * effectiveRate) % 360 + 360) % 360;
      setState(prev => ({ ...prev, currentTime, playbackRate: speed, rotationDeg, progress: s.duration > 0 ? currentTime / s.duration : 0 }));
      rafRef.current = requestAnimationFrame(tick); return;
    }

    // Normal Playback
    if (s.isPlaying && !s.isScratchActive) {
      const elapsed = r.audioContext.currentTime - r.startTime;
      let currentTime = r.startOffset + elapsed;
      if (s.isLooping && s.loopStart !== null && s.loopEnd !== null) {
        if (currentTime >= s.loopEnd) {
          const loopDuration = s.loopEnd - s.loopStart;
          currentTime = s.loopStart + ((currentTime - s.loopStart) % loopDuration);
        }
      } else if (currentTime >= s.duration) { stopPlayback(); return; }
      currentTime = clamp(currentTime, 0, s.duration);
      const rotationDeg = ((currentTime * 360) % 360 + 360) % 360;
      setState(prev => ({ ...prev, currentTime, rotationDeg, progress: s.duration > 0 ? currentTime / s.duration : 0 }));
    }

    // Recording reel spin
    if (s.isRecording) {
      setState(prev => ({ ...prev, rotationDeg: (prev.rotationDeg + 1.5) % 360 }));
    }

    // Idle breathing (subtle reel drift when nothing is happening)
    if (!s.isPlaying && !s.isRecording && !s.isScratchActive && momentumRef.current === 0 && s.isLoaded) {
      // Very subtle oscillation
      const t = performance.now() / 4000;
      const breathe = Math.sin(t) * 0.15;
      setState(prev => ({ ...prev, rotationDeg: (prev.rotationDeg + breathe + 360) % 360 }));
    }

    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const startLoop = useCallback(() => {
    if (rafRef.current === null) rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const stopLoop = useCallback(() => {
    if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
  }, []);

  // --- Audio Engine ---
  const ensureContext = useCallback(async (): Promise<AudioContext> => {
    if (!refs.current.audioContext) refs.current.audioContext = new AudioContext();
    if (refs.current.audioContext.state === 'suspended') await refs.current.audioContext.resume();
    return refs.current.audioContext;
  }, []);

  const disconnectSource = useCallback(() => {
    try { refs.current.sourceNode?.stop(); } catch { /* */ }
    try { refs.current.sourceNode?.disconnect(); } catch { /* */ }
    refs.current.sourceNode = null;
  }, []);

  const buildAudioChain = useCallback((ctx: AudioContext) => {
    if (!gainNodeRef.current) {
      gainNodeRef.current = ctx.createGain();
    }
    // Build tape effects chain: source -> saturator -> filter -> gain -> destination
    if (!tapeSaturatorRef.current) {
      tapeSaturatorRef.current = ctx.createWaveShaper();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (tapeSaturatorRef.current as any).curve = createTapeSaturationCurve(0.3);
      tapeSaturatorRef.current.oversample = '2x';
    }
    if (!tapeFilterRef.current) {
      tapeFilterRef.current = ctx.createBiquadFilter();
      tapeFilterRef.current.type = 'lowpass';
      tapeFilterRef.current.frequency.value = 12000;
      tapeFilterRef.current.Q.value = 0.5;
    }
    // Reconnect chain
    try { tapeSaturatorRef.current.disconnect(); } catch { /* */ }
    try { tapeFilterRef.current.disconnect(); } catch { /* */ }
    try { gainNodeRef.current.disconnect(); } catch { /* */ }

    if (stateRef.current.tapeEffectsEnabled) {
      tapeSaturatorRef.current.connect(tapeFilterRef.current);
      tapeFilterRef.current.connect(gainNodeRef.current);
    }
    gainNodeRef.current.connect(ctx.destination);
    gainNodeRef.current.gain.value = stateRef.current.volume;
  }, []);

  const createAndStartSource = useCallback((offset: number, rate: number = 1.0) => {
    const r = refs.current;
    if (!r.audioBuffer || !r.audioContext) return;
    buildAudioChain(r.audioContext);

    const source = r.audioContext.createBufferSource();
    source.buffer = r.audioBuffer;

    // Connect to appropriate chain
    if (stateRef.current.tapeEffectsEnabled && tapeSaturatorRef.current) {
      source.connect(tapeSaturatorRef.current);
    } else {
      source.connect(gainNodeRef.current!);
    }

    source.playbackRate.value = Math.max(0.001, rate);
    const s = stateRef.current;
    if (s.isLooping && s.loopStart !== null && s.loopEnd !== null) {
      source.loop = true; source.loopStart = s.loopStart; source.loopEnd = s.loopEnd;
    }
    source.start(0, offset);
    r.sourceNode = source; r.startTime = r.audioContext.currentTime; r.startOffset = offset;
  }, [buildAudioChain]);

  // --- Transport ---
  const play = useCallback(async () => {
    const s = stateRef.current;
    if (s.isRecording || !s.isLoaded || s.isPlaying || s.isScratchActive) return;
    if (!refs.current.audioBuffer) return;
    // Ensure AudioContext exists (first user gesture creates it)
    await ensureContext();
    momentumRef.current = 0;
    createAndStartSource(refs.current.startOffset, 1.0);
    setState(prev => ({ ...prev, isPlaying: true, playbackRate: 1.0, error: null }));
    startLoop();
  }, [ensureContext, createAndStartSource, startLoop]);

  const pause = useCallback(() => {
    const s = stateRef.current;
    if (!s.isPlaying) return;
    if (refs.current.audioContext) {
      const elapsed = refs.current.audioContext.currentTime - refs.current.startTime;
      refs.current.startOffset = clamp(refs.current.startOffset + elapsed, 0, s.duration);
    }
    disconnectSource(); stopLoop();
    setState(prev => ({ ...prev, isPlaying: false }));
  }, [disconnectSource, stopLoop]);

  const stopPlayback = useCallback(() => {
    disconnectSource(); stopLoop(); refs.current.startOffset = 0; momentumRef.current = 0;
    setState(prev => ({ ...prev, isPlaying: false, currentTime: 0, rotationDeg: 0, playbackRate: 1.0, isTapeStopped: false, rockerSpeed: 0, progress: 0 }));
  }, [disconnectSource, stopLoop]);

  const stop = useCallback(() => {
    const s = stateRef.current;
    if (s.isRecording) { stopRecordingInternal(); return; }
    if (!s.isLoaded) return;
    stopPlayback();
  }, []);

  const skipForward = useCallback(() => {
    const s = stateRef.current;
    if (!s.isLoaded) return;
    const newTime = clamp(s.currentTime + SKIP_SECONDS, 0, s.duration);
    refs.current.startOffset = newTime;
    if (s.isPlaying) { disconnectSource(); createAndStartSource(newTime, 1.0); }
    setState(prev => ({ ...prev, currentTime: newTime, progress: s.duration > 0 ? newTime / s.duration : 0 }));
  }, [disconnectSource, createAndStartSource]);

  const skipBackward = useCallback(() => {
    const s = stateRef.current;
    if (!s.isLoaded) return;
    const newTime = clamp(s.currentTime - SKIP_SECONDS, 0, s.duration);
    refs.current.startOffset = newTime;
    if (s.isPlaying) { disconnectSource(); createAndStartSource(newTime, 1.0); }
    setState(prev => ({ ...prev, currentTime: newTime, progress: s.duration > 0 ? newTime / s.duration : 0 }));
  }, [disconnectSource, createAndStartSource]);

  // --- Recording ---
  const record = useCallback(async () => {
    const s = stateRef.current;
    if (s.isRecording) return;
    if (s.isPlaying) { disconnectSource(); stopLoop(); }
    try {
      await ensureContext();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm',
      });
      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      recordingRef.current = { mediaStream: stream, mediaRecorder, chunks, startTime: performance.now(),
        timerInterval: window.setInterval(() => {
          const elapsed = (performance.now() - recordingRef.current.startTime) / 1000;
          setState(prev => ({ ...prev, recordingTime: elapsed }));
        }, 50),
      };
      mediaRecorder.start(100);
      setState(prev => ({ ...prev, isRecording: true, isPlaying: false, recordingTime: 0, error: null }));
      startLoop();
    } catch { setState(prev => ({ ...prev, error: 'Microphone access denied.' })); }
  }, [ensureContext, disconnectSource, stopLoop, startLoop]);

  const stopRecordingInternal = useCallback(async () => {
    const rec = recordingRef.current;
    if (!rec.mediaRecorder || rec.mediaRecorder.state === 'inactive') return;
    return new Promise<void>((resolve) => {
      rec.mediaRecorder!.onstop = async () => {
        if (rec.timerInterval !== null) { clearInterval(rec.timerInterval); rec.timerInterval = null; }
        rec.mediaStream?.getTracks().forEach(track => track.stop());
        const blob = new Blob(rec.chunks, { type: rec.mediaRecorder!.mimeType });
        try {
          const ctx = refs.current.audioContext!;
          const arrayBuffer = await blob.arrayBuffer();
          const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
          refs.current.audioBuffer = audioBuffer; refs.current.startOffset = 0; refs.current.sourceNode = null;
          const now = new Date();
          const fileName = `REC_${now.getHours().toString().padStart(2,'0')}${now.getMinutes().toString().padStart(2,'0')}${now.getSeconds().toString().padStart(2,'0')}`;
          const waveformData = extractWaveform(audioBuffer);
          const trackId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          const newTrack = { id: trackId, fileName, duration: audioBuffer.duration, waveformData };
          trackBuffersRef.current.push(audioBuffer);
          const newIndex = trackBuffersRef.current.length - 1;
          setState(prev => ({ ...prev, isRecording: false, isLoaded: true, isPlaying: false, fileName, duration: audioBuffer.duration, currentTime: 0, rotationDeg: 0, playbackRate: 1.0, recordingTime: 0, waveformData, progress: 0, tracks: [...prev.tracks, newTrack], activeTrackIndex: newIndex }));
        } catch { setState(prev => ({ ...prev, isRecording: false, recordingTime: 0, error: 'Failed to process recording.' })); }
        recordingRef.current = { ...INITIAL_RECORDING }; resolve();
      };
      rec.mediaRecorder!.stop();
    });
  }, []);

  const stopRecording = useCallback(() => { stopRecordingInternal(); stopLoop(); }, [stopRecordingInternal, stopLoop]);

  const exportRecording = useCallback(() => {
    const buffer = refs.current.audioBuffer;
    if (!buffer) return;
    // Don't allow exporting the demo track
    if (stateRef.current.fileName === 'Demo Track') return;
    // Convert AudioBuffer to WAV
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const length = buffer.length * numChannels * 2 + 44;
    const out = new ArrayBuffer(length);
    const view = new DataView(out);
    const writeStr = (offset: number, str: string) => { for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i)); };
    writeStr(0, 'RIFF'); view.setUint32(4, length - 8, true); writeStr(8, 'WAVE');
    writeStr(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true); view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * 2, true); view.setUint16(32, numChannels * 2, true);
    view.setUint16(34, 16, true); writeStr(36, 'data'); view.setUint32(40, length - 44, true);
    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      for (let ch = 0; ch < numChannels; ch++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }
    }
    const blob = new Blob([out], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `${stateRef.current.fileName || 'recording'}.wav`;
    a.click(); URL.revokeObjectURL(url);
  }, []);

  // --- File Loading ---
  const loadFile = useCallback(async (file: File): Promise<void> => {
    if (stateRef.current.isRecording) return;
    if (!file.type.startsWith('audio/')) { setState(prev => ({ ...prev, error: 'Invalid file type.' })); return; }
    try {
      const ctx = await ensureContext();
      if (stateRef.current.isPlaying) { disconnectSource(); stopLoop(); }
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      const waveformData = extractWaveform(audioBuffer);
      const trackId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const newTrack = { id: trackId, fileName: file.name, duration: audioBuffer.duration, waveformData };

      // Add buffer to storage
      trackBuffersRef.current.push(audioBuffer);
      const newIndex = trackBuffersRef.current.length - 1;

      // Set as active
      refs.current.audioBuffer = audioBuffer; refs.current.startOffset = 0; refs.current.sourceNode = null;
      setState(prev => ({
        ...prev,
        isLoaded: true, isPlaying: false, fileName: file.name, duration: audioBuffer.duration,
        currentTime: 0, rotationDeg: 0, playbackRate: 1.0, waveformData, progress: 0, error: null,
        tracks: [...prev.tracks, newTrack], activeTrackIndex: newIndex,
        isLooping: false, loopStart: null, loopEnd: null,
      }));
      startLoop();
    } catch { setState(prev => ({ ...prev, error: 'Failed to decode audio file.' })); }
  }, [ensureContext, disconnectSource, stopLoop, startLoop]);

  // --- Load from ArrayBuffer (for SoundCloud etc) ---
  const loadFromBuffer = useCallback(async (arrayBuffer: ArrayBuffer, fileName: string): Promise<void> => {
    if (stateRef.current.isRecording) return;
    try {
      const ctx = await ensureContext();
      if (stateRef.current.isPlaying) { disconnectSource(); stopLoop(); }
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      const waveformData = extractWaveform(audioBuffer);
      const trackId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const newTrack = { id: trackId, fileName, duration: audioBuffer.duration, waveformData };
      trackBuffersRef.current.push(audioBuffer);
      const newIndex = trackBuffersRef.current.length - 1;
      refs.current.audioBuffer = audioBuffer; refs.current.startOffset = 0; refs.current.sourceNode = null;
      setState(prev => ({
        ...prev, isLoaded: true, isPlaying: false, fileName, duration: audioBuffer.duration,
        currentTime: 0, rotationDeg: 0, playbackRate: 1.0, waveformData, progress: 0, error: null,
        tracks: [...prev.tracks, newTrack], activeTrackIndex: newIndex,
        isLooping: false, loopStart: null, loopEnd: null,
      }));
      startLoop();
    } catch { setState(prev => ({ ...prev, error: 'Failed to decode audio.' })); }
  }, [ensureContext, disconnectSource, stopLoop, startLoop]);

  // --- Load Demo Track ---
  const loadDemoTrack = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch('/demo.mp3');
      if (!res.ok) return;
      const arrayBuffer = await res.arrayBuffer();

      // Use OfflineAudioContext for decoding — doesn't require user gesture
      const tempCtx = new OfflineAudioContext(2, 1, 44100);
      const audioBuffer = await tempCtx.decodeAudioData(arrayBuffer);

      const waveformData = extractWaveform(audioBuffer);
      const trackId = `demo-${Date.now()}`;
      const fileName = 'Demo Track';
      const newTrack = { id: trackId, fileName, duration: audioBuffer.duration, waveformData };
      trackBuffersRef.current.push(audioBuffer);
      const newIndex = trackBuffersRef.current.length - 1;
      refs.current.audioBuffer = audioBuffer; refs.current.startOffset = 0; refs.current.sourceNode = null;
      setState(prev => ({
        ...prev, isLoaded: true, isPlaying: false, fileName, duration: audioBuffer.duration,
        currentTime: 0, rotationDeg: 0, playbackRate: 1.0, waveformData, progress: 0, error: null,
        tracks: [...prev.tracks, newTrack], activeTrackIndex: newIndex,
      }));
      startLoop();
    } catch { /* Demo track not available — silent fail */ }
  }, [startLoop]);

  // --- Tape Stop ---
  const onTapeStopStart = useCallback(() => {
    const s = stateRef.current;
    if (!s.isLoaded || !s.isPlaying) return;
    tapeStopRef.current = { isActive: true, wasPlayingBefore: true, rampStartTime: performance.now(), rampStartRate: s.playbackRate || 1.0 };
    setState(prev => ({ ...prev, isTapeStopped: true }));
  }, []);

  const onTapeStopEnd = useCallback(() => {
    const ts = tapeStopRef.current;
    if (!ts.isActive) return;
    ts.isActive = false;
    const s = stateRef.current;
    if (ts.wasPlayingBefore && s.isLoaded) {
      if (refs.current.audioContext) {
        const elapsed = refs.current.audioContext.currentTime - refs.current.startTime;
        refs.current.startOffset = clamp(refs.current.startOffset + elapsed * Math.max(0.001, s.playbackRate), 0, s.duration);
      }
      disconnectSource(); createAndStartSource(refs.current.startOffset, 1.0);
      setState(prev => ({ ...prev, isTapeStopped: false, playbackRate: 1.0, isPlaying: true }));
    } else { setState(prev => ({ ...prev, isTapeStopped: false })); }
  }, [disconnectSource, createAndStartSource]);

  // --- Rocker ---
  const onRockerPress = useCallback((direction: 'ff' | 'rw') => {
    const s = stateRef.current;
    if (!s.isLoaded || s.isRecording) return;
    const rocker = rockerRef.current;
    let newLevel = rocker.speedLevel;
    if (rocker.direction === direction && rocker.isHeld) { if (newLevel < 8) newLevel = newLevel === 0 ? 2 : newLevel * 2; }
    else { newLevel = 2; }
    rockerRef.current = { isHeld: true, direction, speedLevel: newLevel };
    if (s.isPlaying && refs.current.audioContext) {
      const elapsed = refs.current.audioContext.currentTime - refs.current.startTime;
      refs.current.startOffset = clamp(refs.current.startOffset + elapsed, 0, s.duration);
      disconnectSource(); createAndStartSource(refs.current.startOffset, newLevel);
    } else if (!s.isPlaying) { createAndStartSource(refs.current.startOffset, newLevel); setState(prev => ({ ...prev, isPlaying: true })); }
    const speed = direction === 'ff' ? newLevel : -newLevel;
    setState(prev => ({ ...prev, rockerSpeed: speed, isRockerHeld: true })); startLoop();
  }, [disconnectSource, createAndStartSource, startLoop]);

  const onRockerRelease = useCallback(() => {
    const rocker = rockerRef.current;
    if (!rocker.isHeld) return;
    const s = stateRef.current;
    if (refs.current.audioContext && s.isPlaying) {
      const elapsed = refs.current.audioContext.currentTime - refs.current.startTime;
      refs.current.startOffset = clamp(refs.current.startOffset + elapsed * rocker.speedLevel, 0, s.duration);
    }
    rockerRef.current = { ...INITIAL_ROCKER };
    if (s.isPlaying) { disconnectSource(); createAndStartSource(refs.current.startOffset, 1.0); setState(prev => ({ ...prev, rockerSpeed: 0, isRockerHeld: false, playbackRate: 1.0 })); }
    else { setState(prev => ({ ...prev, rockerSpeed: 0, isRockerHeld: false })); }
  }, [disconnectSource, createAndStartSource]);

  // --- Scratch with momentum and audible scrub ---
  const onScratchStart = useCallback((e: React.PointerEvent, reelCenter: Point) => {
    const s = stateRef.current;
    if (!s.isLoaded || e.button !== 0 || s.isRecording) return;
    momentumRef.current = 0;
    const wasPlaying = s.isPlaying;
    if (wasPlaying) {
      if (refs.current.audioContext) { const elapsed = refs.current.audioContext.currentTime - refs.current.startTime; refs.current.startOffset = clamp(refs.current.startOffset + elapsed, 0, s.duration); }
      disconnectSource();
    }
    const dx = e.clientX - reelCenter.x; const dy = e.clientY - reelCenter.y;
    const angle = Math.atan2(dy, dx);
    scratchRef.current = { isActive: true, startAngle: angle, lastAngle: angle, lastTimestamp: e.timeStamp, velocity: 0, accumulatedRotation: 0, wasPlayingBeforeScratch: wasPlaying };
    reelElRef.current = e.currentTarget as HTMLElement;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    // Start a source node for audible scratching
    if (refs.current.audioBuffer && refs.current.audioContext) {
      createAndStartSource(refs.current.startOffset, 0.001);
    }

    setState(prev => ({ ...prev, isPlaying: false, isScratchActive: true })); startLoop();
  }, [disconnectSource, startLoop, createAndStartSource]);

  const onScratchMove = useCallback((e: React.PointerEvent, reelCenter: Point) => {
    const scratch = scratchRef.current;
    if (!scratch.isActive) return;
    const dx = e.clientX - reelCenter.x; const dy = e.clientY - reelCenter.y;
    const currentAngle = Math.atan2(dy, dx);
    let deltaAngle = currentAngle - scratch.lastAngle;
    if (deltaAngle > Math.PI) deltaAngle -= 2 * Math.PI;
    if (deltaAngle < -Math.PI) deltaAngle += 2 * Math.PI;
    const deltaTime = (e.timeStamp - scratch.lastTimestamp) / 1000;
    let velocity = scratch.velocity;
    if (deltaTime > 0.001) { velocity = 0.3 * (deltaAngle / deltaTime) + 0.7 * scratch.velocity; }
    const playbackRate = clamp(velocity / (2 * Math.PI), -4.0, 4.0);
    const deltaDeg = (deltaAngle * 180) / Math.PI;
    scratch.accumulatedRotation += deltaDeg;
    const s = stateRef.current;
    const scrubMultiplier = rockerRef.current.isHeld ? rockerRef.current.speedLevel : 1;
    const newTime = clamp(refs.current.startOffset + (scratch.accumulatedRotation / 360) * 2 * scrubMultiplier, 0, s.duration);
    scratch.lastAngle = currentAngle; scratch.lastTimestamp = e.timeStamp; scratch.velocity = velocity;
    const rotationDeg = ((s.rotationDeg + deltaDeg) % 360 + 360) % 360;

    // Update audio playback rate for audible scratch effect
    // Web Audio playbackRate must be > 0, so for forward motion we set the rate,
    // for backward/still we set near-zero (muted scrub)
    if (refs.current.sourceNode) {
      const absRate = Math.abs(playbackRate);
      if (absRate > 0.05) {
        refs.current.sourceNode.playbackRate.value = clamp(absRate * 2, 0.1, 8.0);
      } else {
        refs.current.sourceNode.playbackRate.value = 0.001; // effectively silent
      }
    }

    setState(prev => ({ ...prev, rotationDeg, playbackRate, currentTime: newTime, isComboScrubbing: rockerRef.current.isHeld, progress: s.duration > 0 ? newTime / s.duration : 0 }));
  }, []);

  const onScratchEnd = useCallback(() => {
    const scratch = scratchRef.current;
    if (!scratch.isActive) return;
    if (reelElRef.current) { try { reelElRef.current.releasePointerCapture(0); } catch { /* */ } reelElRef.current = null; }
    const s = stateRef.current;
    refs.current.startOffset = clamp(s.currentTime, 0, s.duration);

    // Stop the scratch source
    disconnectSource();

    // Apply momentum from release velocity
    const releaseDeg = (scratch.velocity / (2 * Math.PI)) * 30;
    momentumRef.current = clamp(releaseDeg, -20, 20);
    scratch.isActive = false; scratch.velocity = 0;
    setState(prev => ({ ...prev, isScratchActive: false, playbackRate: 1.0, isComboScrubbing: false }));
    if (scratch.wasPlayingBeforeScratch) { setTimeout(() => { play(); }, 0); }
    // Don't stop loop — momentum needs it running
  }, [play, disconnectSource]);

  // --- Volume ---
  const volumeUp = useCallback(() => { setState(prev => { const v = clamp(prev.volume + 0.1, 0, 1); if (gainNodeRef.current) gainNodeRef.current.gain.value = v; return { ...prev, volume: v }; }); }, []);
  const volumeDown = useCallback(() => { setState(prev => { const v = clamp(prev.volume - 0.1, 0, 1); if (gainNodeRef.current) gainNodeRef.current.gain.value = v; return { ...prev, volume: v }; }); }, []);
  const setVolume = useCallback((v: number) => { const nv = clamp(v, 0, 1); if (gainNodeRef.current) gainNodeRef.current.gain.value = nv; setState(prev => ({ ...prev, volume: nv })); }, []);

  // --- Display Mode ---
  const cycleDisplayMode = useCallback(() => {
    setState(prev => { const modes: Array<'time'|'remaining'|'percent'> = ['time','remaining','percent']; return { ...prev, displayMode: modes[(modes.indexOf(prev.displayMode) + 1) % 3] }; });
  }, []);

  // --- Loop ---
  const toggleLoop = useCallback(() => {
    const s = stateRef.current; if (!s.isLoaded) return;
    if (s.isLooping) { setState(prev => ({ ...prev, isLooping: false, loopStart: null, loopEnd: null })); if (refs.current.sourceNode) refs.current.sourceNode.loop = false; }
    else { const ls = s.currentTime; const le = s.duration; setState(prev => ({ ...prev, isLooping: true, loopStart: ls, loopEnd: le })); if (refs.current.sourceNode) { refs.current.sourceNode.loop = true; refs.current.sourceNode.loopStart = ls; refs.current.sourceNode.loopEnd = le; } }
  }, []);

  // --- Tape Effects Toggle ---
  const toggleTapeEffects = useCallback(() => {
    const s = stateRef.current;
    const enabled = !s.tapeEffectsEnabled;

    if (refs.current.sourceNode && refs.current.audioContext) {
      const ctx = refs.current.audioContext;

      // Ensure nodes exist
      if (!gainNodeRef.current) { gainNodeRef.current = ctx.createGain(); }
      if (!tapeSaturatorRef.current) {
        tapeSaturatorRef.current = ctx.createWaveShaper();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (tapeSaturatorRef.current as any).curve = createTapeSaturationCurve(0.3);
        tapeSaturatorRef.current.oversample = '2x';
      }
      if (!tapeFilterRef.current) {
        tapeFilterRef.current = ctx.createBiquadFilter();
        tapeFilterRef.current.type = 'lowpass';
        tapeFilterRef.current.frequency.value = 12000;
        tapeFilterRef.current.Q.value = 0.5;
      }

      // Disconnect everything
      try { refs.current.sourceNode.disconnect(); } catch { /* */ }
      try { tapeSaturatorRef.current.disconnect(); } catch { /* */ }
      try { tapeFilterRef.current.disconnect(); } catch { /* */ }
      try { gainNodeRef.current.disconnect(); } catch { /* */ }

      // Rebuild chain with the NEW enabled state
      if (enabled) {
        refs.current.sourceNode.connect(tapeSaturatorRef.current);
        tapeSaturatorRef.current.connect(tapeFilterRef.current);
        tapeFilterRef.current.connect(gainNodeRef.current);
      } else {
        refs.current.sourceNode.connect(gainNodeRef.current);
      }
      gainNodeRef.current.connect(ctx.destination);
      gainNodeRef.current.gain.value = s.volume;
    }

    setState(prev => ({ ...prev, tapeEffectsEnabled: enabled }));
  }, []);

  // --- Dark Mode ---
  const toggleDarkMode = useCallback(() => {
    setState(prev => {
      const dm = !prev.darkMode;
      document.documentElement.setAttribute('data-theme', dm ? 'dark' : 'light');
      return { ...prev, darkMode: dm };
    });
  }, []);

  // --- Keyboard Shortcuts ---
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.code) {
        case 'Space': e.preventDefault(); stateRef.current.isPlaying ? pause() : play(); break;
        case 'ArrowRight': e.preventDefault(); skipForward(); break;
        case 'ArrowLeft': e.preventDefault(); skipBackward(); break;
        case 'ArrowUp': e.preventDefault(); volumeUp(); break;
        case 'ArrowDown': e.preventDefault(); volumeDown(); break;
        case 'KeyR': if (!e.metaKey && !e.ctrlKey) { e.preventDefault(); stateRef.current.isRecording ? stop() : record(); } break;
        case 'KeyL': e.preventDefault(); toggleLoop(); break;
        case 'KeyD': e.preventDefault(); toggleDarkMode(); break;
        case 'KeyT': e.preventDefault(); toggleTapeEffects(); break;
        case 'KeyE': e.preventDefault(); exportRecording(); break;
        case 'KeyM': e.preventDefault(); cycleDisplayMode(); break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [play, pause, stop, record, skipForward, skipBackward, volumeUp, volumeDown, toggleLoop, toggleDarkMode, toggleTapeEffects, exportRecording, cycleDisplayMode]);

  // --- Track Management ---
  const selectTrack = useCallback((index: number) => {
    const s = stateRef.current;
    if (index < 0 || index >= s.tracks.length) return;
    if (s.isPlaying) { disconnectSource(); stopLoop(); }
    const buffer = trackBuffersRef.current[index];
    if (!buffer) return;
    refs.current.audioBuffer = buffer; refs.current.startOffset = 0; refs.current.sourceNode = null;
    const track = s.tracks[index];
    setState(prev => ({
      ...prev, isPlaying: false, fileName: track.fileName, duration: track.duration,
      currentTime: 0, rotationDeg: 0, playbackRate: 1.0, waveformData: track.waveformData,
      progress: 0, activeTrackIndex: index, isLooping: false, loopStart: null, loopEnd: null, isLoaded: true,
    }));
  }, [disconnectSource, stopLoop]);

  const removeTrack = useCallback((index: number) => {
    const s = stateRef.current;
    if (index < 0 || index >= s.tracks.length) return;
    // If removing the active track, stop playback
    if (index === s.activeTrackIndex) {
      if (s.isPlaying) { disconnectSource(); stopLoop(); }
      refs.current.audioBuffer = null; refs.current.sourceNode = null;
    }
    trackBuffersRef.current.splice(index, 1);
    const newTracks = [...s.tracks]; newTracks.splice(index, 1);
    let newActive = s.activeTrackIndex;
    if (newTracks.length === 0) {
      newActive = -1;
      setState(prev => ({ ...prev, ...INITIAL_STATE, darkMode: prev.darkMode, tapeEffectsEnabled: prev.tapeEffectsEnabled, volume: prev.volume, tracks: [], activeTrackIndex: -1 }));
    } else {
      if (index === s.activeTrackIndex) { newActive = Math.min(index, newTracks.length - 1); }
      else if (index < s.activeTrackIndex) { newActive = s.activeTrackIndex - 1; }
      setState(prev => ({ ...prev, tracks: newTracks, activeTrackIndex: newActive }));
      if (index === s.activeTrackIndex) { selectTrack(newActive); }
    }
  }, [disconnectSource, stopLoop, selectTrack]);

  const nextTrack = useCallback(() => {
    const s = stateRef.current;
    if (s.tracks.length <= 1) return;
    const next = (s.activeTrackIndex + 1) % s.tracks.length;
    selectTrack(next);
  }, [selectTrack]);

  const prevTrack = useCallback(() => {
    const s = stateRef.current;
    if (s.tracks.length <= 1) return;
    const prev = (s.activeTrackIndex - 1 + s.tracks.length) % s.tracks.length;
    selectTrack(prev);
  }, [selectTrack]);

  // --- Cleanup ---
  useEffect(() => {
    return () => {
      stopLoop(); disconnectSource();
      if (recordingRef.current.mediaRecorder?.state === 'recording') recordingRef.current.mediaRecorder.stop();
      recordingRef.current.mediaStream?.getTracks().forEach(t => t.stop());
      if (recordingRef.current.timerInterval !== null) clearInterval(recordingRef.current.timerInterval);
      refs.current.audioContext?.close();
    };
  }, [stopLoop, disconnectSource]);

  // Start idle loop on mount
  useEffect(() => { startLoop(); }, [startLoop]);

  return {
    state, play, pause, stop, record, stopRecording, exportRecording, loadFile,
    onScratchStart, onScratchMove, onScratchEnd, onTapeStopStart, onTapeStopEnd,
    onRockerPress, onRockerRelease, volumeUp, volumeDown, setVolume,
    cycleDisplayMode, toggleLoop, toggleTapeEffects, toggleDarkMode, skipForward, skipBackward,
    selectTrack, removeTrack, nextTrack, prevTrack, loadFromBuffer, loadDemoTrack,
  };
}
