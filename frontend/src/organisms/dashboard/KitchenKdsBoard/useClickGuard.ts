import React, { useCallback, useRef } from 'react';

/**
 * Swallows clicks for a moment after `arm()`. Switching Kitchen mode puts a different screen under
 * the pointer: a double-click (or double-tap) on "Kitchen mode" or "Exit" would otherwise land its
 * second click on whatever ticket button is there now, such as Confirm payment, Cancel or the
 * next-step button, and change a real order. Put `onClickCapture` on the content the switch reveals
 * and call `arm()` when it switches.
 */
export const useClickGuard = (ms = 500, armedAtStart = false) => {
  const until = useRef(armedAtStart ? performance.now() + ms : 0);

  const arm = useCallback(() => {
    until.current = performance.now() + ms;
  }, [ms]);

  const onClickCapture = useCallback((e: React.SyntheticEvent) => {
    if (performance.now() < until.current) {
      e.stopPropagation();
      e.preventDefault();
    }
  }, []);

  return { arm, onClickCapture };
};
