interface BusinessDetailsProps {
  business: any;
  /** The grid's layout; the default is one column on a phone and two from `sm` up. */
  className?: string;
}

/** Address, contact phone, opening hours and currency. */
export const BusinessDetails = ({
  business,
  className = 'grid grid-cols-1 sm:grid-cols-2 gap-4',
}: BusinessDetailsProps) => (
  <div className={className}>
    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
      <span className="text-[10px] font-extrabold uppercase text-slate-400">Address</span>
      <div className="text-xs font-extrabold text-slate-800">
        {business?.address || 'Bandra West, Mumbai'}
      </div>
    </div>

    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
      <span className="text-[10px] font-extrabold uppercase text-slate-400">Contact Phone</span>
      <div className="text-xs font-extrabold text-slate-800">
        {business?.phone || '+91 9876501234'}
      </div>
    </div>

    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
      <span className="text-[10px] font-extrabold uppercase text-slate-400">Opening Hours</span>
      <div className="text-xs font-extrabold text-slate-800">
        {business?.openingTime || '08:00'} – {business?.closingTime || '23:00'}
      </div>
    </div>

    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
      <span className="text-[10px] font-extrabold uppercase text-slate-400">Currency</span>
      <div className="text-xs font-extrabold text-slate-800">{business?.currency || 'INR'} (₹)</div>
    </div>
  </div>
);
