import React from 'react';
import { Moon, Sun } from 'lucide-react';

/** Light/dark switch shared by the owner and super admin dashboards (the theme itself: styles/dashboardTheme.css). */
export const ThemeToggle = ({
  darkMode,
  onToggle,
}: {
  darkMode: boolean;
  onToggle: () => void;
}) => {
  const label = darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode';
  return (
    <button
      onClick={onToggle}
      title={label}
      aria-label={label}
      aria-pressed={darkMode}
      className="shrink-0 p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
    >
      {darkMode ? (
        <Sun className="w-4 h-4 text-amber-500" />
      ) : (
        <Moon className="w-4 h-4 text-slate-500" />
      )}
    </button>
  );
};

export default ThemeToggle;
