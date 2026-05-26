// SoundCloud API service
// Requires a valid OAuth access token.
// Set VITE_SOUNDCLOUD_TOKEN in your .env file, or use the auth flow.

const API_BASE = 'https://api.soundcloud.com';

export interface SCTrack {
  id: number;
  title: string;
  user: { username: string };
  duration: number; // ms
  artwork_url: string | null;
  stream_url: string | null;
  access: 'playable' | 'preview' | 'blocked';
  permalink_url: string;
}

export interface SCSearchResult {
  collection: SCTrack[];
  next_href: string | null;
}

function getToken(): string | null {
  return import.meta.env.VITE_SOUNDCLOUD_TOKEN || null;
}

export function isConfigured(): boolean {
  return !!getToken();
}

export async function searchTracks(query: string, limit: number = 10): Promise<SCTrack[]> {
  const token = getToken();
  if (!token) throw new Error('SoundCloud token not configured');

  const params = new URLSearchParams({
    q: query,
    access: 'playable',
    limit: limit.toString(),
    linked_partitioning: 'true',
  });

  const res = await fetch(`${API_BASE}/tracks?${params}`, {
    headers: {
      'Accept': 'application/json; charset=utf-8',
      'Authorization': `OAuth ${token}`,
    },
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error('Invalid SoundCloud token');
    throw new Error(`SoundCloud API error: ${res.status}`);
  }

  const data: SCSearchResult = await res.json();
  return data.collection.filter(t => t.access === 'playable');
}

export async function getStreamUrl(trackId: number): Promise<string> {
  const token = getToken();
  if (!token) throw new Error('SoundCloud token not configured');

  const res = await fetch(`${API_BASE}/tracks/${trackId}/streams`, {
    headers: {
      'Accept': 'application/json; charset=utf-8',
      'Authorization': `OAuth ${token}`,
    },
  });

  if (!res.ok) throw new Error(`Failed to get stream: ${res.status}`);

  const data = await res.json();
  // Prefer progressive (direct download) over HLS
  return data.http_mp3_128_url || data.hls_mp3_128_url || data.preview_mp3_128_url || '';
}

export async function fetchTrackAudio(trackId: number): Promise<ArrayBuffer> {
  const streamUrl = await getStreamUrl(trackId);
  if (!streamUrl) throw new Error('No stream URL available');

  const res = await fetch(streamUrl);
  if (!res.ok) throw new Error('Failed to fetch audio stream');

  return res.arrayBuffer();
}
