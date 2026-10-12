import { APP_NAME } from './app';

export interface Faq {
  q: string;
  a: string;
}

export const FAQS: Faq[] = [
  {
    q: 'What does it cost?',
    a: 'Plans start at ₹999 a month. It is one flat fee, and we never take a cut of your orders. Your first 2 weeks are free.',
  },
  {
    q: 'Is there a free trial?',
    a: 'Yes. Every plan starts with 2 weeks free. Tap Start your free trial, send us your details, and we will call you to get you set up. After the trial you choose the plan that fits, or tell us it is not for you.',
  },
  {
    q: 'Will my staff find it hard to use?',
    a: `No. The kitchen screen is one page: new orders appear, and one tap moves them along. ${APP_NAME} works in any web browser, so there is nothing to install.`,
  },
  {
    q: 'Do I need special equipment?',
    a: `No. ${APP_NAME} runs on the phones, tablets or laptops you already have. Guests use their own phones.`,
  },
  {
    q: 'Do my customers need to download an app?',
    a: 'No. Guests scan the QR code on their table and your menu opens right in their phone browser. They order without signing up.',
  },
  {
    q: 'Do you take a commission on my orders?',
    a: 'No. Customers pay you directly by UPI or cash, and that money is yours. You only pay your flat monthly fee.',
  },
  {
    q: 'Can I run more than one café?',
    a: 'Yes. You can run several branches, each with its own menu, tables and staff, from one owner dashboard.',
  },
];
