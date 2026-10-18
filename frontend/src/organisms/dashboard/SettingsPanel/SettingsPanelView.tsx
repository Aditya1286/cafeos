import { useMediaQuery } from '@/hooks/useMediaQuery';
import { SettingsPanel as SettingsPanelDesktop, SettingsPanelProps } from './SettingsPanel';
import { SettingsPanelMobile } from './SettingsPanelMobile';

/** The Settings tab: the tabbed phone layout below `sm`, the original panel everywhere else. Two
 * separate components, so only one is ever mounted. */
export const SettingsPanel = (props: SettingsPanelProps) => {
  const isMobile = useMediaQuery('(max-width: 639px)');
  return isMobile ? <SettingsPanelMobile {...props} /> : <SettingsPanelDesktop {...props} />;
};

export default SettingsPanel;
