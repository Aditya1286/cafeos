import { describe, it, expect } from 'vitest';
import {
  changeTone,
  formatChange,
  formatCount,
  formatPaise,
  formatPercent,
  formatSeconds,
  formatValue,
} from '../src/utils/analyticsFormat';

describe('analytics number formatting', () => {
  it('rupees use Indian grouping, and large amounts shorten to lakh and crore when compact', () => {
    expect(formatPaise(4_821_000)).toBe('₹48,210');
    expect(formatPaise(123_456_700)).toBe('₹12,34,567');
    expect(formatPaise(0)).toBe('₹0');
    expect(formatPaise(12_345_600, { compact: true })).toBe('₹1.2L');
    expect(formatPaise(450_000_000, { compact: true })).toBe('₹45L');
    expect(formatPaise(1_250_000_000, { compact: true })).toBe('₹1.3Cr');
    expect(formatPaise(4_821_000, { compact: true })).toBe('₹48,210');
    expect(formatPaise(-250_000)).toBe('₹-2,500');
  });

  it('durations read as seconds, minutes, or hours and minutes', () => {
    expect(formatSeconds(0)).toBe('0s');
    expect(formatSeconds(45)).toBe('45s');
    expect(formatSeconds(60)).toBe('1m');
    expect(formatSeconds(260)).toBe('4m 20s');
    expect(formatSeconds(600)).toBe('10m');
    expect(formatSeconds(645)).toBe('10m'); // past ten minutes, seconds are noise
    expect(formatSeconds(3600)).toBe('1h');
    expect(formatSeconds(3725)).toBe('1h 2m');
    expect(formatSeconds(21_600)).toBe('6h');
    expect(formatSeconds(-5)).toBe('0s');
  });

  it('percentages and counts trim needless decimals', () => {
    expect(formatPercent(40)).toBe('40%');
    expect(formatPercent(33.333)).toBe('33.3%');
    expect(formatCount(1234)).toBe('1,234');
    expect(formatCount(1.74)).toBe('1.7');
  });

  it('formatValue picks the unit and shows a dash for nothing, never NaN or 0 by accident', () => {
    expect(formatValue(4_821_000, 'paise')).toBe('₹48,210');
    expect(formatValue(600, 'seconds')).toBe('10m');
    expect(formatValue(20, 'percent')).toBe('20%');
    expect(formatValue(3, 'count')).toBe('3');
    for (const unit of ['paise', 'seconds', 'percent', 'count'] as const) {
      expect(formatValue(null, unit)).toBe('—');
      expect(formatValue(undefined, unit)).toBe('—');
      expect(formatValue(NaN, unit)).toBe('—');
      expect(formatValue(Infinity, unit)).toBe('—');
    }
    expect(formatValue(0, 'paise')).toBe('₹0');
  });

  it('changes read as an arrow-ready percentage; no comparison gives nothing', () => {
    expect(formatChange(8.24)).toEqual({ text: '8.2%', direction: 'up' });
    expect(formatChange(-25)).toEqual({ text: '25%', direction: 'down' });
    expect(formatChange(0)).toEqual({ text: '0%', direction: 'flat' });
    expect(formatChange(0.02)).toEqual({ text: '0%', direction: 'flat' });
    expect(formatChange(null)).toEqual({ text: '', direction: 'none' });
    expect(formatChange(undefined)).toEqual({ text: '', direction: 'none' });
    expect(formatChange(NaN)).toEqual({ text: '', direction: 'none' });
  });

  it('whether a change is good news depends on the metric: more sales is good, more cancellations is not', () => {
    expect(changeTone('up', 'up')).toBe('good');
    expect(changeTone('down', 'up')).toBe('bad');
    expect(changeTone('up', 'down')).toBe('bad');
    expect(changeTone('down', 'down')).toBe('good');
    expect(changeTone('up', undefined)).toBe('neutral');
    expect(changeTone('flat', 'up')).toBe('neutral');
    expect(changeTone('none', 'down')).toBe('neutral');
  });
});
