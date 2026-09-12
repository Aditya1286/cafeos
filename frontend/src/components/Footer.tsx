import React from 'react';
import { Coffee, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-slate-200 bg-white py-12 px-4 lg:px-8 text-slate-600">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center font-bold shadow-md shadow-red-600/20">
              <Coffee className="w-4 h-4" />
            </div>
            <span className="text-lg font-black text-slate-900">CaféOS</span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed mb-4">
            Next-generation multi-tenant SaaS platform empowering 10,000+ cafés & restaurants with contactless QR ordering, live KDS, inventory recipe BOM, and financial ledger settlements.
          </p>
        </div>

        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3">Platform</h4>
          <ul className="space-y-2 text-xs">
            <li><a href="#features" className="hover:text-red-600 transition-colors">QR Ordering</a></li>
            <li><a href="#features" className="hover:text-red-600 transition-colors">Kitchen Display System (KDS)</a></li>
            <li><a href="#features" className="hover:text-red-600 transition-colors">Inventory Recipe BOM</a></li>
            <li><a href="#features" className="hover:text-red-600 transition-colors">Financial Ledger</a></li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3">Interfaces</h4>
          <ul className="space-y-2 text-xs">
            <li><a href="/admin" className="hover:text-red-600 transition-colors">Super Admin Dashboard</a></li>
            <li><a href="/dashboard" className="hover:text-red-600 transition-colors">Café Owner Dashboard</a></li>
            <li><a href="/c/artisan-cafe/t/tok_artisan_tbl_01" className="hover:text-red-600 transition-colors">Customer Mobile Ordering</a></li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3">Monetization & Fees</h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            Configurable subscription plans (Free, ₹299/mo, ₹799/mo) and automated per-order platform fee engine with double-entry ledgers.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pt-6 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between text-xs text-slate-500">
        <p>© 2026 CaféOS SaaS Platform. Built for Production & High Concurrency.</p>
        <p className="flex items-center gap-1 mt-2 md:mt-0">
          Crafted with <Heart className="w-3.5 h-3.5 text-red-600 fill-red-600" /> using pure MERN Stack
        </p>
      </div>
    </footer>
  );
};
