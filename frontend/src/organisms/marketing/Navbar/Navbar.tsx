import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Coffee, Shield, LayoutDashboard, QrCode, LogOut } from 'lucide-react';
import { getAuthToken, removeAuthToken } from '../services/api';
import { APP_NAME } from '../constants/app';

interface NavbarProps {
  user?: any;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const token = getAuthToken();

  const handleLogout = () => {
    removeAuthToken();
    if (onLogout) onLogout();
    navigate('/login');
  };

  return (
    <nav className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 lg:px-8 py-3.5 shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center shadow-md shadow-red-600/20 group-hover:scale-105 transition-transform">
            <Coffee className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-xl font-black tracking-tight text-slate-900 flex items-center gap-1.5">
              {APP_NAME} <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-bold border border-red-200">SaaS</span>
            </span>
            <p className="text-[10px] text-slate-500 font-semibold">Multi-Tenant Dining System</p>
          </div>
        </Link>

        {/* Quick Demo Shortcuts & Navigation */}
        <div className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-700">
          <a href="#features" className="hover:text-red-600 transition-colors">Features</a>
          <Link to="/pricing" className="hover:text-red-600 transition-colors">Pricing</Link>
          <Link to="/c/artisan-cafe/t/tok_artisan_tbl_01" className="flex items-center gap-1.5 text-xs bg-slate-100 hover:bg-slate-200/80 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-800 transition-all">
            <QrCode className="w-3.5 h-3.5 text-red-600" /> Customer QR Demo
          </Link>
        </div>

        {/* Auth Buttons / User Profile */}
        <div className="flex items-center gap-3">
          {token ? (
            <div className="flex items-center gap-3">
              {user?.role === 'SUPER_ADMIN' ? (
                <Link to="/admin" className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-all">
                  <Shield className="w-4 h-4 text-emerald-600" /> Super Admin
                </Link>
              ) : (
                <Link to="/dashboard" className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-all">
                  <LayoutDashboard className="w-4 h-4 text-red-600" /> Business Dashboard
                </Link>
              )}

              <button
                onClick={handleLogout}
                className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:text-red-600 hover:bg-red-50 transition-all"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className="px-4 py-2 text-xs font-bold text-slate-700 hover:text-red-600 transition-colors">
                Sign In
              </Link>
              <Link to="/register" className="px-5 py-2 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/20 transition-all">
                Start Free Trial
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};
