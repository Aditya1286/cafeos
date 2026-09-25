// Mirrors backend/src/utils/supportCategories.ts — kept in sync manually since the two
// codebases don't share a package. Any category/subcategory the widget sends must exist here
// AND there, or the backend's isValidCategory/isValidSubCategory rejects it.

export interface SupportCategoryDef {
  value: string;
  label: string;
  subCategories: string[];
}

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
  { value: 'OTHER', label: 'Something else', subCategories: [] }
];

export const BUSINESS_OWNER_SUPPORT_CATEGORIES: SupportCategoryDef[] = [
  {
    value: 'BILLING_SUBSCRIPTION',
    label: 'Billing & Subscription',
    subCategories: ['Plan upgrade/downgrade', 'Bill / receipt issue', 'Payment failed']
  },
  {
    value: 'PAYOUTS_REMITTANCE',
    label: 'Fees & Payments',
    subCategories: ['Fee payment not marked as paid', 'Wrong fee amount', 'Bank details update']
  },
  {
    value: 'ACCOUNT_ACCESS',
    label: 'Account & Access',
    subCategories: ['Login issue', 'Staff account management', 'Change business details']
  },
  {
    value: 'TECHNICAL_BUG',
    label: 'Something not working',
    subCategories: ['Dashboard error', 'QR/menu not working', 'Orders not updating']
  },
  { value: 'FEATURE_REQUEST', label: 'Feature Request', subCategories: [] },
  { value: 'OTHER', label: 'Something else', subCategories: [] }
];

export const getSupportCategories = (mode: 'CUSTOMER' | 'BUSINESS_OWNER'): SupportCategoryDef[] =>
  mode === 'CUSTOMER' ? CUSTOMER_SUPPORT_CATEGORIES : BUSINESS_OWNER_SUPPORT_CATEGORIES;
