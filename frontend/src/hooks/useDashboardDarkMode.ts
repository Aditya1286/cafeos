import { useEffect, useState } from 'react';
import { APP_SLUG } from '@/constants/app';

// One dark-mode preference for both dashboards, remembered per browser. Storage can be unavailable
// (private windows, blocked site data), so it is only a convenience: the toggle works without it.
const KEY = `${APP_SLUG}_dashboard_dark_mode`;
// The super admin dashboard used to keep its own setting; honour it until a new choice is saved.
const LEGACY_KEY = `${APP_SLUG}_super_admin_dark_mode`;
const CLASS_NAME = 'dashboard-dark';
// Present whenever a dashboard is open (light or dark): switches on the dashboard-only colour rules.
const UI_CLASS = 'dashboard-ui';

const readSaved = (): boolean => {
  try {
    const saved = localStorage.getItem(KEY) ?? localStorage.getItem(LEGACY_KEY);
    return saved === '1';
  } catch {
    return false;
  }
};

/**
 * Dark mode for a dashboard page. Re-maps the page's light classes (styles/dashboardTheme.css) by
 * putting a class on <html>, so portalled menus and modals follow it too; the classes come off again
 * when the dashboard unmounts, leaving the landing and customer pages untouched.
 */
export const useDashboardDarkMode = () => {
  const [darkMode, setDarkMode] = useState(readSaved);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add(UI_CLASS);
    return () => root.classList.remove(UI_CLASS);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle(CLASS_NAME, darkMode);
    try {
      localStorage.setItem(KEY, darkMode ? '1' : '0');
    } catch {
      // Not remembered this time; the toggle itself still works.
    }
    return () => root.classList.remove(CLASS_NAME);
  }, [darkMode]);

  return { darkMode, toggleDarkMode: () => setDarkMode((d) => !d) };
};
