import type { ReactNode } from 'react';

/** What the guest order page has to show, already built. The two layouts below only arrange it. */
export interface OrderTrackerSections {
  /** The order card: number, payment pill and the progress stepper. */
  status: ReactNode;
  /** Payment (online orders) and the itemised bill. */
  bill: ReactNode;
  /** "While you wait" pairings and the daily question; only when the café identity is on. */
  wait?: ReactNode;
  showWait: boolean;
  /** The customer's other orders in progress. */
  orders?: ReactNode;
  ordersCount: number;
}
