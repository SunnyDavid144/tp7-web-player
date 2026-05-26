import { useState, useCallback } from 'react';
import { searchTracks, fetchTrackAudio, isConfigured, SCTrack } from '../services/soundcloud';

interface SoundCloudSearchProps {
  onTrackLoaded: (buffer: ArrayBuffer, fileName: string) => void;
  darkMode: boolean;
}

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export function SoundCloudSearch({ onTrackLoaded, darkMode }: SoundCloudSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SCTrack[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const configured = isConfigured();

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    setError(null);
    try {
      const tracks = await searchTracks(query.trim());
      setResults(tracks);
      if (tracks.length === 0) setError('No tracks found');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed');
      setResults([]);
    }
    setIsSearching(false);
  }, [query]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  }, [handleSearch]);

  const handleLoadTrack = useCallback(async (track: SCTrack) => {
    setLoadingId(track.id);
    setError(null);
    try {
      const buffer = await fetchTrackAudio(track.id);
      onTrackLoaded(buffer, `${track.user.username} - ${track.title}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load track');
    }
    setLoadingId(null);
  }, [onTrackLoaded]);

  if (!configured) {
    return (
      <div className={`sc-panel ${darkMode ? 'dark' : ''}`}>
        <button className="sc-toggle" onClick={() => setIsOpen(!isOpen)}>
          <span className="sc-logo">☁</span> SoundCloud
        </button>
        {isOpen && (
          <div className="sc-body">
            <div className="sc-setup">
              <p>To connect SoundCloud, add your OAuth token:</p>
              <code>VITE_SOUNDCLOUD_TOKEN=your_token</code>
              <p className="sc-hint">Create a <code>.env</code> file in the project root.</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`sc-panel ${darkMode ? 'dark' : ''} ${isOpen ? 'open' : ''}`}>
      <button className="sc-toggle" onClick={() => setIsOpen(!isOpen)}>
        <span className="sc-logo">☁</span> SoundCloud
        {results.length > 0 && <span className="sc-badge">{results.length}</span>}
      </button>

      {isOpen && (
        <div className="sc-body">
          <div className="sc-search-bar">
            <input
              type="text"
              className="sc-input"
              placeholder="Search tracks..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button className="sc-search-btn" onClick={handleSearch} disabled={isSearching}>
              {isSearching ? '...' : '⌕'}
            </button>
          </div>

          {error && <div className="sc-error">{error}</div>}

          <div className="sc-results">
            {results.map(track => (
              <div key={track.id} className="sc-track" onClick={() => handleLoadTrack(track)}>
                <div className="sc-track-art">
                  {track.artwork_url ? (
                    <img src={track.artwork_url.replace('-large', '-t67x67')} alt="" />
                  ) : (
                    <div className="sc-track-art-placeholder">♪</div>
                  )}
                </div>
                <div className="sc-track-info">
                  <span className="sc-track-title">{track.title}</span>
                  <span className="sc-track-artist">{track.user.username}</span>
                </div>
                <span className="sc-track-duration">{formatDuration(track.duration)}</span>
                {loadingId === track.id && <span className="sc-loading">⟳</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
