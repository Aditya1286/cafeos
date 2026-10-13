import type { MetricUnit } from '@/services/dashboard/analytics/types';

// How analytics numbers read on screen: rupees with Indian grouping, durations as "4m 20s", and a
// dash (never "NaN" or "0") where there is nothing to show.

const grouped = (n: number, maxFractionDigits = 0) =>
  n.toLocaleString('en-IN', { maximumFractionDigits: maxFractionDigits });
const oneDecimal = (n: number) => String(Math.round(n * 10) / 10);

/** ₹48,210 — or ₹1.2L / ₹3.4Cr when `compact` and large. */
export const formatPaise = (
  paise: number,
  { compact = false }: { compact?: boolean } = {},
): string => {
  const rupees = paise / 100;
  if (compact) {
    const abs = Math.abs(rupees);
    if (abs >= 1e7) return `₹${oneDecimal(rupees / 1e7)}Cr`;
    if (abs >= 1e5) return `₹${oneDecimal(rupees / 1e5)}L`;
  }
  return `₹${grouped(Math.round(rupees))}`;
};

/** 45s, 10m, 4m 20s, 1h 5m. */
export const formatSeconds = (seconds: number): string => {
  const s = Math.max(Math.round(seconds), 0);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return m >= 10 || s % 60 === 0 ? `${m}m` : `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  return m % 60 === 0 ? `${h}h` : `${h}h ${m % 60}m`;
};

export const formatPercent = (percent: number): string => `${oneDecimal(percent)}%`;
export const formatCount = (n: number): string => grouped(n, 1);

export const formatValue = (
  value: number | null | undefined,
  unit: MetricUnit,
  options: { compact?: boolean } = {},
): string => {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  switch (unit) {
    case 'paise':
      return formatPaise(value, options);
    case 'seconds':
      return formatSeconds(value);
    case 'percent':
      return formatPercent(value);
    case 'count':
      return formatCount(value);
  }
};

export interface ChangeLabel {
  /** '8.2%', '0%'; empty when there is nothing to compare with. */
  text: string;
  direction: 'up' | 'down' | 'flat' | 'none';
}

/** The change since the comparison period, as arrow-ready text. */
export const formatChange = (changePct: number | null | undefined): ChangeLabel => {
  if (changePct === null || changePct === undefined || !Number.isFinite(changePct))
    return { text: '', direction: 'none' };
  if (Math.abs(changePct) < 0.05) return { text: '0%', direction: 'flat' };
  return { text: `${oneDecimal(Math.abs(changePct))}%`, direction: changePct > 0 ? 'up' : 'down' };
};

/** Good news, bad news or neither, for colouring a change: whether up is good depends on the metric. */
export const changeTone = (
  direction: ChangeLabel['direction'],
  goodDirection?: 'up' | 'down',
): 'good' | 'bad' | 'neutral' => {
  if (direction === 'none' || direction === 'flat' || !goodDirection) return 'neutral';
  return direction === goodDirection ? 'good' : 'bad';
};
