export type TourScreenId = 'guest' | 'kitchen' | 'orders' | 'tables' | 'numbers';

export interface TourStep {
  id: TourScreenId;
  /** Short label on the tab. */
  tab: string;
  /** What the owner gets, in one line. */
  title: string;
  body: string;
  points: string[];
}

// Copy for the landing page's product tour. Each step is an outcome for the owner, shown next
// to a recreation of the real screen that delivers it.
export const TOUR_STEPS: TourStep[] = [
  {
    id: 'guest',
    tab: 'Guests order',
    title: 'Guests order the moment they sit down',
    body: 'They scan the table QR and your menu opens in their phone. No app to install, no waiting for a waiter.',
    points: ['Search and veg / non-veg filters', 'Live progress on their own phone'],
  },
  {
    id: 'kitchen',
    tab: 'Kitchen',
    title: 'Your kitchen sees every order instantly',
    body: 'Orders land on one screen and move from new to ready with a single tap, or a whole batch at once. No paper slips, no shouting.',
    points: ['New, preparing, ready', 'Updates live, no refreshing'],
  },
  {
    id: 'orders',
    tab: 'Orders & bills',
    title: 'Every order, bill and payment in one list',
    body: 'Find any order in seconds, see what is paid and what is not, and hand over a GST-ready bill.',
    points: ['Search by name, phone or table', 'Paid and unpaid at a glance'],
  },
  {
    id: 'numbers',
    tab: 'Your numbers',
    title: 'Know exactly what you earned',
    body: 'Sales by day, how many guests come back, and how fast your kitchen really is.',
    points: ['Daily sales report', 'Repeat customers and order speed'],
  },
];
