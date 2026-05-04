import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Volume1 } from 'lucide-react';
import { setSoundEnabled, setVolume, playSound } from '../lib/soundUtils';

const SoundController = () => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [volume, setLocalVolume] = useState(0.5);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const savedChoice = localStorage.getItem('sound_enabled');
    const savedVolume = localStorage.getItem('sound_volume');

    if (savedVolume) {
      const vol = parseFloat(savedVolume);
      setLocalVolume(vol);
      setVolume(vol);
    } else {
      setVolume(0.5);
    }

    if (savedChoice === 'true') {
      enableSound(true);
    } else if (savedChoice === null) {
      setTimeout(() => setShowPrompt(true), 2000);
    }
  }, []);

  const enableSound = (force = false) => {
    setIsEnabled(true);
    setSoundEnabled(true);
    setShowPrompt(false);
    localStorage.setItem('sound_enabled', 'true');
    if (!force) playSound('click');
  };

  const disableSound = () => {
    setIsEnabled(false);
    setSoundEnabled(false);
    localStorage.setItem('sound_enabled', 'false');
  };

  const handleToggle = () => {
    if (!isEnabled) {
      enableSound();
    } else {
      disableSound();
    }
  };

  const handleVolumeChange = (e) => {
    const newVol = parseFloat(e.target.value);
    setLocalVolume(newVol);
    setVolume(newVol);
    localStorage.setItem('sound_volume', newVol.toString());
    
    // Play a tiny click when adjusting volume to give feedback
    if (isEnabled) {
      // Debounce logic or just play on mouseup is better, but this is simple
    }
  };

  const getVolumeIcon = () => {
    if (!isEnabled || volume === 0) return <VolumeX size={24} className="text-muted" />;
    if (volume < 0.4) return <Volume1 size={24} className="text-primary" />;
    return <Volume2 size={24} className="text-primary" />;
  };

  return (
    <div className="sound-controller-fab">
      {showPrompt && (
        <div className="sound-prompt" onClick={() => enableSound()}>
          Enable Sounds? 🔊
        </div>
      )}

      <div className="volume-slider-container d-flex flex-column align-items-start p-3 gap-1">
        <div className="d-flex align-items-center gap-2 w-100">
          <Volume1 size={14} className="text-muted" />
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={handleVolumeChange}
            className="apple-slider flex-grow-1"
          />
          <Volume2 size={14} className="text-muted" />
        </div>
        <span className="text-muted" style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Volume: {Math.round(volume * 100)}%
        </span>
      </div>

      <div className="fab-main shadow-sm" onClick={handleToggle} title={isEnabled ? "Mute SFX" : "Unmute SFX"}>
        {getVolumeIcon()}
      </div>
    </div>
  );
};

export default SoundController;
