import React from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { CaosLogo } from '@/molecules/CaosLogo';
import { APP_NAME } from '@/constants/app';
import { DEMO_MENU_PATH } from '@/constants/demo';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-slate-200 bg-white py-12 px-4 lg:px-8 text-slate-600">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <CaosLogo className="w-8 h-8 rounded-lg shadow-md shadow-red-600/20" />
            <span className="text-lg font-black text-slate-900">{APP_NAME}</span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed mb-4">
            Simple ordering and billing for cafés and restaurants — QR menus, a live kitchen screen,
            and clear money tracking.
          </p>
        </div>

        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3">
            What You Get
          </h4>
          <ul className="space-y-2 text-xs">
            <li>
              <Link to="/#features" className="hover:text-red-600 transition-colors">
                QR Ordering
              </Link>
            </li>
            <li>
              <Link to="/#features" className="hover:text-red-600 transition-colors">
                Live Kitchen Screen
              </Link>
            </li>
            <li>
              <Link to="/#features" className="hover:text-red-600 transition-colors">
                Refunds & Cancellations
              </Link>
            </li>
            <li>
              <Link to="/#features" className="hover:text-red-600 transition-colors">
                Payments & Sales
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3">
            Get started
          </h4>
          <ul className="space-y-2 text-xs">
            <li>
              <a href="/request-demo" className="hover:text-red-600 transition-colors">
                Start your free trial
              </a>
            </li>
            <li>
              <a href="/login" className="hover:text-red-600 transition-colors">
                Owner log in
              </a>
            </li>
            <li>
              <a href={DEMO_MENU_PATH} className="hover:text-red-600 transition-colors">
                Try the guest experience
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3">
            Pricing
          </h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            Plans from ₹999/month to ₹2,499/month. 2-week free trial.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pt-6 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between text-xs text-slate-500">
        <p>© 2026 {APP_NAME}. Ordering and billing for cafés and restaurants.</p>
        <p className="flex items-center gap-1 mt-2 md:mt-0">
          Made with <Heart className="w-3.5 h-3.5 text-red-600 fill-red-600" /> for cafés
        </p>
      </div>
    </footer>
  );
};
