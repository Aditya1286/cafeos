import React from 'react';
import { HeaderViewProps } from './types';
import { ThemeToggle } from '@/molecules/ThemeToggle';
import {
  HeaderBrand,
  logoClickFor,
  LiveOrdersPill,
  AddItemButton,
  RefreshButton,
  UserMenu,
} from './HeaderParts';

/** Desktop (`lg`+) header: brand + live status + actions, then the full row of section tabs. */
export const DashboardHeaderDesktop = ({
  user,
  business,
  activeOrdersCount,
  tabs,
  activeTab,
  onChangeTab,
  badgeFor,
  copiedUrl,
  onCopyMenuUrl,
  loading,
  onRefresh,
  onAddItem,
  onOpenProfile,
  darkMode,
  onToggleDarkMode,
}: HeaderViewProps) => (
  <div className="max-w-7xl mx-auto px-8">
    <div className="h-16 flex items-center justify-between gap-4 border-b border-slate-100">
      <HeaderBrand
        business={business}
        copiedUrl={copiedUrl}
        onCopyMenuUrl={onCopyMenuUrl}
        onLogoClick={logoClickFor(tabs, onChangeTab)}
      />
      <LiveOrdersPill activeOrdersCount={activeOrdersCount} />
      <div className="flex items-center gap-2 shrink-0">
        <AddItemButton onAddItem={onAddItem} />
        <RefreshButton loading={loading} onRefresh={onRefresh} showLabel />
        <ThemeToggle darkMode={darkMode} onToggle={onToggleDarkMode} />
        <UserMenu user={user} onOpenProfile={onOpenProfile} />
      </div>
    </div>

    {/* 9 pills need roughly 1000px to fit without crowding, which is why this view only takes
        over at `lg`. overflow-x-auto is a safety net in case a longer label set or larger badge
        count outgrows the row. The inner row is `w-max mx-auto`, not `justify-center`: auto
        margins centre it while it fits and collapse to zero when it overflows, so the first tabs
        stay reachable by scrolling (a centred flex row would clip them off the left edge). */}
    <div className="py-2.5 overflow-x-auto">
      <div className="flex items-center gap-2 w-max mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          const badge = badgeFor(tab.id);
          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap relative ${
                active
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-600/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
              {badge !== null && badge > 0 && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                    active
                      ? 'bg-white/30 text-white'
                      : 'bg-brand-50 text-brand-700 border border-brand-200'
                  }`}
                >
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  </div>
);

export default DashboardHeaderDesktop;
