interface FeatureGuideProps {
  visible: boolean;
}

export function FeatureGuide({ visible }: FeatureGuideProps) {
  if (!visible) return null;

  return (
    <div className="feature-guide">
      {/* Left side — FF/Rewind label */}
      <div className="guide-label guide-rocker">
        <span className="guide-text">FF / Rewind</span>
        <span className="guide-line guide-line-h" />
      </div>

      {/* Top right — OLED Display */}
      <div className="guide-label guide-oled">
        <span className="guide-line guide-line-h" />
        <span className="guide-text">Display</span>
      </div>

      {/* Right side — M button */}
      <div className="guide-label guide-mbtn">
        <span className="guide-line guide-line-h" />
        <span className="guide-text">Mode</span>
      </div>

      {/* Right side — FX */}
      <div className="guide-label guide-fx">
        <span className="guide-line guide-line-h" />
        <span className="guide-text">Tape FX</span>
      </div>

      {/* Right side — Volume */}
      <div className="guide-label guide-vol">
        <span className="guide-line guide-line-h" />
        <span className="guide-text">Volume</span>
      </div>

      {/* Center — Reel */}
      <div className="guide-label guide-reel">
        <span className="guide-text">Drag to scratch · Hold center for tape stop</span>
        <span className="guide-line guide-line-v" />
      </div>

      {/* Bottom — Transport */}
      <div className="guide-label guide-transport">
        <span className="guide-line guide-line-v" />
        <span className="guide-text">Record · Play · Stop · Loop</span>
      </div>

      {/* Keyboard shortcuts */}
      <div className="guide-label guide-keyboard">
        <span className="guide-text-subtle">Space to play · Arrows to skip · D for dark mode</span>
      </div>

      {/* Dismiss */}
      <div className="guide-dismiss">Click anywhere to start</div>
    </div>
  );
}
