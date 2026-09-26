// Restaurant GST slabs a business may charge — mirrors backend/src/utils/gst.ts (the backend
// rejects anything else). 0 = GST off. Since GST 2.0 (22 Sep 2025) restaurant services are 5%
// without input tax credit, or 18% with ITC for hotel restaurants (room tariff > ₹7,500/night)
// and restaurants that opt in.
export const GST_RATE_SLABS = [0, 5, 18] as const;

export const GST_ENABLED_SLABS: { rate: number; hint: string }[] = [
  { rate: 5, hint: 'Standard for restaurants & cafés (no ITC)' },
  { rate: 18, hint: 'Hotel restaurants, or opted in (with ITC)' },
];

export const isGstSlab = (rate: number) => (GST_RATE_SLABS as readonly number[]).includes(rate);
