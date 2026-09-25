import React from 'react';
import { FlaskConical } from 'lucide-react';

/** Marks a business a super admin has flagged as a demo (internal/test) account. */
export const DemoBadge = () => (
  <span
    title="Demo account — not counted in platform reports"
    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-extrabold whitespace-nowrap shrink-0"
  >
    <FlaskConical className="w-3 h-3" /> DEMO
  </span>
);

export default DemoBadge;
