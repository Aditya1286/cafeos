// The request-a-demo quiz, as data: one question per screen, tap-to-choose only, then a short
// contact step. Change the wording here; the flow (organisms/marketing/DemoFunnel) just renders it.
//
// How it persuades, honestly:
// - It opens with the easiest question there is, so the first tap costs nothing.
// - The middle questions are the owner's own busy evening (orders, extras, the day's takings),
//   asked, never told. Answering them is where an owner notices what it is costing them.
// - Each answer gets a short reply that names the fix, and the last screen plays their answers back
//   as "what we'll show you", so the ask (name, café, phone) arrives once they've already said yes
//   to the problem.
// - No invented numbers, no fake countdowns, no pre-ticked consent.
//
// `key` and every option `value` are stable ids: the backend stores them with each lead and the
// Website report counts them, so rename the wording freely but keep the ids.

export interface DemoFunnelOption {
  value: string;
  label: string;
  /** Small line under the label. */
  hint?: string;
  /** Shown above the next question after this answer: a one-line reply that names the fix. */
  reply?: string;
  /** Fills the lead's `businessType` or `city` instead of only being a quiz answer. */
  field?: string;
  /** The owner admits a problem CAOS fixes: shown on the lead card under "Their problems". */
  pain?: boolean;
  /** Timeline answers only: how soon to call, shown as the lead's badge. */
  urgency?: DemoLeadUrgency;
}

/** How soon a lead wants CAOS running, from the `timeline` question. */
export type DemoLeadUrgency = 'hot' | 'warm' | 'later' | 'cold';

export interface DemoFunnelQuestion {
  key: string;
  /** Short title for the lead list, the email and the Website report. */
  adminTitle: string;
  question: string;
  /** One line under the question. */
  sub?: string;
  options: DemoFunnelOption[];
  /** Where this answer goes on the lead, when it is one of the lead's own fields. */
  leadField?: 'businessType' | 'city';
  /** Two columns from small phones up (short labels such as cities). */
  compact?: boolean;
  /** Put before a pain answer on the lead card when the answer alone doesn't say what it is about. */
  painPrefix?: string;
}

