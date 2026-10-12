// The headline numbers on the landing page. Each is a plain fact about how the product or the offer
// works (no usage claims): the big figure, what it measures, and an optional unit shown smaller.
export interface HeadlineStat {
  value: string;
  unit?: string;
  label: string;
}

export const HEADLINE_STATS: HeadlineStat[] = [
  { value: '0', label: 'Apps for guests to download' },
  { value: '1', unit: 'scan', label: 'From table to kitchen' },
  { value: '100', unit: '%', label: 'Orders from verified phones' },
  { value: '14', unit: 'days', label: 'Free to try it' },
];
