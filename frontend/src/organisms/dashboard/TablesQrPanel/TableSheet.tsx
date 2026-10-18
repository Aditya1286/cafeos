import { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Download, ExternalLink, Power, Trash2, CircleSlash } from 'lucide-react';
import { BottomSheet } from '@/molecules/MobileList';
import { downloadQrPng } from './downloadQrPng';

interface TableSheetProps {
  table: any;
  qrUrl: string;
  readOnly: boolean;
  onClose: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
  onMarkEmpty: () => void;
}

type Confirm = 'delete' | 'empty' | null;

/** One table on a phone: its QR code at a size you can scan or download, and what you can do to it. */
export const TableSheet = ({
  table,
  qrUrl,
  readOnly,
  onClose,
  onToggleActive,
  onDelete,
  onMarkEmpty,
}: TableSheetProps) => {
  const qrRef = useRef<HTMLDivElement>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const isActive = table.isActive ?? true;
  const isOccupied = table.status === 'OCCUPIED';

  const download = () => {
    const svg = qrRef.current?.querySelector('svg');
    if (svg) downloadQrPng(svg as SVGSVGElement, table.tableNumber);
  };

  return (
    <BottomSheet title={table.tableNumber} onClose={onClose}>
      <div
        ref={qrRef}
        className="relative mx-auto w-fit p-3 bg-slate-50 rounded-2xl border border-slate-100"
      >
        <QRCodeSVG value={qrUrl} size={200} />
        {!isActive && (
          <div className="absolute inset-0 bg-white/70 rounded-2xl flex items-center justify-center">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
              QR disabled
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={download}
          className="flex items-center justify-center gap-1.5 py-3 rounded-xl bg-slate-100 text-slate-700 text-xs font-black"
        >
          <Download className="w-4 h-4" /> Download
        </button>
        <a
          href={qrUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-1.5 py-3 rounded-xl bg-slate-900 text-white text-xs font-black"
        >
          <ExternalLink className="w-4 h-4" /> Open menu
        </a>
      </div>

      {!readOnly && confirm === null && (
        <div className="space-y-2">
          {isOccupied && (
            <button
              type="button"
              onClick={() => setConfirm('empty')}
              className="w-full flex items-center justify-center gap-1.5 py-3 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-xs font-black"
            >
              <CircleSlash className="w-4 h-4" /> Mark empty
            </button>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                onToggleActive();
                onClose();
              }}
              className={`flex items-center justify-center gap-1.5 py-3 rounded-xl border text-xs font-black ${
                isActive
                  ? 'bg-slate-100 border-slate-200 text-slate-600'
                  : 'bg-brand-50 border-brand-200 text-brand-700'
              }`}
            >
              <Power className="w-4 h-4" /> {isActive ? 'Disable' : 'Enable'}
            </button>
            <button
              type="button"
              onClick={() => setConfirm('delete')}
              className="flex items-center justify-center gap-1.5 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-black"
            >
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          </div>
        </div>
      )}

      {confirm === 'delete' && (
        <div className="space-y-3 text-center">
          <p className="text-sm font-bold text-slate-800">
            Delete <span className="font-mono text-rose-600">{table.tableNumber}</span> and its QR
            code?
          </p>
          <p className="text-xs text-slate-500 font-medium">
            This can't be undone — any printed QR for this table will stop working. Tables with an
            order still in progress can't be deleted.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setConfirm(null)}
              className="py-3 rounded-xl bg-slate-100 text-slate-700 text-xs font-black"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onDelete();
                onClose();
              }}
              className="py-3 rounded-xl bg-rose-600 text-white text-xs font-black"
            >
              Yes, Delete
            </button>
          </div>
        </div>
      )}

      {confirm === 'empty' && (
        <div className="space-y-3 text-center">
          <p className="text-sm font-bold text-slate-800">
            Clear the "Occupied" status on{' '}
            <span className="font-mono text-brand-700">{table.tableNumber}</span>?
          </p>
          <p className="text-xs text-slate-500 font-medium">
            Use this if the table is showing occupied by mistake. It only clears the indicator — it
            won't cancel or change any order still linked to this table.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setConfirm(null)}
              className="py-3 rounded-xl bg-slate-100 text-slate-700 text-xs font-black"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onMarkEmpty();
                onClose();
              }}
              className="py-3 rounded-xl bg-brand-600 text-white text-xs font-black"
            >
              Yes, Mark Empty
            </button>
          </div>
        </div>
      )}
    </BottomSheet>
  );
};
