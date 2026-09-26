import React, { useCallback, useEffect, useRef, useState } from 'react';

export const LONG_PRESS_MS = 500;
// A finger drifting more than this is a scroll/drag, not a hold.
const MOVE_TOLERANCE_PX = 10;

interface UseLongPressOptions {
  holdMs?: number;
  /** A normal click/tap that didn't reach `holdMs`. `e.detail === 0` means keyboard activation. */
  onShortPress?: (e: React.MouseEvent) => void;
}

/**
 * Press-and-hold on any element via pointer events, so it works the same for touch and mouse.
 * Spread `handlers` onto the target; `holding` is true while the press is in progress (drive
 * a fill/progress indicator off it). The click that follows a successful hold is swallowed,
 * so `onShortPress` only fires for genuine short taps.
 */
export const useLongPress = (
  onLongPress: () => void,
  { holdMs = LONG_PRESS_MS, onShortPress }: UseLongPressOptions = {},
) => {
  const [holding, setHolding] = useState(false);
  const timerRef = useRef<number | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const firedRef = useRef(false);
  const onLongPressRef = useRef(onLongPress);
  useEffect(() => {
    onLongPressRef.current = onLongPress;
  }, [onLongPress]);

  const cancel = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    startRef.current = null;
    setHolding(false);
  }, []);

  useEffect(() => cancel, [cancel]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    firedRef.current = false;
    startRef.current = { x: e.clientX, y: e.clientY };
    setHolding(true);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      firedRef.current = true;
      setHolding(false);
      onLongPressRef.current();
    }, holdMs);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!startRef.current) return;
    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;
    if (Math.hypot(dx, dy) > MOVE_TOLERANCE_PX) cancel();
  };

  const onClick = (e: React.MouseEvent) => {
    if (firedRef.current) {
      firedRef.current = false;
      return;
    }
    onShortPress?.(e);
  };

  return {
    holding,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: cancel,
      onPointerLeave: cancel,
      onPointerCancel: cancel,
      onClick,
      // Stops the mobile long-press context menu / link preview from hijacking the hold.
      onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    },
  };
};
