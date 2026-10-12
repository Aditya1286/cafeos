// Kitchen board tuning. Kept out of the components so a café's idea of "late" is one edit.

/** How long an order may wait (minutes since it was placed) before its ticket turns amber, then red.
 * Measured from placement for every column: New and Preparing show the wait so far, Ready shows how
 * long the food has been sitting. */
export const KDS_WAIT = {
  warnMin: 10,
  lateMin: 20,
} as const;

/** How often the board re-reads the clock so waiting times tick up without any new order arriving. */
export const KDS_CLOCK_MS = 30_000;

/** Above this many tickets in a column the list stops animating each card's position: a layout
 * animation per ticket is fine for a handful and sluggish at fifty. */
export const KDS_ANIMATE_MAX = 30;

/** Remembered per browser: whether the board was last used in Kitchen mode. */
export const KDS_KITCHEN_MODE_KEY = 'caos_kds_kitchen_mode';
