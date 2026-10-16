import React from 'react';
import { FooterDesktop } from './FooterDesktop';
import { FooterMobile } from './FooterMobile';

/** The marketing footer. Phones and larger screens get their own layout of the same content
 * (footerContent.ts); CSS picks which one shows at the `md` breakpoint, so there is no
 * resize listener and no layout flash. */
export const Footer: React.FC = () => (
  <footer className="w-full border-t border-slate-200 bg-white text-slate-600">
    <div className="md:hidden">
      <FooterMobile />
    </div>
    <div className="hidden md:block">
      <FooterDesktop />
    </div>
  </footer>
);
