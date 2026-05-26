interface FeatureGuideProps {
  visible: boolean;
}

export function FeatureGuide({ visible }: FeatureGuideProps) {
  if (!visible) return null;

  return (
    <div className="feature-guide">
      {/* OLED Display — points to top-right of device */}
      <div className="guide-label guide-oled">
        <span className="guide-text">OLED Display</span>
        <svg className="guide-arrow" width="40" height="30" viewBox="0 0 40 30">
          <path d="M38 2 C28 8, 15 18, 4 26" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
          <circle cx="3" cy="27" r="2" fill="currentColor" />
        </svg>
      </div>

      {/* Reel — points to center of disc */}
      <div className="guide-label guide-reel">
        <span className="guide-text">Drag to scratch · Hold center for tape stop</span>
        <svg className="guide-arrow" width="30" height="30" viewBox="0 0 30 30">
          <path d="M15 2 C15 10, 15 20, 15 28" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
          <circle cx="15" cy="28" r="2" fill="currentColor" />
        </svg>
      </div>

      {/* Rocker — points to left side slider */}
      <div className="guide-label guide-rocker">
        <span className="guide-text">FF / Rewind</span>
        <svg className="guide-arrow" width="40" height="14" viewBox="0 0 40 14">
          <path d="M2 7 C12 7, 28 7, 38 7" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
          <circle cx="38" cy="7" r="2" fill="currentColor" />
        </svg>
      </div>

      {/* Transport buttons — points up to the button row */}
      <div className="guide-label guide-transport">
        <svg className="guide-arrow" width="14" height="24" viewBox="0 0 14 24">
          <path d="M7 22 C7 14, 7 8, 7 2" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
          <circle cx="7" cy="2" r="2" fill="currentColor" />
        </svg>
        <span className="guide-text">Record · Play · Stop · Loop</span>
      </div>

      {/* Volume dial — points to bottom-right knurled dial */}
      <div className="guide-label guide-dial">
        <span className="guide-text">Volume</span>
        <svg className="guide-arrow" width="40" height="14" viewBox="0 0 40 14">
          <path d="M38 7 C28 7, 12 7, 2 7" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
          <circle cx="2" cy="7" r="2" fill="currentColor" />
        </svg>
      </div>

      {/* M button — points to orange M */}
      <div className="guide-label guide-mbtn">
        <span className="guide-text">Mode</span>
        <svg className="guide-arrow" width="40" height="14" viewBox="0 0 40 14">
          <path d="M38 7 C28 7, 12 7, 2 7" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
          <circle cx="2" cy="7" r="2" fill="currentColor" />
        </svg>
      </div>

      {/* FX button */}
      <div className="guide-label guide-fx">
        <span className="guide-text">Tape FX</span>
        <svg className="guide-arrow" width="40" height="14" viewBox="0 0 40 14">
          <path d="M38 7 C28 7, 12 7, 2 7" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
          <circle cx="2" cy="7" r="2" fill="currentColor" />
        </svg>
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
