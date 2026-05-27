import { ReelSVG } from './components/ReelSVG';
import { DisplayPanel } from './components/DisplayPanel';
import { TransportControls } from './components/TransportControls';
import { SideRocker } from './components/SideRocker';
import { IOPorts } from './components/IOPorts';

/**
 * Static screenshot page — no interactivity, just the device rendered
 * at a fixed size for thumbnail capture.
 * 
 * Access at: /screenshot.html
 */
export function Screenshot() {
  const noop = () => {};

  return (
    <div className="screenshot-page">
      <div className="tp7-device">
        <SideRocker isLoaded={true} rockerSpeed={0} onRockerPress={noop} onRockerRelease={noop} />

        <div className="tp7-chassis">
          <div className="tp7-upper">
            <div className="tp7-upper-left">
              <span className="tp7-model">TP-7</span>
              <div className="tp7-mic-hole" />
            </div>
            <DisplayPanel
              currentTime={97} duration={234} playbackRate={1.0}
              fileName="DEMO_TRACK.wav" isLoaded={true} error={null}
              isRockerHeld={false} isTapeStopped={false}
              isRecording={false} recordingTime={0}
              displayMode="time" volume={0.8} isLooping={false} tapeEffects={false}
              booted={true}
            />
          </div>

          <div className="tp7-reel-section">
            <ReelSVG
              rotationDeg={42}
              isSpinning={true}
              isScratchActive={false}
              isTapeStopped={false}
              waveformData={generateFakeWaveform()}
              progress={0.41}
              onScratchStart={noop} onScratchMove={noop} onScratchEnd={noop}
              onTapeStopStart={noop} onTapeStopEnd={noop}
            />
          </div>

          <div className="tp7-lower">
            <TransportControls
              isPlaying={true} isLoaded={true} isRecording={false} isLooping={false}
              onPlay={noop} onPause={noop} onStop={noop} onRecord={noop} onToggleLoop={noop}
            />
          </div>
        </div>

        <IOPorts
          volume={0.8} isLoaded={true} tapeEffects={false} darkMode={false}
          onVolumeUp={noop} onVolumeDown={noop} onSetVolume={noop}
          onCycleDisplayMode={noop} onToggleDarkMode={noop}
          onToggleTapeEffects={noop} onExport={noop}
        />
      </div>
    </div>
  );
}

function generateFakeWaveform(): number[] {
  const data: number[] = [];
  for (let i = 0; i < 200; i++) {
    data.push(0.2 + Math.random() * 0.6 * Math.sin(i * 0.08) ** 2 + Math.random() * 0.15);
  }
  return data;
}
