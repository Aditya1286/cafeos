// Whether the visitor minimised the mascot. Stored locally only, as a bare boolean: no identifiers,
// nothing sent anywhere. Every access is guarded because storage can be blocked or throw.

const KEY = 'caos:mascot:minimized';

export const readMinimized = (): boolean => {
  try {
    return window.localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
};

export const writeMinimized = (minimized: boolean): void => {
  try {
    if (minimized) window.localStorage.setItem(KEY, '1');
    else window.localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable: the preference just won't persist */
  }
};
