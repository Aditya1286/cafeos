/**
 * The quick-pick reasons a guest can tick under their star rating. Each belongs to one `theme` (what
 * it is about) so a café's reviews can be counted by theme later, and to the star ratings it is
 * offered for: warm ones for 4 and 5 stars, a mix for 3, and the things that go wrong for 1 and 2.
 * The wording is the café's guest's own voice, short enough to tap. Ids are stored with a review
 * and never change; the labels may.
 */
export const REVIEW_THEMES = ['food', 'speed', 'service', 'ambience', 'value', 'cleanliness'] as const;
export type ReviewTheme = (typeof REVIEW_THEMES)[number];

export interface ReviewTag {
  id: string;
  label: string;
  theme: ReviewTheme;
  /** The star ratings this reason is offered for. */
  ratings: number[];
}

const HIGH = [4, 5];
const MIDDLE = [3];
const LOW = [1, 2];

export const REVIEW_TAGS: ReviewTag[] = [
  // 4 and 5 stars: what went well
  { id: 'great-taste', label: 'Great taste', theme: 'food', ratings: HIGH },
  { id: 'fresh-and-hot', label: 'Fresh and hot', theme: 'food', ratings: HIGH },
  { id: 'quick-service', label: 'Quick service', theme: 'speed', ratings: HIGH },
  { id: 'friendly-staff', label: 'Friendly staff', theme: 'service', ratings: HIGH },
  { id: 'lovely-ambience', label: 'Lovely ambience', theme: 'ambience', ratings: HIGH },
  { id: 'worth-the-price', label: 'Worth the price', theme: 'value', ratings: HIGH },
  { id: 'clean-and-tidy', label: 'Clean and tidy', theme: 'cleanliness', ratings: HIGH },

  // 3 stars: fine, but what held it back
  { id: 'taste-was-okay', label: 'Taste was just okay', theme: 'food', ratings: MIDDLE },
  { id: 'waited-a-bit', label: 'Waited a bit long', theme: 'speed', ratings: MIDDLE },
  { id: 'service-was-okay', label: 'Service was okay', theme: 'service', ratings: MIDDLE },
  { id: 'fine-for-the-price', label: 'Fair for the price', theme: 'value', ratings: MIDDLE },
  { id: 'could-be-cleaner', label: 'Could be cleaner', theme: 'cleanliness', ratings: MIDDLE },
  { id: 'crowded-or-noisy', label: 'Crowded or noisy', theme: 'ambience', ratings: [2, 3] },

  // 1 and 2 stars: what went wrong
  { id: 'bland-or-off', label: 'Bland or tasted off', theme: 'food', ratings: LOW },
  { id: 'served-cold', label: 'Served cold', theme: 'food', ratings: LOW },
  { id: 'wrong-order', label: 'Wrong or missing item', theme: 'food', ratings: LOW },
  { id: 'long-wait', label: 'Too long a wait', theme: 'speed', ratings: LOW },
  { id: 'rude-staff', label: 'Staff were not helpful', theme: 'service', ratings: LOW },
  { id: 'overpriced', label: 'Too expensive for it', theme: 'value', ratings: LOW },
  { id: 'not-clean', label: 'Not clean', theme: 'cleanliness', ratings: LOW },
];

export const MAX_REVIEW_TAGS = 5;
export const MAX_REVIEW_COMMENT_LENGTH = 300;
