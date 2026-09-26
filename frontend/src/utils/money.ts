/** Central paise <-> rupee formatting so every screen rounds & localizes the same way. */

export const paiseToRupees = (paise: number | undefined | null): number =>
  Math.round((paise || 0) / 100);

export const formatRupees = (paise: number | undefined | null): string =>
  paiseToRupees(paise).toLocaleString('en-IN');

export const formatCurrency = (paise: number | undefined | null): string =>
  `₹${formatRupees(paise)}`;

/** Two-decimal rupee formatting for unit costs, where whole-rupee rounding would hide real precision (e.g. ₹4.50/gram). */
export const formatCurrencyPrecise = (paise: number | undefined | null): string =>
  `₹${((paise || 0) / 100).toFixed(2)}`;

export const formatPercentage = (value: number | null | undefined, fractionDigits = 1): string => {
  if (value === null || value === undefined) return 'New';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(fractionDigits)}%`;
};
