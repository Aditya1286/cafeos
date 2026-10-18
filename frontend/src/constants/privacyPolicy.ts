import { CONTACT } from './contact';
import { APP_NAME } from './app';

// The privacy policy, as data: PrivacyPage only lays it out. Edit the wording here.
export interface PolicySection {
  title: string;
  /** Paragraphs shown before the list. */
  body?: string[];
  bullets?: string[];
}

export const PRIVACY_UPDATED = '2026-10-18';

export const PRIVACY_SECTIONS: PolicySection[] = [
  {
    title: 'Who we are',
    body: [
      `${CONTACT.name} ("we", "us") provides ${APP_NAME}, a QR ordering, kitchen and point-of-sale platform for cafés and restaurants. We are based at ${CONTACT.address}, India.`,
      'Two kinds of people use the platform, and we treat their data differently:',
    ],
    bullets: [
      'Café owners and staff ("Merchants") who sign up. For their account and business data, we decide why and how it is used.',
      "Guests who order at a café that uses us. For a guest's order data, the café decides why it is collected, and we process it on the café's behalf to run the service.",
    ],
  },
  {
    title: 'What we collect',
    bullets: [
      'From Merchants: name, email, phone number, business name and address, opening hours, menu, tables and staff details, login credentials (stored hashed), subscription and billing details, and messages you send us.',
      'From Guests: name, mobile number, the items ordered, order notes, table, order time, payment status, and whether the number was verified by OTP. We do not collect your card details. If online payment is turned on, a payment provider handles it.',
      "Automatically: device and browser type, IP address, pages viewed, error logs, and small items kept in your browser (for example, to remember your recent orders and a café's look). We do not use these for advertising.",
      'On our website: what you enter when you request a demo (name, business, city, phone or email).',
    ],
  },
  {
    title: 'Why we use it',
    bullets: [
      'To run the service: take and show orders, update the kitchen, produce bills and reports.',
      'To verify a mobile number with a one-time password before an order.',
      'To support Merchants, answer requests and fix problems.',
      'To keep the platform secure and prevent misuse and fraud.',
      'To meet legal, tax and accounting obligations.',
      'To improve the product, using combined information where we can.',
    ],
    body: [
      'We use personal data with your consent, or where the law allows it, such as to do what you asked, to meet a legal duty, or for security.',
    ],
  },
  {
    title: 'Who we share it with',
    bullets: [
      'The café you order from, which sees your name, number and orders.',
      'Service providers that help us run the platform: cloud hosting, SMS and OTP delivery, payment processing where it is turned on, and email or support tools.',
      'Authorities, where the law requires it.',
      'A successor, if our business is sold or merged, under the same commitments as this policy.',
    ],
    body: ['We do not sell personal data.'],
  },
  {
    title: 'Our demo café',
    body: [
      'Our public demo café, Loamline Coffee Roasters, is fictional and its orders are simulated. Its customer names, phone numbers and emails belong to nobody.',
      'Ordering there works like in any café, including verifying your phone number. Orders placed in the demo, with the name and number you entered, are deleted a few hours later, and phone numbers in the demo owner view are partly hidden. If you would rather not use your own number, please contact us and we will walk you through the demo.',
    ],
  },
  {
    title: 'How long we keep it',
    bullets: [
      'Merchant account data: while the account is active, and afterwards for as long as the law requires.',
      "Guest order data: kept for the café's records so it can handle bills, refunds and tax. Billing records may need to be kept for longer to meet legal requirements.",
      'Demo requests from this website: for as long as needed to follow up with you.',
    ],
  },
  {
    title: 'Security',
    body: [
      "We use access controls, hashed passwords, encrypted connections and separation of each café's data. No system is perfectly secure. If a breach affects your personal data in a way the law requires us to report, we will tell you and the relevant authority as required.",
    ],
  },
  {
    title: 'Your rights',
    body: ['You may ask us to:'],
    bullets: [
      'tell you what personal data of yours we hold and how it is used;',
      'correct or update it;',
      'erase it, where we are not required to keep it;',
      'withdraw your consent (this does not undo what we did before you withdrew it);',
      'nominate another person to use these rights for you if you cannot;',
      'look into a complaint.',
    ],
  },
  {
    title: 'Children',
    body: [
      `${APP_NAME} is not meant for people under 18 to hold accounts. A guest under 18 should order with a parent or guardian, and we do not knowingly collect a child's data for any other purpose.`,
    ],
  },
  {
    title: 'Where data is stored',
    body: [
      'Data is stored with our cloud hosting provider. If a provider processes it outside India, we require it to protect it to the standard this policy describes.',
    ],
  },
  {
    title: 'Cookies and local storage',
    body: [
      "We use browser storage that the platform needs to work, for example to keep you signed in, remember your recent orders and apply a café's look. We do not use advertising cookies.",
    ],
  },
  {
    title: 'Changes',
    body: [
      'We may update this policy. We will change the date at the top and, for significant changes, tell Merchants by email or in the dashboard.',
    ],
  },
  {
    title: 'Contact and grievances',
    body: [
      `To use your rights or raise a complaint, write to ${CONTACT.email} or message us on WhatsApp at ${CONTACT.whatsappDisplay}. Please say which café you ordered from, if it is about an order. For guest order data we may pass your request to the café so it can respond.`,
      `${CONTACT.name}, ${CONTACT.address}.`,
    ],
  },
];
