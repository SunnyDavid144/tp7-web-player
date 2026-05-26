import { useCallback, useRef } from 'react';

interface IOPortsProps {
  volume: number;
  isLoaded: boolean;
  tapeEffects: boolean;
  darkMode: boolean;
  onVolumeUp: () => void;
  onVolumeDown: () => void;
  onSetVolume: (v: number) => void;
  onCycleDisplayMode: () => void;
  onToggleDarkMode: () => void;
  onToggleTapeEffects: () => void;
  onExport: () => void;
}

export function IOPorts({ volume, isLoaded, tapeEffects, darkMode, onVolumeUp, onVolumeDown, onSetVolume, onCycleDisplayMode, onToggleDarkMode, onToggleTapeEffects, onExport }: IOPortsProps) {
  const dragStartY = useRef<number | null>(null);
  const dragStartVol = useRef<number>(0);

  const handleDialPointerDown = useCallback((e: React.PointerEvent) => {
    if (!isLoaded) return;
    dragStartY.current = e.clientY; dragStartVol.current = volume;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, [volume, isLoaded]);

  const handleDialPointerMove = useCallback((e: React.PointerEvent) => {
    if (dragStartY.current === null) return;
    const delta = (dragStartY.current - e.clientY) / 100;
    onSetVolume(Math.max(0, Math.min(1, dragStartVol.current + delta)));
  }, [onSetVolume]);

  const handleDialPointerUp = useCallback(() => { dragStartY.current = null; }, []);

  return (
    <div className="io-ports">
      <button className="side-btn m-btn" onClick={onCycleDisplayMode} aria-label="Mode" title="Display mode (M)"><span>M</span></button>
      <button className={`side-btn ${tapeEffects ? 'active-btn' : ''}`} onClick={onToggleTapeEffects} disabled={!isLoaded} aria-label="Tape effects" title="Tape effects (T)">
        <span style={{ fontSize: '7px' }}>FX</span>
      </button>
      <button className="side-btn plus-btn" onClick={onVolumeUp} disabled={!isLoaded} aria-label="Volume up" title="Volume up (↑)">
        <svg viewBox="0 0 16 16" width="11" height="11"><line x1="8" y1="3" x2="8" y2="13" stroke="currentColor" strokeWidth="2" /><line x1="3" y1="8" x2="13" y2="8" stroke="currentColor" strokeWidth="2" /></svg>
      </button>
      <button className="side-btn minus-btn" onClick={onVolumeDown} disabled={!isLoaded} aria-label="Volume down" title="Volume down (↓)">
        <svg viewBox="0 0 16 16" width="11" height="11"><line x1="3" y1="8" x2="13" y2="8" stroke="currentColor" strokeWidth="2" /></svg>
      </button>
      <button className={`side-btn ${darkMode ? 'active-btn' : ''}`} onClick={onToggleDarkMode} aria-label="Dark mode" title="Dark mode (D)">
        <span style={{ fontSize: '8px' }}>◐</span>
      </button>
      <button className="side-btn" onClick={onExport} disabled={!isLoaded} aria-label="Export WAV" title="Export WAV (E)">
        <span style={{ fontSize: '7px' }}>↓</span>
      </button>
      <div className="knurled-dial interactive" onPointerDown={handleDialPointerDown} onPointerMove={handleDialPointerMove} onPointerUp={handleDialPointerUp} onPointerCancel={handleDialPointerUp} title={`Vol: ${Math.round(volume*100)}%`} style={{ touchAction: 'none' }}>
        <div className="dial-knurl"><div className="dial-level" style={{ height: `${volume*100}%` }} /></div>
      </div>
    </div>
  );
}
