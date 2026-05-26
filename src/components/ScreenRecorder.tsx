import { useState, useRef, useCallback } from 'react';

interface ScreenRecorderProps {
  darkMode: boolean;
}

export function ScreenRecorder({ darkMode }: ScreenRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = useCallback(async () => {
    try {
      // Request screen + audio capture
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'browser' },
        audio: true, // Captures tab audio
      } as DisplayMediaStreamOptions);

      // Countdown 3-2-1
      for (let i = 3; i > 0; i--) {
        setCountdown(i);
        await new Promise(r => setTimeout(r, 1000));
      }
      setCountdown(null);

      const mediaRecorder = new MediaRecorder(displayStream, {
        mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
          ? 'video/webm;codecs=vp9,opus'
          : 'video/webm',
      });

      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tp7-demo-${Date.now()}.webm`;
        a.click();
        URL.revokeObjectURL(url);
        setIsRecording(false);

        // Stop all tracks
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      };

      // If user stops sharing via browser UI
      displayStream.getVideoTracks()[0].onended = () => {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      };

      mediaRecorder.start(100);
      mediaRecorderRef.current = mediaRecorder;
      streamRef.current = displayStream;
      setIsRecording(true);
    } catch {
      setCountdown(null);
      // User cancelled the screen share dialog
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  return (
    <>
      <button
        className={`screen-rec-btn ${darkMode ? 'dark' : ''} ${isRecording ? 'active' : ''}`}
        onClick={isRecording ? stopRecording : startRecording}
      >
        {isRecording ? (
          <>
            <span className="screen-rec-dot recording" />
            <span>Stop Recording</span>
          </>
        ) : (
          <>
            <svg viewBox="0 0 20 20" width="14" height="14">
              <rect x="2" y="4" width="16" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="10" cy="10" r="3" fill="currentColor" />
            </svg>
            <span>Record Demo</span>
          </>
        )}
      </button>

      {/* Countdown overlay */}
      {countdown !== null && (
        <div className="screen-rec-countdown">
          <span>{countdown}</span>
        </div>
      )}
    </>
  );
}
