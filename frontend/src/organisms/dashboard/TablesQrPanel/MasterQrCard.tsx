import { useRef } from 'react';
import { Download, ExternalLink, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { downloadQrPng } from './downloadQrPng';

interface MasterQrCardProps {
  /** The business's general menu link (/c/:slug) — the same one the Settings tab shows. */
  menuUrl: string;
  tablesEnabled: boolean;
  masterQrEnabled: boolean;
  saving: boolean;
  onToggle: () => void;
}

/**
 * The master QR: one code for the counter, entrance or flyers that anyone can order from without
 * a table. With tables on, those orders come in as Counter orders — unless the owner switches it
 * off. With tables off it's simply how every customer orders, so there's nothing to switch.
 */
export const MasterQrCard = ({
  menuUrl,
  tablesEnabled,
  masterQrEnabled,
  saving,
  onToggle,
}: MasterQrCardProps) => {
  const qrRef = useRef<HTMLDivElement>(null);
  const takesOrders = !tablesEnabled || masterQrEnabled;

  const description = !tablesEnabled
    ? 'Tables are off, so this is how every customer orders.'
    : masterQrEnabled
      ? 'Anyone can scan this to order without a table — orders come in as Counter orders. Put it at the counter, the entrance, or on flyers.'
      : 'Switched off: customers can still browse the menu from it, but must scan their own table’s QR to order.';

  const handleDownload = () => {
    const svg = qrRef.current?.querySelector('svg');
    if (svg) downloadQrPng(svg as SVGSVGElement, 'Order here');
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 flex flex-col sm:flex-row gap-5 items-center">
      <div
        ref={qrRef}
        className={`p-3 bg-white rounded-2xl border border-slate-200 shrink-0 transition-opacity ${takesOrders ? '' : 'opacity-40'}`}
      >
        <QRCodeSVG value={menuUrl} size={120} />
      </div>

      <div className="flex-1 min-w-0 space-y-2 text-center sm:text-left">
        <div className="flex items-center justify-center sm:justify-start gap-2">
          <QrCode className="w-4 h-4 text-orange-500" />
          <h3 className="text-sm font-black text-slate-900">Master QR</h3>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
              takesOrders
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-slate-100 text-slate-500 border-slate-200'
            }`}
          >
            {takesOrders ? 'TAKING ORDERS' : 'MENU ONLY'}
          </span>
        </div>
        <p className="text-xs text-slate-500 font-medium">{description}</p>
        <div className="flex flex-wrap justify-center sm:justify-start gap-2 pt-1">
          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-extrabold transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Download
          </button>
          <a
            href={menuUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-extrabold transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Open
          </a>
        </div>
      </div>

      {tablesEnabled && (
        <button
          type="button"
          onClick={onToggle}
          disabled={saving}
          className={`shrink-0 relative w-14 h-8 rounded-full transition-colors disabled:opacity-50 ${
            masterQrEnabled ? 'bg-emerald-500' : 'bg-slate-300'
          }`}
          title={
            masterQrEnabled
              ? 'Master QR takes orders — click to switch off'
              : 'Master QR is menu-only — click to switch on'
          }
          aria-pressed={masterQrEnabled}
        >
          <span
            className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white shadow-md transition-transform ${
              masterQrEnabled ? 'translate-x-6' : 'translate-x-0'
            }`}
          />
        </button>
      )}
    </div>
  );
};

export default MasterQrCard;
