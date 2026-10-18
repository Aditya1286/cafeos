// The sound that plays when an order arrives. Every person can pick their own (Profile tab); until
// they do, or if their file can't be played, the default plays.
const DEFAULT_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

/** The longest sound we accept, so an alert is never a song. */
export const MAX_RINGTONE_SECONDS = 15;
export const MAX_RINGTONE_BYTES = 1024 * 1024;

let ringtoneUrl = '';

/** Sets the signed-in person's own sound ('' = the default). Called once their profile is known. */
export const setOrderRingtone = (url?: string) => {
  ringtoneUrl = url || '';
};

const play = (src: string) => new Audio(src).play();

/** Plays `url` (default: the person's own sound), falling back to the default sound if it can't play. */
export const playOrderSound = (url: string = ringtoneUrl): Promise<void> => {
  try {
    return play(url || DEFAULT_SOUND_URL)
      .catch(() => (url ? play(DEFAULT_SOUND_URL) : undefined))
      .catch(() => {});
  } catch {
    return Promise.resolve();
  }
};

/** How long a picked file plays for, or null if the browser can't read it as audio. */
export const readAudioSeconds = (file: File): Promise<number | null> =>
  new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    const done = (seconds: number | null) => {
      URL.revokeObjectURL(url);
      resolve(seconds);
    };
    audio.onloadedmetadata = () => done(Number.isFinite(audio.duration) ? audio.duration : null);
    audio.onerror = () => done(null);
    audio.src = url;
  });
