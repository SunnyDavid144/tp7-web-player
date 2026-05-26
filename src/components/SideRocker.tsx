interface SideRockerProps {
  isLoaded: boolean;
  rockerSpeed: number;
  onRockerPress: (direction: 'ff' | 'rw') => void;
  onRockerRelease: () => void;
}

export function SideRocker({ isLoaded, rockerSpeed, onRockerPress, onRockerRelease }: SideRockerProps) {
  return (
    <div className={`side-rocker ${!isLoaded ? 'disabled' : ''}`}>
      {/* Top arrow */}
      <button
        className={`rocker-zone rocker-top ${rockerSpeed > 0 ? 'active' : ''}`}
        onPointerDown={() => isLoaded && onRockerPress('ff')}
        onPointerUp={onRockerRelease}
        onPointerLeave={onRockerRelease}
        disabled={!isLoaded}
        aria-label="Fast forward"
      >
        <svg viewBox="0 0 12 8" width="10" height="7" className="rocker-arrow">
          <polygon points="6,0 12,8 0,8" fill="currentColor" />
        </svg>
      </button>

      {/* Slider track */}
      <div className="rocker-track">
        <div className="rocker-thumb" />
      </div>

      {/* Bottom arrow */}
      <button
        className={`rocker-zone rocker-bottom ${rockerSpeed < 0 ? 'active' : ''}`}
        onPointerDown={() => isLoaded && onRockerPress('rw')}
        onPointerUp={onRockerRelease}
        onPointerLeave={onRockerRelease}
        disabled={!isLoaded}
        aria-label="Rewind"
      >
        <svg viewBox="0 0 12 8" width="10" height="7" className="rocker-arrow">
          <polygon points="6,8 0,0 12,0" fill="currentColor" />
        </svg>
      </button>

      {/* R▼ label */}
      <span className="rocker-label">R▼</span>
    </div>
  );
}
