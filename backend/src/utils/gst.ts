// GST rates a business may charge on orders. Since the GST 2.0 reform (effective 22 Sep 2025)
// the slabs are 0/5/18/40%, but only two apply to restaurant/café services:
// - 5% (no input tax credit): the standard rate for restaurants, cafés, takeaway.
// - 18% (with input tax credit): restaurants in "specified premises" (hotels with a room
//   tariff above ₹7,500/night), or a standalone restaurant that opts into it.
// 0 means GST is off for the business. The 40% slab (tobacco, aerated drinks, luxury goods) is
// for goods, not restaurant services, so it's deliberately not offered.
// Mirrored in frontend/src/constants/gst.ts — keep the two in sync.
export const GST_RATE_SLABS = [0, 5, 18] as const;

export const isValidGstRate = (rate: unknown): rate is number =>
  typeof rate === 'number' && (GST_RATE_SLABS as readonly number[]).includes(rate);

/**
 * A new tax rate is accepted if it's one of the slabs, or if it's the rate the business already
 * has — so a business still on a pre-reform rate (e.g. 12%) can save its other settings without
 * being forced to change tax in the same request.
 */
export const isAcceptableGstRate = (rate: unknown, currentRate: number | undefined) =>
  isValidGstRate(rate) || (typeof rate === 'number' && rate === currentRate);

export const GST_RATE_ERROR_MESSAGE = `GST rate must be one of ${GST_RATE_SLABS.map((r) => `${r}%`).join(', ')} (0% turns GST off).`;
