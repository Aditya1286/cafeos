import { useState } from 'react';
import { SwipeTabs } from '@/molecules/SwipeTabs';
import { SettingsPanelProps } from './SettingsPanel';
import { MOBILE_SECTIONS } from './mobileSections';

/**
 * The Settings tab on a phone: the same settings as the desktop panel, split into tabs instead of
 * one long page. Swipe left and right, or tap a tab. What the tabs are lives in `./mobileSections`.
 */
export const SettingsPanelMobile = (props: SettingsPanelProps) => {
  const [tab, setTab] = useState(MOBILE_SECTIONS[0].id);

  const sections = MOBILE_SECTIONS.filter((s) => s.isVisible?.(props) ?? true);
  // A tab that has gone (for example Café look being switched off) falls back to the first.
  const active = sections.find((s) => s.id === tab) ?? sections[0];

  return (
    <SwipeTabs
      tabs={sections.map(({ id, label }) => ({ id, label }))}
      active={active.id}
      onChange={setTab}
      variant="dashboard"
    >
      {active.render(props)}
    </SwipeTabs>
  );
};

export default SettingsPanelMobile;
