import React from 'react';
import { HeaderViewProps } from './types';
import { HeaderBrand, LiveOrdersPill, AddItemButton, RefreshButton, UserMenu } from './HeaderParts';

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
}: HeaderViewProps) => (
  <div className="max-w-7xl mx-auto px-8">
    <div className="h-16 flex items-center justify-between gap-4 border-b border-slate-800/80">
      <HeaderBrand business={business} copiedUrl={copiedUrl} onCopyMenuUrl={onCopyMenuUrl} />
      <LiveOrdersPill activeOrdersCount={activeOrdersCount} />
      <div className="flex items-center gap-2 shrink-0">
        <AddItemButton onAddItem={onAddItem} />
        <RefreshButton loading={loading} onRefresh={onRefresh} showLabel />
        <UserMenu user={user} onOpenProfile={onOpenProfile} />
      </div>
    </div>

    {/* 9 pills need roughly 1000px to fit without crowding, which is why this view only takes
        over at `lg`. overflow-x-auto is a safety net in case a longer label set or larger badge
        count outgrows the row. */}
    <div className="flex items-center gap-2 py-2.5 overflow-x-auto">
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
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-slate-500'}`} />
            <span>{tab.label}</span>
            {badge !== null && badge > 0 && (
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                  active
                    ? 'bg-white/30 text-white'
                    : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
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
);

export default DashboardHeaderDesktop;
