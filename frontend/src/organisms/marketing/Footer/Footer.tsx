import React from 'react';
import { Coffee, Heart } from 'lucide-react';
import { APP_NAME } from '@/constants/app';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-slate-200 bg-white py-12 px-4 lg:px-8 text-slate-600">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center font-bold shadow-md shadow-red-600/20">
              <Coffee className="w-4 h-4" />
            </div>
            <span className="text-lg font-black text-slate-900">{APP_NAME}</span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed mb-4">
            Simple ordering and billing for cafés and restaurants — QR menus, a live kitchen screen, stock tracking, and clear fees.
          </p>
        </div>

        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3">What You Get</h4>
          <ul className="space-y-2 text-xs">
            <li><a href="#features" className="hover:text-red-600 transition-colors">QR Ordering</a></li>
            <li><a href="#features" className="hover:text-red-600 transition-colors">Live Kitchen Screen</a></li>
            <li><a href="#features" className="hover:text-red-600 transition-colors">Stock Tracking</a></li>
            <li><a href="#features" className="hover:text-red-600 transition-colors">Fees & Payments</a></li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3">Dashboards</h4>
          <ul className="space-y-2 text-xs">
            <li><a href="/admin" className="hover:text-red-600 transition-colors">Admin Dashboard</a></li>
            <li><a href="/dashboard" className="hover:text-red-600 transition-colors">Business Owner Dashboard</a></li>
            <li><a href="/c/artisan-cafe/t/tok_artisan_tbl_01" className="hover:text-red-600 transition-colors">Customer Ordering (Demo)</a></li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3">Pricing</h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            Plans from Free to ₹799/month, plus a 3% fee on each order — shown clearly in your dashboard.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pt-6 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between text-xs text-slate-500">
        <p>© 2026 {APP_NAME} SaaS Platform. Built for Production & High Concurrency.</p>
        <p className="flex items-center gap-1 mt-2 md:mt-0">
          Crafted with <Heart className="w-3.5 h-3.5 text-red-600 fill-red-600" /> using pure MERN Stack
        </p>
      </div>
    </footer>
  );
};
