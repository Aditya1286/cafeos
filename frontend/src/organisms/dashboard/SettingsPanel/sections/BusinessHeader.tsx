import { Copy, Check } from 'lucide-react';
import { BusinessLogoEditor } from './BusinessLogoEditor';

interface BusinessHeaderProps {
  business: any;
  copiedUrl: boolean;
  onCopyMenuUrl: () => void;
  /** `stacked` puts the copy button under the name, for a narrow phone screen. */
  layout?: 'row' | 'stacked';
  savingLogo?: boolean;
  /** Picks a new logo. Leave out (with `onRemoveLogo`) for a view that may not change it. */
  onUploadLogo?: (file: File) => void;
  onRemoveLogo?: () => void;
}

/** The business's logo, name and short link, and a button that copies the public menu URL. */
export const BusinessHeader = ({
  business,
  copiedUrl,
  onCopyMenuUrl,
  layout = 'row',
  savingLogo = false,
  onUploadLogo,
  onRemoveLogo,
}: BusinessHeaderProps) => (
  <div
    className={`flex ${
      layout === 'row' ? 'items-center justify-between' : 'flex-col items-start gap-3'
    } pb-4 border-b border-slate-100`}
  >
    <div className="flex items-center gap-3">
      <BusinessLogoEditor business={business} saving={savingLogo} onUpload={onUploadLogo} />
      <div>
        <h2 className="text-lg font-black text-slate-900">
          {business?.name || 'The Artisan Roastery'}
        </h2>
        <div className="text-xs text-slate-400 font-semibold flex items-center gap-2 mt-0.5">
          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black">
            ACTIVE BUSINESS
          </span>
          <span>Slug: /c/{business?.slug}</span>
        </div>
        {business?.logoUrl && onRemoveLogo && (
          <button
            type="button"
            onClick={onRemoveLogo}
            disabled={savingLogo}
            className="mt-1 text-[11px] font-bold text-slate-400 hover:text-rose-600 disabled:opacity-50"
          >
            Remove logo
          </button>
        )}
      </div>
    </div>

    <button
      onClick={onCopyMenuUrl}
      className="px-3.5 py-2 rounded-xl bg-brand-50 text-brand-600 hover:bg-brand-100 border border-brand-200 text-xs font-black transition-all flex items-center gap-1.5"
    >
      {copiedUrl ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
      <span>{copiedUrl ? 'Copied!' : 'Copy Menu URL'}</span>
    </button>
  </div>
);
