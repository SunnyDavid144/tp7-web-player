interface TransportControlsProps {
  isPlaying: boolean;
  isLoaded: boolean;
  isRecording: boolean;
  isLooping: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onRecord: () => void;
  onToggleLoop: () => void;
}

export function TransportControls({
  isPlaying,
  isLoaded,
  isRecording,
  isLooping,
  onPlay,
  onPause,
  onStop,
  onRecord,
  onToggleLoop,
}: TransportControlsProps) {
  return (
    <div className="transport-controls">
      {/* Record button */}
      <button
        className={`transport-btn record-btn ${isRecording ? 'recording' : ''}`}
        onClick={onRecord}
        disabled={isPlaying}
        aria-label={isRecording ? 'Recording...' : 'Record'}
      >
        <div className={`rec-dot ${isRecording ? 'pulsing' : ''}`} />
      </button>

      {/* Play / Pause */}
      <button
        className={`transport-btn play-btn ${isPlaying ? 'active' : ''}`}
        onClick={isPlaying ? onPause : onPlay}
        disabled={!isLoaded || isRecording}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <svg viewBox="0 0 24 24" width="14" height="14">
            <rect x="6" y="5" width="4" height="14" fill="currentColor" />
            <rect x="14" y="5" width="4" height="14" fill="currentColor" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="14" height="14">
            <polygon points="8,5 20,12 8,19" fill="currentColor" />
          </svg>
        )}
      </button>

      {/* Stop */}
      <button
        className="transport-btn stop-btn"
        onClick={onStop}
        disabled={!isLoaded && !isRecording}
        aria-label="Stop"
      >
        <svg viewBox="0 0 24 24" width="12" height="12">
          <rect x="6" y="6" width="12" height="12" fill="currentColor" />
        </svg>
      </button>

      {/* Loop toggle button */}
      <button
        className={`transport-btn loop-btn ${isLooping ? 'active' : ''}`}
        onClick={onToggleLoop}
        disabled={!isLoaded || isRecording}
        aria-label={isLooping ? 'Disable loop' : 'Enable loop'}
        title={isLooping ? 'Loop ON' : 'Loop OFF'}
      >
        <svg viewBox="0 0 24 24" width="14" height="14">
          {isLooping ? (
            /* Loop active icon — infinity-like */
            <path
              d="M4 12c0-2.2 1.8-4 4-4h2l-2-2M20 12c0 2.2-1.8 4-4 4h-2l2 2M8 16c-2.2 0-4-1.8-4-4M16 8c2.2 0 4 1.8 4 4"
              stroke="currentColor"
              strokeWidth="1.8"
              fill="none"
              strokeLinecap="round"
            />
          ) : (
            /* Crosshair — set loop point */
            <>
              <line x1="12" y1="4" x2="12" y2="20" stroke="currentColor" strokeWidth="1.5" />
              <line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="1.5" />
            </>
          )}
        </svg>
      </button>
    </div>
  );
}
