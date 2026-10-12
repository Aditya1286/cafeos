import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { CaosLogo } from '@/molecules/CaosLogo';
import { APP_NAME } from '@/constants/app';
import { DEMO_PATH } from '@/constants/demo';

/** Small "Powered by" banner for customer-facing pages: it credits the platform and invites the
 * café owner or anyone else who runs a café to try it. Opens in a new tab so a guest never loses
 * their order page. */
export const PoweredByCaos: React.FC = () => (
  <a
    href={DEMO_PATH}
    target="_blank"
    rel="noopener noreferrer"
    className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition-colors hover:border-red-200 hover:bg-red-50/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
  >
    <CaosLogo className="w-9 h-9 rounded-xl shadow-md shadow-red-600/20" />
    <span className="min-w-0 flex-1 text-left">
      <span className="block text-xs font-black text-slate-900">Powered by {APP_NAME}</span>
      <span className="block text-[11px] font-medium text-slate-500 truncate">
        Run a café? Get QR ordering like this, free for 2 weeks.
      </span>
    </span>
    <ArrowUpRight
      aria-hidden="true"
      className="w-4 h-4 shrink-0 text-slate-400 transition-colors group-hover:text-red-600"
    />
  </a>
);

export default PoweredByCaos;
