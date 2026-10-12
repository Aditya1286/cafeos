// Plans and the shared inclusions shown in the landing page's pricing section. Prices are
// display copy for now; the billing plans themselves live in the backend.

export interface PricingPlan {
  name: string;
  price: string;
  tagline: string;
  includesLabel: string;
  items: string[];
  popular?: boolean;
}

export const PLANS: PricingPlan[] = [
  {
    name: 'Essential',
    price: '999',
    tagline: 'Smooth, mistake-free service.',
    includesLabel: 'Includes:',
    items: [
      'QR per table',
      'Phone ordering',
      'Instant kitchen alerts',
      'Live order tracking',
      'Verified customers',
      'Direct UPI payments',
      'GST bills',
      'Daily sales report',
    ],
  },
  {
    name: 'Pro',
    price: '2,499',
    tagline: 'See what sells. Bring regulars back.',
    includesLabel: 'Everything in Essential, plus:',
    popular: true,
    items: [
      'Best-seller ranking',
      'Peak-hour insights',
      'Refund tracking',
      'Full payment history',
      'Unlimited tables, dishes',
      'WhatsApp marketing',
      'Regulars list',
      'Win-back messages',
      'Targeted offers',
    ],
  },
];

export const EVERY_PLAN = ['Staff logins', 'Free onboarding', 'Real people to help'];