export const DEMO_FUNNEL_QUESTIONS: DemoFunnelQuestion[] = [
  {
    key: 'businessType',
    adminTitle: 'Business type',
    question: 'First things first. What do you run?',
    sub: 'Pick the closest one.',
    leadField: 'businessType',
    compact: true,
    options: [
      { value: 'cafe', label: 'Café', field: 'Café' },
      { value: 'restaurant', label: 'Restaurant / Bar', field: 'Restaurant / Bar' },
      { value: 'bakery', label: 'Bakery', field: 'Bakery' },
      { value: 'cloud-kitchen', label: 'Cloud kitchen', field: 'Cloud Kitchen' },
      { value: 'sweet-shop', label: 'Sweet shop', field: 'Sweet Shop' },
      { value: 'hotel', label: 'Hotel / Resort', field: 'Hotel / Resort' },
      { value: 'stall', label: 'Food stall / Kiosk', field: 'Food Stall / Kiosk' },
      { value: 'other', label: 'Something else', field: 'Other' },
    ],
  },
  {
    key: 'tables',
    adminTitle: 'Tables',
    question: 'On a busy evening, how many tables are full?',
    options: [
      { value: '1-5', label: '1 to 5', reply: 'Small and busy is where every missed order shows.' },
      { value: '6-15', label: '6 to 15', reply: 'That is a lot of hands waving for one waiter.' },
      { value: '16-30', label: '16 to 30', reply: 'At that size, every table needs its own menu.' },
      {
        value: '30-plus',
        label: 'More than 30',
        reply: 'Big floors are exactly where orders get lost.',
      },
      {
        value: 'takeaway',
        label: 'We are mostly takeaway',
        reply: 'The counter queue is where people give up.',
      },
    ],
  },
  {
    key: 'rushPain',
    adminTitle: 'What slips first in a rush',
    question: 'When the rush hits, what slips first?',
    sub: 'Be honest. Every café has one.',
    options: [
      {
        value: 'orders-mixed',
        pain: true,
        label: 'Orders get missed or mixed up',
        reply: 'With CAOS the order goes from the table straight to the kitchen, exactly as typed.',
      },
      {
        value: 'waiting',
        pain: true,
        label: 'Guests wait just to order',
        reply: 'With CAOS guests order from their own phone the moment they sit down.',
      },
      {
        value: 'payments',
        pain: true,
        label: 'Bills and payments don’t add up',
        reply: 'With CAOS every UPI payment and GST bill is tied to its order.',
      },
      {
        value: 'everything',
        pain: true,
        label: 'Honestly, everything at once',
        reply: 'That is the evening CAOS was built for.',
      },
    ],
  },
  {
    key: 'extras',
    adminTitle: 'Guests skip extras',
    painPrefix: 'Guests skip extras: ',
    question: 'How often do guests skip the extras?',
    sub: 'The dessert, the add-on, the second coffee.',
    options: [
      {
        value: 'often',
        pain: true,
        label: 'All the time',
        reply:
          'When nobody is standing over them, guests take their time and see what else there is.',
      },
      {
        value: 'sometimes',
        pain: true,
        label: 'Sometimes',
        reply:
          'Photos and best sellers on every phone do the suggesting your waiter has no time for.',
      },
      {
        value: 'never-checked',
        pain: true,
        label: 'I have never really checked',
        reply: 'Most owners haven’t. CAOS shows you what sells, item by item.',
      },
      {
        value: 'rarely',
        label: 'Rarely, my team upsells well',
        reply: 'Nice. CAOS keeps doing it when the team is stretched.',
      },
    ],
  },
  {
    key: 'salesKnown',
    adminTitle: 'Knows today’s sales',
    painPrefix: 'Today’s sales: ',
    question: 'Right now, do you know today’s sales to the rupee?',
    options: [
      {
        value: 'after-closing',
        pain: true,
        label: 'Only after I count at closing',
        reply: 'With CAOS today’s sales are on your phone before you close.',
      },
      {
        value: 'separately',
        pain: true,
        label: 'I check UPI and cash separately',
        reply: 'With CAOS cash and UPI land in one report, order by order.',
      },
      {
        value: 'manager',
        pain: true,
        label: 'My manager tells me',
        reply: 'With CAOS you see it yourself, from anywhere.',
      },
      {
        value: 'always',
        label: 'Yes, always',
        reply: 'Then you will like the best-seller and peak-hour views.',
      },
    ],
  },
  {
    key: 'city',
    adminTitle: 'City',
    question: 'Where is your café?',
    sub: 'So we call you at a sensible hour.',
    leadField: 'city',
    compact: true,
    options: [
      { value: 'mumbai', label: 'Mumbai', field: 'Mumbai' },
      { value: 'delhi-ncr', label: 'Delhi NCR', field: 'Delhi NCR' },
      { value: 'bengaluru', label: 'Bengaluru', field: 'Bengaluru' },
      { value: 'pune', label: 'Pune', field: 'Pune' },
      { value: 'hyderabad', label: 'Hyderabad', field: 'Hyderabad' },
      { value: 'chennai', label: 'Chennai', field: 'Chennai' },
      { value: 'kolkata', label: 'Kolkata', field: 'Kolkata' },
      { value: 'ahmedabad', label: 'Ahmedabad', field: 'Ahmedabad' },
      { value: 'jaipur', label: 'Jaipur', field: 'Jaipur' },
      { value: 'other', label: 'Somewhere else', field: 'Other' },
    ],
  },
  {
    key: 'timeline',
    adminTitle: 'Wants it running',
    question: 'If it fits, when would you want it running?',
    sub: 'No commitment. It helps us plan your setup.',
    options: [
      {
        value: 'this-week',
        label: 'This week',
        hint: 'We can set up your menu and QR codes on the call',
        urgency: 'hot',
      },
      { value: 'this-month', label: 'This month', urgency: 'warm' },
      { value: 'few-months', label: 'In a few months', urgency: 'later' },
      { value: 'exploring', label: 'Just looking for now', urgency: 'cold' },
    ],
  },
];

/** What the last screen promises, picked from their answers: the fix for what they told us hurts. */
export const DEMO_FUNNEL_PROMISES: Array<{ key: string; values: string[]; text: string }> = [
  {
    key: 'rushPain',
    values: ['orders-mixed', 'everything'],
    text: 'Orders going from the table straight to your kitchen',
  },
  {
    key: 'rushPain',
    values: ['waiting'],
    text: 'Guests ordering from their own phone, no waiting',
  },
  {
    key: 'rushPain',
    values: ['payments'],
    text: 'Every UPI payment and GST bill tied to its order',
  },
  {
    key: 'extras',
    values: ['often', 'sometimes', 'never-checked'],
    text: 'Photos and best sellers that help guests add more',
  },
  {
    key: 'salesKnown',
    values: ['after-closing', 'separately', 'manager'],
    text: 'Today’s sales on your phone, live',
  },
];

/** Always on the last screen, whatever they answered. */
export const DEMO_FUNNEL_ALWAYS = [
  '2 weeks free, no payment needed',
  'We set up your menu and QR codes with you',
];
