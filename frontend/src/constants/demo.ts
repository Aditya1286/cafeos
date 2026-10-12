// Where "Request a demo" submissions go. The landing page has no backend for leads, so the form
// opens WhatsApp with the details pre-filled. Digits only, with country code (e.g. '919876543210').
// Left empty on purpose: the form shows a "not connected yet" message until this is filled in.
export const DEMO_WHATSAPP_NUMBER = '';

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
// this seeded business, so what a visitor sees matches what the product tour shows.
export const DEMO_CAFE = {
  slug: 'bean-and-butter',
  name: 'Bean & Butter Artisan Bakery',
  tableToken: 'tok_bean_tbl_01',
  ownerEmail: 'owner@beanandbutter.com',
};

export const DEMO_MENU_PATH = `/c/${DEMO_CAFE.slug}/t/${DEMO_CAFE.tableToken}`;
