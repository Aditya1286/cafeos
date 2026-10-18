import { useRef } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';

interface MenuBannerEditorProps {
  business: any;
  saving?: boolean;
  onUpload: (file: File) => void;
  onRemove: () => void;
  className?: string;
}

/** The banner at the top of the guests' menu: a preview of it, with buttons to pick or remove one. */
export const MenuBannerEditor = ({
  business,
  saving = false,
  onUpload,
  onRemove,
  className = '',
}: MenuBannerEditorProps) => {
  const fileInput = useRef<HTMLInputElement>(null);
  const banner: string | undefined = business?.coverImageUrl;

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file
    if (file) onUpload(file);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div>
        <h3 className="text-sm font-black text-slate-900">Menu banner</h3>
        <p className="text-xs font-medium text-slate-500 mt-0.5">
          The photo at the top of your guests&apos; menu. A wide photo works best (about 1200 × 500).
        </p>
      </div>
      <div className="h-32 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center">
        {banner ? (
          <img src={banner} alt="Menu banner" className="w-full h-full object-cover" />
        ) : (
          <span className="text-xs font-bold text-slate-400">Using the default banner</span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 disabled:opacity-50"
        >
          <ImagePlus className="w-3.5 h-3.5" />
          {banner ? 'Change banner' : 'Add banner'}
        </button>
        {banner && (
          <button
            type="button"
            onClick={onRemove}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Remove
          </button>
        )}
      </div>
      <input
        ref={fileInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
};
