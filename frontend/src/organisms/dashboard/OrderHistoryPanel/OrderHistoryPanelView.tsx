import { useMediaQuery } from '@/hooks/useMediaQuery';
import {
  OrderHistoryPanel as OrderHistoryPanelDesktop,
  OrderHistoryPanelProps,
} from './OrderHistoryPanel';
import { OrderHistoryPanelMobile } from './OrderHistoryPanelMobile';

/** The Orders tab: the phone layout below `sm`, the original panel everywhere else. Two separate
 * components, so only one is ever mounted. */
export const OrderHistoryPanel = (props: OrderHistoryPanelProps) => {
  const isMobile = useMediaQuery('(max-width: 639px)');
  return isMobile ? (
    <OrderHistoryPanelMobile {...props} />
  ) : (
    <OrderHistoryPanelDesktop {...props} />
  );
};

export default OrderHistoryPanel;
