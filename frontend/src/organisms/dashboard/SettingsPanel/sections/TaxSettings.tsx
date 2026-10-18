import { GST_ENABLED_SLABS, isGstSlab } from '@/constants/gst';

interface TaxSettingsProps {
  business: any;
  saving: boolean;
  onSave: (rate: number) => void;
}

/** GST on orders: an on/off switch and, while on, the rate to charge. */
export const TaxSettings = ({ business, saving, onSave }: TaxSettingsProps) => {
  const currentTaxRate: number = business?.taxRatePercentage ?? 0;
  const taxEnabled = currentTaxRate > 0;
  // A rate saved before the GST 2.0 slabs were enforced (e.g. 12%) keeps applying until changed.
  const legacyTaxRate = taxEnabled && !isGstSlab(currentTaxRate);

  const handleToggleTax = () => {
    onSave(taxEnabled ? 0 : GST_ENABLED_SLABS[0].rate);
  };

  return (
    <div className="pt-4 border-t border-slate-100 space-y-2">
      <div className="flex items-center justify-between gap-4">
        <div>
          <label className="text-[10px] font-extrabold uppercase text-slate-400">
            GST / Tax on Orders
          </label>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">
            {taxEnabled
              ? 'New orders are taxed at the rate below, on top of the item total.'
              : 'Currently off — new orders are charged item total only, no tax added.'}
          </p>
        </div>
        <button
          onClick={handleToggleTax}
          disabled={saving}
          className={`shrink-0 relative w-14 h-8 rounded-full transition-colors disabled:opacity-50 ${
            taxEnabled ? 'bg-brand-600' : 'bg-slate-300'
          }`}
          title={taxEnabled ? 'GST enabled — click to disable' : 'GST disabled — click to enable'}
        >
          <span
            className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white shadow-md transition-transform ${
              taxEnabled ? 'translate-x-6' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {taxEnabled && (
        <div className="space-y-2 pt-1">
          <div className="grid grid-cols-2 gap-2 max-w-sm">
            {GST_ENABLED_SLABS.map(({ rate, hint }) => (
              <button
                key={rate}
                type="button"
                onClick={() => rate !== currentTaxRate && onSave(rate)}
                disabled={saving}
                className={`p-3 rounded-xl border text-left transition-all disabled:opacity-50 ${
                  rate === currentTaxRate
                    ? 'bg-brand-50 border-brand-400 shadow-sm'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div
                  className={`text-sm font-black ${rate === currentTaxRate ? 'text-brand-700' : 'text-slate-800'}`}
                >
                  {rate}%
                </div>
                <div className="text-[10px] font-semibold text-slate-400 leading-tight mt-0.5">
                  {hint}
                </div>
              </button>
            ))}
          </div>
          {legacyTaxRate && (
            <p className="text-[11px] font-bold text-amber-600">
              Orders are currently taxed at {currentTaxRate}%, which is no longer a GST slab for
              restaurants. Pick 5% or 18%.
            </p>
          )}
        </div>
      )}
    </div>
  );
};
