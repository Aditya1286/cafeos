/**
 * The mascot's own lines (spec §9.3, §9.4), apart from the question bank. Placeholders are filled by
 * fillTemplate (services/copyTemplates.ts); a line whose placeholders cannot all be filled is skipped.
 *
 * Which placeholders each list may use (tests/copyBanks.test.ts enforces it):
 *  - welcomeFallbacks: {name}, {usual}
 *  - firstVisit:       {cafe}
 *  - categoryTip:      {category}, {dish}
 *  - houseSpecialTip:  {dish}, {cafe}, {category}
 *  - pairing:          {dish}, the suggested dish (the card around it names what it goes with)
 *  - pairingShare:     {dish}. These carry no number; use one only when the share is computed from
 *    at least 20 real orders (§9.1), because they say a fair number of guests add the dish.
 *
 * Copy rules: restate only what is true, promise no time ("soon", minutes), claim nothing the data
 * does not support. A category tip is only for a real best seller; a house-special line is the
 * café's own pick and never says "most ordered".
 */

export type CopyLine = { id: string; text: string };

export const MASCOT_COPY: {
  welcomeFallbacks: CopyLine[];
  firstVisit: CopyLine[];
  categoryTip: CopyLine[];
  houseSpecialTip: CopyLine[];
  pairing: CopyLine[];
  pairingShare: CopyLine[];
} = {
  // Used when no remembered answer gives a template. Order matters (§9.3): the lines that use the
  // guest's usual dish come first, then the ones with the name only.
  welcomeFallbacks: [
    { id: 'welcome-usual-1', text: 'Welcome back, {name}! Your usual {usual}?' },
    { id: 'welcome-usual-2', text: 'Good to see you again, {name}! Shall we do {usual} again?' },
    { id: 'welcome-usual-3', text: 'Hello again, {name}! Fancy your usual {usual}?' },
    { id: 'welcome-name-1', text: 'Welcome back, {name}!' },
    { id: 'welcome-name-2', text: '{name}! Good to see you again.' },
    { id: 'welcome-name-3', text: 'Hello again, {name}. Have a look around.' },
  ],

  // A guest we do not recognise, the first time in a session.
  firstVisit: [
    { id: 'first-visit-1', text: 'Welcome to {cafe}!' },
    { id: 'first-visit-2', text: 'Hello, and welcome to {cafe}. Have a look around.' },
    { id: 'first-visit-3', text: 'Namaste, and welcome to {cafe}! Take your pick.' },
  ],

  // The most-ordered item in the category now in view (real orders only, §8.3).
  categoryTip: [
    { id: 'category-tip-1', text: '{category}? Most ordered here: {dish}.' },
    { id: 'category-tip-2', text: 'Eyeing {category}? Guests here order {dish} the most.' },
    { id: 'category-tip-3', text: 'In {category}, the most ordered pick here is {dish}.' },
  ],

  // The café's own pick when a category has no real best seller. Labelled as a pick, never as popular.
  houseSpecialTip: [
    { id: 'house-special-1', text: 'Try our house special, {dish}.' },
    { id: 'house-special-2', text: "{cafe}'s own pick: {dish}. Give it a go?" },
    { id: 'house-special-3', text: 'A house special in {category}: {dish}. Worth a look.' },
  ],

  // "Goes well with your order" (§9.1): the dish regulars order together with this one.
  pairing: [
    { id: 'pairing-1', text: 'Goes well with this: {dish}.' },
    { id: 'pairing-2', text: 'A good match for your order: {dish}.' },
    { id: 'pairing-3', text: 'Guests often pair it with {dish}.' },
  ],

  // Only when the share of orders that add it is real and computed from at least 20 orders.
  pairingShare: [
    { id: 'pairing-share-1', text: 'Quite a few guests add {dish} with this.' },
    { id: 'pairing-share-2', text: 'Some guests like to add {dish} to this order.' },
  ],
};
