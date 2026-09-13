
/**
 * Custom URL schemes like upi:// only get intercepted by the OS on a
 * phone. On desktop there's nothing to hand off to, so the caller should
 * render a scannable QR of the same payment string instead.
 */
export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}