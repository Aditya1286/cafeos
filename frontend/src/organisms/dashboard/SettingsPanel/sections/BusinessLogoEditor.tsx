import { useRef } from 'react';
import { Camera } from 'lucide-react';
import { LogoTile } from '@/molecules/LogoTile';

interface BusinessLogoEditorProps {
  business: any;
  saving?: boolean;
  /** Omitted for a viewer who may not change the logo: then it is just the tile. */
  onUpload?: (file: File) => void;
}

/** The business's logo (or its initial), with a camera button to pick a new one from the device. */
export const BusinessLogoEditor = ({
  business,
  saving = false,
  onUpload,
}: BusinessLogoEditorProps) => {
  const fileInput = useRef<HTMLInputElement>(null);

  const tile = (
    <LogoTile
      src={business?.logoUrl}
      className="w-14 h-14 rounded-2xl"
      fallbackClassName="bg-gradient-to-br from-brand-500 to-brand-600 text-white font-black text-xl shadow-md"
    >
      {business?.name?.charAt(0) || 'A'}
    </LogoTile>
  );
  if (!onUpload) return tile;

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file
    if (file) onUpload(file);
  };

  return (
    <div className="relative shrink-0">
      {tile}
      <button
        type="button"
        onClick={() => fileInput.current?.click()}
        disabled={saving}
        aria-label="Change logo"
        className="absolute -bottom-2 -right-2 p-1.5 rounded-xl bg-slate-900 text-white shadow-md hover:bg-slate-800 disabled:opacity-50"
      >
        <Camera className="w-3.5 h-3.5" />
      </button>
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
