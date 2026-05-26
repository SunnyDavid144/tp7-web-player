interface FeatureGuideProps {
  visible: boolean;
}

export function FeatureGuide({ visible }: FeatureGuideProps) {
  if (!visible) return null;

  return (
    <div className="feature-guide">
      {/* OLED Display */}
      <div className="guide-label guide-oled">
        <span className="guide-text">OLED Display</span>
        <svg className="guide-arrow" width="60" height="30" viewBox="0 0 60 30">
          <path d="M58 2 C40 2, 20 15, 4 28" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
          <circle cx="2" cy="28" r="2" fill="currentColor" />
        </svg>
      </div>

      {/* Reel */}
      <div className="guide-label guide-reel">
        <svg className="guide-arrow" width="40" height="50" viewBox="0 0 40 50">
          <path d="M38 2 C30 20, 20 35, 8 48" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
          <circle cx="6" cy="48" r="2" fill="currentColor" />
        </svg>
        <span className="guide-text">Drag to scratch · Hold center for tape stop</span>
      </div>

      {/* Rocker */}
      <div className="guide-label guide-rocker">
        <span className="guide-text">FF / Rewind</span>
        <svg className="guide-arrow" width="50" height="20" viewBox="0 0 50 20">
          <path d="M2 10 C15 10, 35 10, 48 10" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
          <circle cx="48" cy="10" r="2" fill="currentColor" />
        </svg>
      </div>

      {/* Transport buttons */}
      <div className="guide-label guide-transport">
        <svg className="guide-arrow" width="30" height="40" viewBox="0 0 30 40">
          <path d="M15 2 C15 15, 15 28, 15 38" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
          <circle cx="15" cy="38" r="2" fill="currentColor" />
        </svg>
        <span className="guide-text">Record · Play · Stop · Loop</span>
      </div>

      {/* Volume dial */}
      <div className="guide-label guide-dial">
        <svg className="guide-arrow" width="50" height="20" viewBox="0 0 50 20">
          <path d="M48 10 C35 10, 15 10, 2 10" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
          <circle cx="2" cy="10" r="2" fill="currentColor" />
        </svg>
        <span className="guide-text">Volume</span>
      </div>

      {/* M button */}
      <div className="guide-label guide-mbtn">
        <svg className="guide-arrow" width="50" height="20" viewBox="0 0 50 20">
          <path d="M48 10 C35 10, 15 10, 2 10" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
          <circle cx="2" cy="10" r="2" fill="currentColor" />
        </svg>
        <span className="guide-text">Mode</span>
      </div>

      {/* FX button */}
      <div className="guide-label guide-fx">
        <svg className="guide-arrow" width="50" height="20" viewBox="0 0 50 20">
          <path d="M48 10 C35 10, 15 10, 2 10" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
          <circle cx="2" cy="10" r="2" fill="currentColor" />
        </svg>
        <span className="guide-text">Tape FX</span>
      </div>

      {/* Keyboard hint */}
      <div className="guide-label guide-keyboard">
        <span className="guide-text-subtle">Space to play · Arrows to skip · Press D for dark mode</span>
      </div>

      {/* Dismiss hint */}
      <div className="guide-dismiss">
        Click anywhere to start
      </div>
    </div>
  );
}
