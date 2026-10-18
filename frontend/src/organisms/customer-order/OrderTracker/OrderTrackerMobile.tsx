import { SwipeTabs, SwipeTab } from '@/molecules/SwipeTabs';
import { OrderTrackerSections } from './types';

export type TrackerTabId = 'status' | 'bill' | 'wait' | 'orders';

/** The tabs this order has: Status and Bill always, the others only when they have something. */
export const trackerTabs = (sections: OrderTrackerSections): SwipeTab[] => [
  { id: 'status', label: 'Status' },
  { id: 'bill', label: 'Bill' },
  ...(sections.showWait ? [{ id: 'wait', label: 'While you wait' }] : []),
  ...(sections.ordersCount > 0
    ? [{ id: 'orders', label: 'My orders', badge: sections.ordersCount }]
    : []),
];

/** The tab to show: the chosen one, or Status when it has gone (the other orders finished). */
export const resolveTrackerTab = (tab: string, sections: OrderTrackerSections): TrackerTabId =>
  (trackerTabs(sections).some((t) => t.id === tab) ? tab : 'status') as TrackerTabId;

interface OrderTrackerMobileProps {
  sections: OrderTrackerSections;
  tab: string;
  onTabChange: (tab: string) => void;
}

/** Phones: one section at a time. Pick a tab, or swipe left and right, instead of scrolling past
 * the whole order card to reach the bill. */
export const OrderTrackerMobile = ({ sections, tab, onTabChange }: OrderTrackerMobileProps) => {
  const active = resolveTrackerTab(tab, sections);
  const panels: Record<TrackerTabId, React.ReactNode> = {
    status: sections.status,
    bill: sections.bill,
    wait: sections.wait,
    orders: sections.orders,
  };
  return (
    <SwipeTabs tabs={trackerTabs(sections)} active={active} onChange={onTabChange}>
      {panels[active]}
    </SwipeTabs>
  );
};

export default OrderTrackerMobile;
