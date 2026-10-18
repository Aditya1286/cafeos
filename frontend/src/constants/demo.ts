export const DEMO_PATH = '/request-demo';

export const BUSINESS_TYPES = [
  'Café',
  'Restaurant / Bar',
  'Bakery',
  'Cloud Kitchen',
  'Sweet Shop',
  'Hotel / Resort',
  'Food Stall / Kiosk',
  'Other',
];

// The public demo café: every "try the guest experience" link and the owner demo login point at
// this café, so what a visitor sees matches what the product tour shows. It is one of the
// simulated cafés in backend/src/demo, which keeps it busy with orders and history; its owner
// login is read-only and shows guests' phone numbers partly hidden (see backend demoGuard.ts).
export const DEMO_CAFE = {
  slug: 'loamline-coffee',
  name: 'Loamline Coffee Roasters',
  tableToken: 'demo-loamline-coffee-t1',
  ownerEmail: 'owner.loamline-coffee@example.com',
  // Must equal `demo.accountPassword` in the backend config. It is public by design: the account
  // is read-only. While it is empty, the "demo owner" button on the login page is hidden.
  ownerPassword: 'jojoisdead',
};

export const DEMO_MENU_PATH = `/c/${DEMO_CAFE.slug}/t/${DEMO_CAFE.tableToken}`;
