import { useRef, useState, useCallback, useEffect } from 'react';
import { useTapeMotor } from '../hooks/useTapeMotor';
import { ReelSVG } from './ReelSVG';
import { TransportControls } from './TransportControls';
import { DisplayPanel } from './DisplayPanel';
import { SideRocker } from './SideRocker';
import { IOPorts } from './IOPorts';
import { TrackList } from './TrackList';
import { Point } from '../types';

export function TP7Player() {
  const motor = useTapeMotor();
  const reelRef = useRef<SVGSVGElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const deviceRef = useRef<HTMLDivElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [assembled, setAssembled] = useState(false);
  const [booted, setBooted] = useState(false);
  const [tiltStyle, setTiltStyle] = useState<React.CSSProperties>({});

  // Auto-load demo track
  const demoLoadedRef = useRef(false);
  useEffect(() => {
    if (!demoLoadedRef.current) {
      demoLoadedRef.current = true;
      motor.loadDemoTrack();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Assembly → boot sequence
  useEffect(() => {
    const assemblyTimer = setTimeout(() => setAssembled(true), 2200);
    const bootTimer = setTimeout(() => setBooted(true), 3000);
    return () => { clearTimeout(assemblyTimer); clearTimeout(bootTimer); };
  }, []);

  // Parallax tilt on mouse move
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!assembled || !deviceRef.current) return;
    const rect = deviceRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 to 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTiltStyle({
      transform: `perspective(1200px) rotateY(${x * 4}deg) rotateX(${-y * 3}deg)`,
      transition: 'transform 0.1s ease-out',
    });
  }, [assembled]);

  const handleMouseLeave = useCallback(() => {
    setTiltStyle({
      transform: 'perspective(1200px) rotateY(0deg) rotateX(0deg)',
      transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
    });
  }, []);

  const getReelCenter = useCallback((): Point => {
    if (!reelRef.current) return { x: 0, y: 0 };
    const rect = reelRef.current.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); }, []);
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    for (const file of files) {
      if (file.type.startsWith('audio/')) await motor.loadFile(file);
    }
  }, [motor]);

  const handleRecord = useCallback(() => {
    motor.state.isRecording ? motor.stopRecording() : motor.record();
  }, [motor]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      if (file.type.startsWith('audio/')) await motor.loadFile(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [motor]);

  return (
    <div className={`tp7-wrapper ${motor.state.darkMode ? 'dark-mode' : ''} ${assembled ? 'assembled' : 'assembling'}`}>
      <div className="tp7-device-wrap" ref={deviceRef}
        onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave} style={tiltStyle}>
        <div className="tp7-device">

        <div className="anim-rocker">
          <SideRocker isLoaded={motor.state.isLoaded} rockerSpeed={motor.state.rockerSpeed}
            onRockerPress={(dir) => motor.onRockerPress(dir)} onRockerRelease={() => motor.onRockerRelease()} />
        </div>

        <div className={`anim-chassis tp7-chassis ${isDragOver ? 'drag-over' : ''} ${motor.state.isRecording ? 'recording' : ''}`}
          onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>

          <div className="anim-upper tp7-upper">
            <div className="tp7-upper-left">
              <span className="tp7-model">TP-7</span>
              <div className="tp7-mic-hole" />
            </div>
            <div className="anim-oled">
              <DisplayPanel currentTime={motor.state.currentTime} duration={motor.state.duration}
                playbackRate={motor.state.playbackRate} fileName={motor.state.fileName}
                isLoaded={motor.state.isLoaded} error={motor.state.error}
                isRockerHeld={motor.state.isRockerHeld} isTapeStopped={motor.state.isTapeStopped}
                isRecording={motor.state.isRecording} recordingTime={motor.state.recordingTime}
                displayMode={motor.state.displayMode} volume={motor.state.volume}
                isLooping={motor.state.isLooping} tapeEffects={motor.state.tapeEffectsEnabled}
                booted={booted} />
            </div>
          </div>

          <div className="anim-reel tp7-reel-section">
            {/* Spark effect on reel snap */}
            <div className="reel-spark" />
            <ReelSVG ref={reelRef} rotationDeg={motor.state.rotationDeg}
              isSpinning={motor.state.isPlaying || motor.state.isRecording}
              isScratchActive={motor.state.isScratchActive} isTapeStopped={motor.state.isTapeStopped}
              waveformData={motor.state.waveformData} progress={motor.state.progress}
              onScratchStart={(e) => motor.onScratchStart(e, getReelCenter())}
              onScratchMove={(e) => motor.onScratchMove(e, getReelCenter())}
              onScratchEnd={() => motor.onScratchEnd()}
              onTapeStopStart={() => motor.onTapeStopStart()} onTapeStopEnd={() => motor.onTapeStopEnd()} />
          </div>

          <div className="anim-transport tp7-lower">
            <TransportControls isPlaying={motor.state.isPlaying} isLoaded={motor.state.isLoaded}
              isRecording={motor.state.isRecording} isLooping={motor.state.isLooping}
              onPlay={() => motor.play()} onPause={() => motor.pause()}
              onStop={() => motor.stop()} onRecord={handleRecord} onToggleLoop={() => motor.toggleLoop()} />
          </div>

          {!motor.state.isLoaded && !isDragOver && !motor.state.isRecording && <div className="drop-hint">Drop audio files · or press R to record</div>}
          {isDragOver && <div className="drop-active">Release to load</div>}
        </div>

        <div className="anim-ports">
          <IOPorts volume={motor.state.volume} isLoaded={motor.state.isLoaded}
            onVolumeUp={() => motor.volumeUp()} onVolumeDown={() => motor.volumeDown()}
            onSetVolume={(v) => motor.setVolume(v)} onCycleDisplayMode={() => motor.cycleDisplayMode()}
            onToggleDarkMode={() => motor.toggleDarkMode()} onToggleTapeEffects={() => motor.toggleTapeEffects()}
            onExport={() => motor.exportRecording()} tapeEffects={motor.state.tapeEffectsEnabled}
            darkMode={motor.state.darkMode} />
        </div>

      </div>
      </div>

      <div className="anim-below">
        <TrackList tracks={motor.state.tracks} activeTrackIndex={motor.state.activeTrackIndex}
          onSelectTrack={(i) => motor.selectTrack(i)} onRemoveTrack={(i) => motor.removeTrack(i)}
          isPlaying={motor.state.isPlaying} />
        <button className="add-media-btn" onClick={() => fileInputRef.current?.click()}>
          <svg viewBox="0 0 20 20" width="16" height="16"><path d="M10 3v14M3 10h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          <span>Add Audio Files</span>
        </button>
        <input ref={fileInputRef} type="file" accept="audio/*" multiple onChange={handleFileSelect} style={{ display: 'none' }} />
        <div className="sc-coming-soon"><span className="sc-logo">☁</span><span>SoundCloud</span><span className="sc-soon-badge">Coming Soon</span></div>
      </div>
    </div>
  );
}
