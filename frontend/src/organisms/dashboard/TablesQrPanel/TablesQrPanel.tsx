import React, { useState } from 'react';
import { Plus, QrCode, Power, Trash2, AlertTriangle, CircleSlash, Download } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Modal } from '@/molecules/Modal';

interface TablesQrPanelProps {
  tables: any[];
  business: any;
  tablesEnabled: boolean;
  savingTablesEnabled: boolean;
  onToggleTablesEnabled: () => void;
  onAddTable: () => void;
  onToggleTableActive: (tableId: string) => void;
  onDeleteTable: (tableId: string) => void;
  onMarkTableEmpty: (tableId: string) => void;
}

// Rasterises the on-screen QR SVG into a print-ready PNG (white quiet zone + table label).
const downloadQrPng = (svg: SVGSVGElement, tableNumber: string) => {
  const QR_SIZE = 1024;
  const PADDING = 96;
  const LABEL_HEIGHT = 140;
  const svgData = new XMLSerializer().serializeToString(svg);
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = QR_SIZE + PADDING * 2;
    canvas.height = QR_SIZE + PADDING * 2 + LABEL_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, PADDING, PADDING, QR_SIZE, QR_SIZE);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 72px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(tableNumber, canvas.width / 2, QR_SIZE + PADDING + LABEL_HEIGHT - 20);
    const link = document.createElement('a');
    link.download = `qr-${String(tableNumber).replace(/[^a-z0-9-_]+/gi, '-')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgData)}`;
};

export const TablesQrPanel = ({
  tables, business, tablesEnabled, savingTablesEnabled, onToggleTablesEnabled, onAddTable,
  onToggleTableActive, onDeleteTable, onMarkTableEmpty
}: TablesQrPanelProps) => {
  const [tableToDelete, setTableToDelete] = useState<any | null>(null);
  const [tableToEmpty, setTableToEmpty] = useState<any | null>(null);

  const handleConfirmDelete = () => {
    if (!tableToDelete) return;
    onDeleteTable(tableToDelete._id);
    setTableToDelete(null);
  };

  const handleConfirmMarkEmpty = () => {
    if (!tableToEmpty) return;
    onMarkTableEmpty(tableToEmpty._id);
    setTableToEmpty(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-900">Tables & QR Codes</h2>
          <p className="text-xs text-slate-500 font-medium">Customers scan a table's QR code to see the menu and order</p>
        </div>
        {tablesEnabled && (
          <button
            onClick={onAddTable}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs shadow-md shadow-orange-500/20 transition-all"
          >
            <Plus className="w-4 h-4" /> Add Table
          </button>
        )}
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 flex items-center justify-between gap-4">
        <div>
          <div className="text-sm font-black text-slate-900">This business uses physical tables</div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Turn this off for a business with no seating (e.g. a general store) — customers order directly without picking a table, and orders are never capped by table count.
          </p>
        </div>
        <button
          onClick={onToggleTablesEnabled}
          disabled={savingTablesEnabled}
          className={`shrink-0 relative w-14 h-8 rounded-full transition-colors disabled:opacity-50 ${
            tablesEnabled ? 'bg-emerald-500' : 'bg-slate-300'
          }`}
          title={tablesEnabled ? 'Tables enabled — click to disable' : 'Tables disabled — click to enable'}
        >
          <span
            className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white shadow-md transition-transform ${
              tablesEnabled ? 'translate-x-6' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {!tablesEnabled ? (
        <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center space-y-2">
          <QrCode className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-black text-slate-700">Tables are disabled for this business</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Customers ordering via your public menu link don't need to select a table, and there's no limit on how many orders can come in at once. Turn tables back on above if you add seating later.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {tables.map(t => {
            const qrUrl = `${window.location.origin}/c/${business?.slug}/t/${t.qrToken}`;
            const isOccupied = t.status === 'OCCUPIED';
            const isActive = t.isActive ?? true;

            return (
              <div
                key={t._id}
                className={`bg-white rounded-3xl border shadow-sm p-5 text-center space-y-3 transition-opacity ${
                  isActive ? 'border-slate-200' : 'border-slate-200 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-slate-900">{t.tableNumber}</span>
                  {!isActive ? (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black border bg-slate-100 text-slate-500 border-slate-300">
                      Disabled
                    </span>
                  ) : (
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${
                      isOccupied ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}>
                      {isOccupied ? 'Occupied' : 'Free'}
                    </span>
                  )}
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center my-2 relative">
                  <QRCodeSVG value={qrUrl} size={115} />
                  {!isActive && (
                    <div className="absolute inset-0 bg-white/70 rounded-2xl flex items-center justify-center">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">QR disabled</span>
                    </div>
                  )}
                  <button
                    onClick={e => {
                      const svg = e.currentTarget.parentElement?.querySelector(':scope > svg');
                      if (svg) downloadQrPng(svg as SVGSVGElement, t.tableNumber);
                    }}
                    className="absolute top-2 left-2 z-10 p-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 shadow-xs transition-all"
                    title="Download QR image"
                    aria-label={`Download QR for ${t.tableNumber}`}
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>

                <a
                  href={qrUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold text-center transition-all shadow-xs"
                >
                  Open this table's menu →
                </a>

                {isOccupied && (
                  <button
                    onClick={() => setTableToEmpty(t)}
                    className="w-full py-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 text-[11px] font-extrabold transition-all flex items-center justify-center gap-1.5"
                  >
                    <CircleSlash className="w-3.5 h-3.5" /> Mark Empty
                  </button>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => onToggleTableActive(t._id)}
                    className={`flex-1 py-2 rounded-xl text-[11px] font-extrabold border transition-all flex items-center justify-center gap-1.5 ${
                      isActive
                        ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600'
                        : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700'
                    }`}
                  >
                    <Power className="w-3.5 h-3.5" /> {isActive ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => setTableToDelete(t)}
                    className="flex-1 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-[11px] font-extrabold transition-all flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tableToDelete && (
        <Modal title="Delete this table?" onClose={() => setTableToDelete(null)} maxWidth="max-w-sm">
          <div className="space-y-5 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-800">
                Delete <span className="font-mono text-rose-600">{tableToDelete.tableNumber}</span> and its QR code?
              </p>
              <p className="text-xs text-slate-500 font-medium">
                This can't be undone — any printed QR for this table will stop working. Tables with an order
                still in progress can't be deleted.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setTableToDelete(null)}
                className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-md shadow-rose-600/20 transition-all"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </Modal>
      )}

      {tableToEmpty && (
        <Modal title="Mark this table as empty?" onClose={() => setTableToEmpty(null)} maxWidth="max-w-sm">
          <div className="space-y-5 text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
              <CircleSlash className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-800">
                Clear the "Occupied" status on <span className="font-mono text-amber-700">{tableToEmpty.tableNumber}</span>?
              </p>
              <p className="text-xs text-slate-500 font-medium">
                Use this if the table is showing occupied by mistake. This only clears the indicator — it won't
                cancel or change any order still linked to this table.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setTableToEmpty(null)}
                className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmMarkEmpty}
                className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs shadow-md shadow-amber-500/20 transition-all"
              >
                Yes, Mark Empty
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default TablesQrPanel;
