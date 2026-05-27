import { useState, useCallback } from 'react';

interface SideRockerProps {
  isLoaded: boolean;
  rockerSpeed: number;
  onRockerPress: (direction: 'ff' | 'rw') => void;
  onRockerRelease: () => void;
}

export function SideRocker({ isLoaded, rockerSpeed, onRockerPress, onRockerRelease }: SideRockerProps) {
  const [tilt, setTilt] = useState<'up' | 'down' | null>(null);

  const handleTopDown = useCallback(() => {
    if (!isLoaded) return;
    setTilt('up');
    onRockerPress('ff');
  }, [isLoaded, onRockerPress]);

  const handleBottomDown = useCallback(() => {
    if (!isLoaded) return;
    setTilt('down');
    onRockerPress('rw');
  }, [isLoaded, onRockerPress]);

  const handleRelease = useCallback(() => {
    setTilt(null);
    onRockerRelease();
  }, [onRockerRelease]);

  // Tilt angle: -8deg for FF (top pressed), +8deg for RW (bottom pressed)
  const tiltAngle = tilt === 'up' ? -8 : tilt === 'down' ? 8 : 0;

  return (
    <div className={`side-rocker ${!isLoaded ? 'disabled' : ''}`}>
      {/* Top arrow */}
      <div className="rocker-arrow-zone">
        <svg viewBox="0 0 12 8" width="9" height="6" className="rocker-arrow-icon">
          <polygon points="6,0 12,8 0,8" fill="currentColor" />
        </svg>
      </div>

      {/* The lever — tilts like a seesaw */}
      <div className="rocker-lever-wrap">
        <div
          className={`rocker-lever ${tilt ? 'active' : ''}`}
          style={{ transform: `rotate(${tiltAngle}deg)` }}
        >
          {/* Top press zone */}
          <div
            className="rocker-lever-top"
            onPointerDown={handleTopDown}
            onPointerUp={handleRelease}
            onPointerLeave={handleRelease}
          />

          {/* Pivot point (center screw) */}
          <div className="rocker-pivot" />

          {/* Bottom press zone */}
          <div
            className="rocker-lever-bottom"
            onPointerDown={handleBottomDown}
            onPointerUp={handleRelease}
            onPointerLeave={handleRelease}
          />
        </div>
      </div>

      {/* Bottom arrow */}
      <div className="rocker-arrow-zone">
        <svg viewBox="0 0 12 8" width="9" height="6" className="rocker-arrow-icon">
          <polygon points="6,8 0,0 12,0" fill="currentColor" />
        </svg>
      </div>

      {/* Label */}
      <span className="rocker-label">R▼</span>

      {/* Speed indicator */}
      {rockerSpeed !== 0 && (
        <span className="rocker-speed-indicator">{Math.abs(rockerSpeed)}×</span>
      )}
    </div>
  );
}
