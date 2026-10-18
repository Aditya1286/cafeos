import { SMEPAY_CHECKOUT_ENABLED } from '@/constants/features';
import { OrderHistoryFilters } from '@/hooks/useOrderHistory';

// The choices in the Orders filters, as data, for the phone layout (the desktop panel lists the
// same ones in its dropdowns).
export interface FilterChoice<V extends string = string> {
  value: V;
  label: string;
}

/** Status is one tap on the row of pills, since it is the filter used most. */
export const STATUS_PILLS: FilterChoice[] = [
  { value: 'ALL', label: 'All' },
  { value: 'PLACED', label: 'New' },
  { value: 'PREPARING', label: 'Preparing' },
  { value: 'READY', label: 'Ready' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'REFUNDED', label: 'Refunded' },
];

export const PAYMENT_CHOICES: FilterChoice[] = [
  { value: 'ALL', label: 'Any payment' },
  { value: 'PAID', label: 'Paid' },
  { value: 'UNPAID', label: 'Unpaid / pending' },
  { value: 'REFUNDED', label: 'Refunded' },
];

export const METHOD_CHOICES: FilterChoice[] = [
  { value: 'ALL', label: 'Any method' },
  { value: 'ONLINE', label: SMEPAY_CHECKOUT_ENABLED ? 'Online (direct UPI)' : 'Online' },
  ...(SMEPAY_CHECKOUT_ENABLED ? [{ value: 'CHECKOUT', label: 'Online checkout (SMEPay)' }] : []),
  { value: 'CASH', label: 'Cash' },
  { value: 'CARD', label: 'Credit / debit card' },
];

export const DATE_CHOICES: FilterChoice<OrderHistoryFilters['dateFilter']>[] = [
  { value: 'ALL', label: 'All time' },
  { value: 'TODAY', label: 'Today' },
  { value: 'YESTERDAY', label: 'Yesterday' },
  { value: '7DAYS', label: 'Last 7 days' },
];

export const labelOf = (choices: FilterChoice[], value: string) =>
  choices.find((c) => c.value === value)?.label ?? value;
