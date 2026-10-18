import { APP_NAME } from '@/constants/app';
import { DEMO_MENU_PATH, DEMO_PATH } from '@/constants/demo';
import { PLANS } from '@/constants/pricing';
import { CONTACT, WHATSAPP_HELLO, whatsappLink } from '@/constants/contact';

// Everything the footer says, in one place. FooterDesktop and FooterMobile only lay it out, so a new
// link or a changed line is one edit here and shows up in both.

export interface FooterLink {
  label: string;
  to: string;
  /** A link out of the app (WhatsApp, email, Instagram): rendered as a plain anchor. */
  external?: boolean;
}

export interface FooterGroup {
  title: string;
  links: FooterLink[];
}

export const FOOTER_TAGLINE =
  'Simple ordering and billing for cafés and restaurants — QR menus, a live kitchen screen, and clear money tracking.';

/** The one-line version for phones. */
export const FOOTER_TAGLINE_SHORT = 'QR ordering, a live kitchen screen and clear money tracking.';

export const FOOTER_GROUPS: FooterGroup[] = [
  {
    title: 'What you get',
    links: [
      { label: 'QR Ordering', to: '/#features' },
      { label: 'Live Kitchen Screen', to: '/#features' },
      { label: 'Refunds & Cancellations', to: '/#features' },
      { label: 'Payments & Sales', to: '/#features' },
    ],
  },
  {
    title: 'Get started',
    links: [
      { label: 'Start your free trial', to: DEMO_PATH },
      { label: 'Owner log in', to: '/login' },
      { label: 'Try the guest experience', to: DEMO_MENU_PATH },
    ],
  },
];

/** How to reach us. Shown by the desktop footer; the phone footer stays as compact as it was. */
export const FOOTER_CONTACT_GROUP: FooterGroup = {
  title: 'Talk to us',
  links: [
    { label: 'WhatsApp us', to: whatsappLink(WHATSAPP_HELLO), external: true },
    { label: CONTACT.email, to: `mailto:${CONTACT.email}`, external: true },
    { label: `Instagram @${CONTACT.instagramHandle}`, to: CONTACT.instagramUrl, external: true },
    { label: 'Privacy policy', to: '/privacy' },
    { label: 'Merchant terms', to: '/terms' },
  ],
};

/** Built from the plans themselves, so it can't drift from the pricing section. */
export const FOOTER_PRICING_NOTE = `Plans from ₹${PLANS[0].price}/month to ₹${
  PLANS[PLANS.length - 1].price
}/month. 2-week free trial.`;

export const FOOTER_COPYRIGHT = `© ${new Date().getFullYear()} ${APP_NAME}. Ordering and billing for cafés and restaurants.`;
