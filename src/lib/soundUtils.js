/**
 * Sound utility for Salpakan
 * Provides simple functions to play UI sounds.
 */

const SOUND_URLS = {
  click: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
  transition: 'https://assets.mixkit.co/active_storage/sfx/2591/2591-preview.mp3',
  success: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3',
  error: 'https://assets.mixkit.co/active_storage/sfx/2021/2021-preview.mp3'
};

const audioCache = {};
let isEnabled = false;
let globalVolume = 0.5;

// Preload SFX
if (typeof window !== 'undefined') {
  Object.keys(SOUND_URLS).forEach(name => {
    const audio = new Audio(SOUND_URLS[name]);
    audio.load();
    audioCache[name] = audio;
  });
}

export const setSoundEnabled = (enabled) => {
  isEnabled = enabled;
};

export const setVolume = (volume) => {
  globalVolume = volume;
};

export const playSound = (name) => {
  if (!isEnabled) return;
  try {
    const audio = audioCache[name];
    if (audio) {
      audio.currentTime = 0;
      audio.volume = globalVolume * 0.6;
      audio.play().catch(() => {});
    }
  } catch (e) {
    // Silent fail
  }
};

export const initGlobalSounds = () => {
  if (typeof window === 'undefined') return;
  
  const handleGlobalClick = (e) => {
    const target = e.target.closest('button, a, .cursor-pointer, .btn, .nav-link, [role="button"]');
    if (target && isEnabled) {
      playSound('click');
    }
  };
  
  document.addEventListener('click', handleGlobalClick);
  
  return () => {
    document.removeEventListener('click', handleGlobalClick);
  };
};
