import { OrderTrackerSections } from './types';

/** Larger screens: everything on one page, top to bottom, exactly as the order page always was. */
export const OrderTrackerDesktop = ({ sections }: { sections: OrderTrackerSections }) => (
  <>
    {sections.status}
    {sections.showWait && sections.wait}
    {sections.ordersCount > 0 && sections.orders}
    {sections.bill}
  </>
);

export default OrderTrackerDesktop;
