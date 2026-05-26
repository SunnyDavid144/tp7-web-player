interface DisplayPanelProps {
  currentTime: number; duration: number; playbackRate: number; fileName: string | null;
  isLoaded: boolean; error: string | null; isRockerHeld: boolean; isTapeStopped: boolean;
  isRecording: boolean; recordingTime: number; displayMode: 'time' | 'remaining' | 'percent';
  volume: number; isLooping: boolean; tapeEffects: boolean;
}

function formatTime(seconds: number): string {
  const s = Math.abs(seconds);
  const mins = Math.floor(s / 60), secs = Math.floor(s % 60), ms = Math.floor((s % 1) * 100);
  const sign = seconds < 0 ? '-' : '';
  return `${sign}${mins}.${secs.toString().padStart(2,'0')}.${ms.toString().padStart(2,'0')}`;
}

export function DisplayPanel({ currentTime, duration, playbackRate, fileName, isLoaded, error, isRockerHeld, isTapeStopped, isRecording, recordingTime, displayMode, volume, isLooping, tapeEffects }: DisplayPanelProps) {
  let timeDisplay = '0.00.00';
  if (isLoaded) {
    if (displayMode === 'remaining') timeDisplay = formatTime(-(duration - currentTime));
    else if (displayMode === 'percent') timeDisplay = `${duration > 0 ? ((currentTime / duration) * 100).toFixed(1) : '0.0'}%`;
    else timeDisplay = formatTime(currentTime);
  }

  return (
    <div className="display-panel">
      <div className={`oled-screen ${isRecording ? 'oled-recording' : ''}`}>
        {error ? <div className="oled-error">{error}</div> : isRecording ? (
          <><div className="oled-title oled-rec-title"><span className="rec-indicator">●</span> REC</div>
          <div className="oled-bottom"><span className="oled-time oled-rec-time">{formatTime(recordingTime)}</span></div></>
        ) : (
          <><div className="oled-title">{isLoaded ? (fileName?.replace(/\.[^/.]+$/, '').toUpperCase() || 'TRACK') : 'TODAY'}</div>
          <div className="oled-bottom"><span className="oled-time">{timeDisplay}</span><span className="oled-track-num">{isLoaded ? '04' : '--'}</span></div>
          <div className="oled-status-line">
            {isTapeStopped && '■ '}{isRockerHeld && '▶▶ '}{isLooping && '⟳ '}{tapeEffects && '♪ '}
            {playbackRate !== 1.0 && !isTapeStopped && playbackRate !== 0 && `${Math.abs(playbackRate).toFixed(1)}× `}
            <span className="oled-vol">{'▮'.repeat(Math.round(volume * 5))}{'▯'.repeat(5 - Math.round(volume * 5))}</span>
          </div></>
        )}
      </div>
    </div>
  );
}
