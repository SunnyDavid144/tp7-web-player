import { TrackInfo } from '../types';

interface TrackListProps {
  tracks: TrackInfo[];
  activeTrackIndex: number;
  onSelectTrack: (index: number) => void;
  onRemoveTrack: (index: number) => void;
  isPlaying: boolean;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function TrackList({ tracks, activeTrackIndex, onSelectTrack, onRemoveTrack, isPlaying }: TrackListProps) {
  if (tracks.length === 0) return null;

  return (
    <div className="track-list">
      <div className="track-list-header">
        <span className="track-list-title">TRACKS</span>
        <span className="track-list-count">{tracks.length}</span>
      </div>
      <div className="track-list-items">
        {tracks.map((track, index) => (
          <div
            key={track.id}
            className={`track-item ${index === activeTrackIndex ? 'active' : ''}`}
            onClick={() => onSelectTrack(index)}
          >
            <div className="track-item-indicator">
              {index === activeTrackIndex && isPlaying ? (
                <span className="track-playing-icon">▶</span>
              ) : (
                <span className="track-number">{(index + 1).toString().padStart(2, '0')}</span>
              )}
            </div>
            <div className="track-item-info">
              <span className="track-item-name">
                {track.fileName.replace(/\.[^/.]+$/, '')}
              </span>
              <span className="track-item-duration">{formatDuration(track.duration)}</span>
            </div>
            {/* Mini waveform */}
            <div className="track-item-waveform">
              <svg viewBox="0 0 60 20" width="60" height="20" preserveAspectRatio="none">
                {track.waveformData.filter((_, i) => i % 4 === 0).map((peak, i) => (
                  <rect
                    key={i}
                    x={i * 1.2}
                    y={10 - peak * 9}
                    width="0.8"
                    height={peak * 18}
                    fill={index === activeTrackIndex ? 'var(--accent)' : 'var(--alu-600)'}
                    opacity={0.7}
                  />
                ))}
              </svg>
            </div>
            <button
              className="track-item-remove"
              onClick={(e) => { e.stopPropagation(); onRemoveTrack(index); }}
              aria-label="Remove track"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
