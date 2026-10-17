/** Integer paise as rupees: whole rupees without decimals, otherwise two places. */
export const rupees = (paise: number): string =>
  `₹${paise % 100 === 0 ? (paise / 100).toFixed(0) : (paise / 100).toFixed(2)}`;

/** The order total once `addedPaise` more is on it, taxed the way the server does (round per order). */
export const totalAfterAdding = (subtotalPaise: number, addedPaise: number, taxRatePercentage: number): number => {
  const subtotal = subtotalPaise + addedPaise;
  return subtotal + Math.round((subtotal * (taxRatePercentage || 0)) / 100);
};
