import React, { useState } from 'react';
import { 
  LayoutDashboard, BarChart3, ShoppingBag, Utensils, Grid, Users,
  Boxes, CreditCard, UserCheck, Flame, FileText, History, Settings,
  ChevronLeft, ChevronRight, ShieldCheck, Sparkles, LogOut, CheckCircle2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { APP_NAME } from '../../constants/app';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  user?: any;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  user,
  onLogout,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navGroups = [
    {
      title: 'MAIN',
      items: [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        { id: 'orders', label: 'Orders', icon: ShoppingBag },
        { id: 'menu', label: 'Menu', icon: Utensils },
        { id: 'tables', label: 'Tables', icon: Grid },
        { id: 'customers', label: 'Customers', icon: Users },
      ],
    },
    {
      title: 'OPERATIONS',
      items: [
        { id: 'inventory', label: 'Inventory', icon: Boxes },
        { id: 'payments', label: 'Payments', icon: CreditCard },
        { id: 'businesses', label: 'Businesses', icon: UserCheck },
        { id: 'kitchen', label: 'Kitchen KDS', icon: Flame },
      ],
    },
    {
      title: 'INSIGHTS',
      items: [
        { id: 'reports', label: 'Reports', icon: FileText },
        { id: 'audit', label: 'Audit Logs', icon: History },
      ],
    },
    {
      title: 'SYSTEM',
      items: [
        { id: 'settings', label: 'Settings', icon: Settings },
      ],
    },
  ];

  return (
    <aside
      className={`relative border-r border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/95 flex flex-col justify-between transition-all duration-300 z-30 select-none ${
        isCollapsed ? 'w-[72px]' : 'w-60'
      }`}
    >
      {/* Collapse Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3.5 top-7 w-7 h-7 rounded-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 flex items-center justify-center shadow-sm z-40 transition-colors"
        title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      {/* Top Header Logo */}
      <div>
        <div className="p-5 border-b border-slate-100 dark:border-zinc-800/80 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center text-white font-black text-lg shadow-md shadow-red-600/20 flex-shrink-0">
            ☕
          </div>
          {!isCollapsed && (
            <div>
              <h1 className="text-base font-black tracking-tight text-slate-900 dark:text-zinc-100 leading-tight">
                {APP_NAME}
              </h1>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                Admin Console
              </p>
            </div>
          )}
        </div>

        {/* Scrollable Nav Items */}
        <div className="p-3 space-y-6 overflow-y-auto max-h-[calc(100vh-220px)]">
          {navGroups.map((group) => (
            <div key={group.title}>
              {!isCollapsed && (
                <h3 className="px-3 text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-zinc-500 mb-2">
                  {group.title}
                </h3>
              )}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onTabChange(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all relative group ${
                        isActive
                          ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                          : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100/80 dark:hover:bg-zinc-800/60'
                      }`}
                    >
                      <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-500 dark:text-zinc-400 group-hover:text-slate-900 dark:group-hover:text-zinc-100'}`} />
                      {!isCollapsed && (
                        <span className="truncate">{item.label}</span>
                      )}

                      {/* Tooltip on Collapsed Hover */}
                      {isCollapsed && (
                        <div className="absolute left-14 px-2.5 py-1.5 rounded-lg bg-slate-900 dark:bg-zinc-800 text-white text-[11px] font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-lg z-50">
                          {item.label}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom System Status & User Profile */}
      <div className="p-3 border-t border-slate-100 dark:border-zinc-800/80 space-y-3">
        {/* System Operational Badge */}
        {!isCollapsed ? (
          <div className="px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 flex items-center justify-between text-[11px] font-bold text-emerald-800 dark:text-emerald-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              System Operational
            </span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-500 font-mono">v1.0.0</span>
          </div>
        ) : (
          <div className="flex justify-center" title="System Operational · v1.0.0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        )}

        {/* User Card */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/60 dark:border-zinc-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center font-black text-xs flex-shrink-0">
              {user?.name ? user.name.charAt(0) : 'A'}
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <div className="text-xs font-extrabold text-slate-900 dark:text-zinc-100 truncate">
                  {user?.name || 'Aditya'}
                </div>
                <div className="text-[10px] font-medium text-slate-400 dark:text-zinc-500 truncate">
                  Super Admin
                </div>
              </div>
            )}
          </div>

          {!isCollapsed && onLogout && (
            <button
              onClick={onLogout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-slate-200/50 dark:hover:bg-zinc-700/50 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
