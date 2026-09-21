import { SupportTicketRaisedByType } from '../models/SupportTicket';

export interface SupportCategoryDef {
  value: string;
  label: string;
  subCategories: string[];
}

// Single source of truth for the support-ticket taxonomy. Kept backend-side so ticket
// creation is validated server-side; the frontend widget mirrors these values/labels.
export const CUSTOMER_SUPPORT_CATEGORIES: SupportCategoryDef[] = [
  {
    value: 'ORDER_ISSUE',
    label: 'Order Issue',
    subCategories: ['Wrong item received', 'Missing item', 'Order delayed', 'Order not received']
  },
  {
    value: 'PAYMENT_ISSUE',
    label: 'Payment Issue',
    subCategories: ['Payment deducted but order failed', 'Refund not received', 'Overcharged']
  },
  {
    value: 'FOOD_QUALITY',
    label: 'Food Quality',
    subCategories: ['Food quality / hygiene', 'Wrong preparation', 'Item unavailable after ordering']
  },
  {
    value: 'SERVICE_ISSUE',
    label: 'Service / Table',
    subCategories: ['Staff behavior', 'Table / seating issue', 'Long wait time']
  },
  {
    value: 'APP_ISSUE',
    label: 'App / Website Issue',
    subCategories: ["Page not loading", "Can't place order", 'OTP not received', 'Other technical issue']
  },
  { value: 'OTHER', label: 'Other', subCategories: [] }
];

export const BUSINESS_OWNER_SUPPORT_CATEGORIES: SupportCategoryDef[] = [
  {
    value: 'BILLING_SUBSCRIPTION',
    label: 'Billing & Subscription',
    subCategories: ['Plan upgrade/downgrade', 'Invoice issue', 'Payment failed']
  },
  {
    value: 'PAYOUTS_REMITTANCE',
    label: 'Payouts & Remittance',
    subCategories: ['Remittance not received', 'Incorrect payout amount', 'Bank details update']
  },
  {
    value: 'ACCOUNT_ACCESS',
    label: 'Account & Access',
    subCategories: ['Login issue', 'Staff account management', 'Change business details']
  },
  {
    value: 'TECHNICAL_BUG',
    label: 'Technical / Bug',
    subCategories: ['Dashboard error', 'QR/menu not working', 'Order sync issue']
  },
  { value: 'FEATURE_REQUEST', label: 'Feature Request', subCategories: [] },
  { value: 'OTHER', label: 'Other', subCategories: [] }
];

export const getCategoriesFor = (raisedByType: SupportTicketRaisedByType): SupportCategoryDef[] =>
  raisedByType === 'CUSTOMER' ? CUSTOMER_SUPPORT_CATEGORIES : BUSINESS_OWNER_SUPPORT_CATEGORIES;

export const isValidCategory = (raisedByType: SupportTicketRaisedByType, category: string): boolean =>
  getCategoriesFor(raisedByType).some((c) => c.value === category);

export const isValidSubCategory = (
  raisedByType: SupportTicketRaisedByType,
  category: string,
  subCategory?: string
): boolean => {
  if (!subCategory) return true; // subCategory is optional
  const categoryDef = getCategoriesFor(raisedByType).find((c) => c.value === category);
  return !!categoryDef && categoryDef.subCategories.includes(subCategory);
};
