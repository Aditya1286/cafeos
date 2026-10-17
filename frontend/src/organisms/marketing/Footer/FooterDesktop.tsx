import React from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { CaosLogo } from '@/molecules/CaosLogo';
import { APP_NAME } from '@/constants/app';
import {
  FOOTER_COPYRIGHT,
  FOOTER_GROUPS,
  FOOTER_PRICING_NOTE,
  FOOTER_TAGLINE,
} from './footerContent';

/** Tablet and up: brand blurb, one column per link group, and the pricing note. */
export const FooterDesktop: React.FC = () => (
  <div className="py-12 px-4 lg:px-8">
    <div className="max-w-7xl mx-auto grid grid-cols-4 gap-8 mb-8">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <CaosLogo className="w-8 h-8 rounded-lg shadow-md shadow-red-600/20" />
          <span className="text-lg font-black text-slate-900">{APP_NAME}</span>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed mb-4">{FOOTER_TAGLINE}</p>
      </div>

      {FOOTER_GROUPS.map((group) => (
        <div key={group.title}>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3">
            {group.title}
          </h4>
          <ul className="space-y-2 text-xs">
            {group.links.map((link) => (
              <li key={link.label}>
                <Link to={link.to} className="hover:text-red-600 transition-colors">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3">Pricing</h4>
        <p className="text-xs text-slate-500 leading-relaxed">{FOOTER_PRICING_NOTE}</p>
      </div>
    </div>

    <div className="max-w-7xl mx-auto pt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
      <p>{FOOTER_COPYRIGHT}</p>
      <p className="flex items-center gap-1">
        Made with <Heart className="w-3.5 h-3.5 text-red-600 fill-red-600" /> for cafés
      </p>
    </div>
  </div>
);

export default FooterDesktop;
