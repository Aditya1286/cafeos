import { APP_NAME } from './app';

// How people reach us. Every contact link on the site (footer, WhatsApp button, privacy page,
// the demo banner) reads from here, so a changed number or handle is one edit.
export const CONTACT = {
  name: APP_NAME,
  address: 'Outer Ring Road, Panathur, Marathahalli, Bengaluru 560103',
  /** Digits only, with country code, as wa.me wants it. */
  whatsapp: '916006646578',
  whatsappDisplay: '+91 60066 46578',
  email: 'order.caosai@gmail.com',
  instagramHandle: 'order.caos',
  instagramUrl: 'https://instagram.com/order.caos',
};

export const whatsappLink = (message: string) =>
  `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(message)}`;

export const WHATSAPP_HELLO = `Hi! I'd like to know more about ${CONTACT.name} for my café.`;
