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
      if (dist / (rect.width / 2) < 0.18) {
        onTapeStopStart();
        onScratchStart(e);
      } else {
        onScratchStart(e);
      }
    }, [onScratchStart, onTapeStopStart]);

    const handlePointerUp = useCallback((_e: React.PointerEvent<SVGSVGElement>) => {
      onScratchEnd(); onTapeStopEnd();
    }, [onScratchEnd, onTapeStopEnd]);

    const waveformPath = useMemo(() => {
      if (waveformData.length === 0) return null;
      const cx = 150, cy = 150, innerR = 42, outerR = 130;
      return waveformData.map((peak, i) => {
        const angle = (i / waveformData.length) * Math.PI * 2 - Math.PI / 2;
        const r1 = innerR + 12;
        const r2 = r1 + peak * (outerR - innerR - 24);
        const x1 = cx + r1 * Math.cos(angle), y1 = cy + r1 * Math.sin(angle);
        const x2 = cx + r2 * Math.cos(angle), y2 = cy + r2 * Math.sin(angle);
        return `M${x1},${y1}L${x2},${y2}`;
      }).join(' ');
    }, [waveformData]);

    const progressArc = useMemo(() => {
      if (progress <= 0) return '';
      const cx = 150, cy = 150, r = 145;
      const angle = progress * Math.PI * 2 - Math.PI / 2;
      const x = cx + r * Math.cos(angle), y = cy + r * Math.sin(angle);
      const largeArc = progress > 0.5 ? 1 : 0;
      return `M${cx},${cy - r} A${r},${r} 0 ${largeArc} 1 ${x},${y}`;
    }, [progress]);

    return (
      <div className="reel-container">
        <svg ref={ref}
          className={`reel-svg ${isSpinning ? 'spinning' : ''} ${isScratchActive ? 'scratching' : ''} ${isTapeStopped ? 'tape-stopped' : ''}`}
          viewBox="0 0 300 300" width="290" height="290"
          onPointerDown={handlePointerDown} onPointerMove={onScratchMove}
          onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp}
          style={{ transform: `rotate(${rotationDeg}deg)`, willChange: 'transform', touchAction: 'none' }}>
          <defs>
            {/* Flat matte aluminum — minimal gradient */}
            <radialGradient id="discFlat" cx="50%" cy="46%" r="50%">
              <stop offset="0%" stopColor="#d6d6d6" />
              <stop offset="70%" stopColor="#cccccc" />
              <stop offset="100%" stopColor="#c4c4c4" />
            </radialGradient>
            {/* Hub — slightly brighter, raised feel */}
            <radialGradient id="hubFlat" cx="46%" cy="40%" r="55%">
              <stop offset="0%" stopColor="#e0e0e0" />
              <stop offset="100%" stopColor="#d0d0d0" />
            </radialGradient>
            {/* Hub shadow for depth */}
            <filter id="hubShadow">
              <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.15" />
            </filter>
          </defs>

          {/* Progress ring (counter-rotates to stay fixed) */}
          {progressArc && <path d={progressArc} fill="none" stroke="rgba(242,101,34,0.5)" strokeWidth="2.5" strokeLinecap="round"
            style={{ transform: `rotate(${-rotationDeg}deg)`, transformOrigin: '150px 150px' }} />}

          {/* Outer recessed groove — the dark ring separating disc from chassis */}
          <circle cx="150" cy="150" r="143" fill="none" stroke="#a0a0a0" strokeWidth="1.5" />
          <circle cx="150" cy="150" r="141" fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="0.5" />

          {/* Main disc surface — flat matte */}
          <circle cx="150" cy="150" r="140" fill="url(#discFlat)" />

          {/* Very subtle inner shadow on disc edge */}
          <circle cx="150" cy="150" r="139" fill="none" stroke="rgba(0,0,0,0.03)" strokeWidth="1" />

          {/* Waveform visualization (subtle) */}
          {waveformPath && <path d={waveformPath} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="1" strokeLinecap="round" />}

          {/* Cross lines — more visible, edge to edge like the real device */}
          <line x1="25" y1="85" x2="275" y2="215" stroke="rgba(0,0,0,0.06)" strokeWidth="0.6" />
          <line x1="25" y1="215" x2="275" y2="85" stroke="rgba(0,0,0,0.06)" strokeWidth="0.6" />

          {/* Concentric machining marks — very subtle */}
          {[50, 70, 90, 110, 128].map(r => (
            <circle key={r} cx="150" cy="150" r={r} fill="none" stroke="rgba(0,0,0,0.015)" strokeWidth="0.3" />
          ))}

          {/* Text markings — etched into surface */}
          <text x="85" y="82" fontSize="8" fill="rgba(0,0,0,0.18)" fontFamily="-apple-system, Helvetica, sans-serif" fontWeight="300" letterSpacing="0.5">96 / 24</text>
          <text x="185" y="230" fontSize="8" fill="rgba(0,0,0,0.18)" fontFamily="-apple-system, Helvetica, sans-serif" fontWeight="300" letterSpacing="0.5">3 ⊘ M</text>

          {/* Center hub — raised with shadow */}
          <circle cx="150" cy="150" r="28" fill="url(#hubFlat)" filter="url(#hubShadow)" />
          <circle cx="150" cy="150" r="28" fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="0.5" />
          {/* Inner bevel highlight */}
          <circle cx="150" cy="150" r="27" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.3" />

          {/* Hub screw holes — 4 dots arranged in a square */}
          {[[-6,-6],[6,-6],[-6,6],[6,6]].map(([dx,dy], i) => (
            <g key={i}>
              <circle cx={150 + dx} cy={150 + dy} r="2.5" fill="#b8b8b8" />
              <circle cx={150 + dx} cy={150 + dy} r="1.6" fill="#a8a8a8" />
              <circle cx={150 + dx} cy={150 + dy} r="0.6" fill="#888" />
            </g>
          ))}

          {/* Center spindle */}
          <circle cx="150" cy="150" r="5" fill="#b0b0b0" stroke="#a0a0a0" strokeWidth="0.5" />
          <circle cx="150" cy="150" r="2" fill="#999" />

          {/* Small C-shaped notch on hub (visible in reference) */}
          <path d="M 140 142 A 6 6 0 0 1 140 148" fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth="0.8" strokeLinecap="round" />
        </svg>
      </div>
    );
  }
);
ReelSVG.displayName = 'ReelSVG';
