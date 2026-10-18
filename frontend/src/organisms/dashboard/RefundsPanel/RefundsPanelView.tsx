import { useMediaQuery } from '@/hooks/useMediaQuery';
import { RefundsPanel as RefundsPanelDesktop, RefundsPanelProps } from './RefundsPanel';
import { RefundsPanelMobile } from './RefundsPanelMobile';

/** Refunds & Cancellations: the phone layout below `sm`, the original panel everywhere else. Two
 * separate components, so only one is ever mounted. */
export const RefundsPanel = (props: RefundsPanelProps) => {
  const isMobile = useMediaQuery('(max-width: 639px)');
  return isMobile ? <RefundsPanelMobile {...props} /> : <RefundsPanelDesktop {...props} />;
};

export default RefundsPanel;
