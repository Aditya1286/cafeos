import { Copy, QrCode, ExternalLink } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface MenuQrCardProps {
  menuUrl: string;
  onCopy: () => void;
}

/** The master QR code for the public menu, with a link to see what customers see and a copy button. */
export const MenuQrCard = ({ menuUrl, onCopy }: MenuQrCardProps) => (
  <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 text-center space-y-4">
    <div className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-500 border border-brand-200 flex items-center justify-center mx-auto">
      <QrCode className="w-5 h-5" />
    </div>

    <div>
      <h3 className="text-base font-black text-slate-900">Your Menu QR Code</h3>
      <p className="text-xs text-slate-500 font-medium mt-0.5">
        Customers scan this to see your menu and order
      </p>
      <p className="text-[11px] text-slate-400 font-medium mt-1">
        This is your master QR — switch it on or off under Tables & QR.
      </p>
    </div>

    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 inline-block my-2 shadow-inner">
      <QRCodeSVG value={menuUrl} size={150} />
    </div>

    <div className="space-y-2 pt-2">
      <a
        href={menuUrl}
        target="_blank"
        rel="noreferrer"
        className="block w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs text-center transition-all shadow-md flex items-center justify-center gap-1.5"
      >
        <span>See What Customers See</span>
        <ExternalLink className="w-3.5 h-3.5" />
      </a>

      <button
        onClick={onCopy}
        className="w-full py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs transition-colors flex items-center justify-center gap-1.5"
      >
        <Copy className="w-3.5 h-3.5" />
        <span>Copy Menu Link</span>
      </button>
    </div>
  </div>
);
