import { forwardRef, useCallback, useMemo } from 'react';

interface ReelSVGProps {
  rotationDeg: number;
  onScratchStart: (e: React.PointerEvent) => void;
  onScratchMove: (e: React.PointerEvent) => void;
  onScratchEnd: () => void;
  onTapeStopStart: () => void;
  onTapeStopEnd: () => void;
  isSpinning: boolean;
  isScratchActive: boolean;
  isTapeStopped: boolean;
  waveformData: number[];
  progress: number;
}

export const ReelSVG = forwardRef<SVGSVGElement, ReelSVGProps>(
  ({ rotationDeg, onScratchStart, onScratchMove, onScratchEnd, onTapeStopStart, onTapeStopEnd, isSpinning, isScratchActive, isTapeStopped, waveformData, progress }, ref) => {

    const handlePointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
      const svg = e.currentTarget;
      const rect = svg.getBoundingClientRect();
      const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
      const dist = Math.sqrt((e.clientX - cx) ** 2 + (e.clientY - cy) ** 2);
      // Both center and outer edge now trigger scratch (audible scrub)
      // Center also triggers tape-stop for the hold-without-drag case
      if (dist / (rect.width / 2) < 0.18) {
        onTapeStopStart();
        onScratchStart(e); // Also start scratch so dragging from center scrubs audio
      } else {
        onScratchStart(e);
      }
    }, [onScratchStart, onTapeStopStart]);

    const handlePointerUp = useCallback((_e: React.PointerEvent<SVGSVGElement>) => {
      onScratchEnd(); onTapeStopEnd();
    }, [onScratchEnd, onTapeStopEnd]);

    // Generate waveform path as radial lines
    const waveformPath = useMemo(() => {
      if (waveformData.length === 0) return null;
      const cx = 140, cy = 140, innerR = 38, outerR = 120;
      return waveformData.map((peak, i) => {
        const angle = (i / waveformData.length) * Math.PI * 2 - Math.PI / 2;
        const r1 = innerR + 10;
        const r2 = r1 + peak * (outerR - innerR - 20);
        const x1 = cx + r1 * Math.cos(angle), y1 = cy + r1 * Math.sin(angle);
        const x2 = cx + r2 * Math.cos(angle), y2 = cy + r2 * Math.sin(angle);
        return `M${x1},${y1}L${x2},${y2}`;
      }).join(' ');
    }, [waveformData]);

    // Progress arc
    const progressArc = useMemo(() => {
      if (progress <= 0) return '';
      const cx = 140, cy = 140, r = 133;
      const angle = progress * Math.PI * 2 - Math.PI / 2;
      const x = cx + r * Math.cos(angle), y = cy + r * Math.sin(angle);
      const largeArc = progress > 0.5 ? 1 : 0;
      return `M${cx},${cy - r} A${r},${r} 0 ${largeArc} 1 ${x},${y}`;
    }, [progress]);

    return (
      <div className="reel-container">
        <svg ref={ref}
          className={`reel-svg ${isSpinning ? 'spinning' : ''} ${isScratchActive ? 'scratching' : ''} ${isTapeStopped ? 'tape-stopped' : ''}`}
          viewBox="0 0 280 280" width="270" height="270"
          onPointerDown={handlePointerDown} onPointerMove={onScratchMove}
          onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp}
          style={{ transform: `rotate(${rotationDeg}deg)`, willChange: 'transform', touchAction: 'none' }}>
          <defs>
            <radialGradient id="discSurface" cx="48%" cy="42%" r="52%">
              <stop offset="0%" stopColor="#dcdcdc" /><stop offset="40%" stopColor="#d0d0d0" />
              <stop offset="75%" stopColor="#c4c4c4" /><stop offset="100%" stopColor="#b8b8b8" />
            </radialGradient>
            <radialGradient id="hubSurface" cx="44%" cy="38%" r="55%">
              <stop offset="0%" stopColor="#e8e8e8" /><stop offset="100%" stopColor="#c8c8c8" />
            </radialGradient>
          </defs>

          {/* Progress ring (behind disc, doesn't rotate) */}
          {progressArc && <path d={progressArc} fill="none" stroke="rgba(242,101,34,0.5)" strokeWidth="3" strokeLinecap="round"
            style={{ transform: `rotate(${-rotationDeg}deg)`, transformOrigin: '140px 140px' }} />}

          {/* Outer rim */}
          <circle cx="140" cy="140" r="136" fill="url(#discSurface)" stroke="#b0b0b0" strokeWidth="0.5" />

          {/* Waveform visualization */}
          {waveformPath && <path d={waveformPath} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="1.2" strokeLinecap="round" />}

          {/* Concentric grooves */}
          {[30, 50, 70, 90, 110, 125].map(r => (
            <circle key={r} cx="140" cy="140" r={r} fill="none" stroke="rgba(0,0,0,0.02)" strokeWidth="0.3" />
          ))}

          {/* Cross lines */}
          <line x1="35" y1="90" x2="245" y2="190" stroke="rgba(0,0,0,0.03)" strokeWidth="0.4" />
          <line x1="35" y1="190" x2="245" y2="90" stroke="rgba(0,0,0,0.03)" strokeWidth="0.4" />

          {/* Text markings */}
          <text x="82" y="78" fontSize="7" fill="rgba(0,0,0,0.15)" fontFamily="Helvetica, sans-serif">96 / 24</text>
          <text x="178" y="214" fontSize="7" fill="rgba(0,0,0,0.15)" fontFamily="Helvetica, sans-serif">3 ⊘ M</text>

          {/* Hub */}
          <circle cx="140" cy="140" r="26" fill="url(#hubSurface)" stroke="rgba(0,0,0,0.08)" strokeWidth="0.5" />
          {[[132,132],[148,132],[132,148],[148,148]].map(([x,y],i) => (
            <circle key={i} cx={x} cy={y} r="1.8" fill="#aaa" />
          ))}
          <circle cx="140" cy="140" r="4.5" fill="#a8a8a8" stroke="#999" strokeWidth="0.5" />
        </svg>
      </div>
    );
  }
);
ReelSVG.displayName = 'ReelSVG';
