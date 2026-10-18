import { useMediaQuery } from '@/hooks/useMediaQuery';
import { TablesQrPanel as TablesQrPanelDesktop, TablesQrPanelProps } from './TablesQrPanel';
import { TablesQrPanelMobile } from './TablesQrPanelMobile';

/** Tables & QR: the phone layout below `sm`, the original panel everywhere else. Two separate
 * components, so only one is ever mounted. */
export const TablesQrPanel = (props: TablesQrPanelProps) => {
  const isMobile = useMediaQuery('(max-width: 639px)');
  return isMobile ? <TablesQrPanelMobile {...props} /> : <TablesQrPanelDesktop {...props} />;
};

export default TablesQrPanel;
