import React from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { CaosLogo } from '@/molecules/CaosLogo';
import { APP_NAME } from '@/constants/app';
import {
  FOOTER_COPYRIGHT,
  FOOTER_GROUPS,
  FOOTER_PRICING_NOTE,
  FOOTER_TAGLINE_SHORT,
} from './footerContent';

/** Phones: everything the desktop footer has, in about a third of the height. The brand and a
 * one-line tagline share a row, the link groups sit side by side, and the pricing note and the
 * small print close it out. */
export const FooterMobile: React.FC = () => (
  <div className="px-4 pt-7 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]">
    <div className="flex items-center gap-2.5">
      <CaosLogo className="w-8 h-8 rounded-lg shadow-md shadow-red-600/20 shrink-0" />
      <div className="min-w-0">
        <p className="text-sm font-black text-slate-900 leading-tight">{APP_NAME}</p>
        <p className="text-[11px] text-slate-500 leading-snug">{FOOTER_TAGLINE_SHORT}</p>
      </div>
    </div>

    <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-5">
      {FOOTER_GROUPS.map((group) => (
        <div key={group.title}>
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-900 mb-1.5">
            {group.title}
          </h4>
          <ul>
            {group.links.map((link) => (
              <li key={link.label}>
                {/* py-1.5 keeps each link a comfortable tap target without tall rows. */}
                <Link
                  to={link.to}
                  className="block py-1.5 text-xs text-slate-600 hover:text-red-600 transition-colors"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>

    <p className="mt-4 text-[11px] font-semibold text-slate-600">{FOOTER_PRICING_NOTE}</p>

    <div className="mt-4 pt-3 border-t border-slate-100 text-[10px] text-slate-400 leading-relaxed">
      <p>{FOOTER_COPYRIGHT}</p>
      <p className="flex items-center gap-1">
        Made with <Heart className="w-3 h-3 text-red-600 fill-red-600" /> for cafés
      </p>
    </div>
  </div>
);

export default FooterMobile;
