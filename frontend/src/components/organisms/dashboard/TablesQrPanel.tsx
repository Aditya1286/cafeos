import React from 'react';
import { Plus, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface TablesQrPanelProps {
  tables: any[];
  business: any;
  tablesEnabled: boolean;
  savingTablesEnabled: boolean;
  onToggleTablesEnabled: () => void;
  onAddTable: () => void;
}

export const TablesQrPanel = ({ tables, business, tablesEnabled, savingTablesEnabled, onToggleTablesEnabled, onAddTable }: TablesQrPanelProps) => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-lg font-black text-slate-900">Dining Tables & QR Codes</h2>
        <p className="text-xs text-slate-500 font-medium">Customer scans QR to open instant table ordering webpage</p>
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
          Customers ordering via your public menu link don't need to select a table, and there's no limit on concurrent orders. Turn tables back on above if you add seating later.
        </p>
      </div>
    ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {tables.map(t => {
          const qrUrl = `${window.location.origin}/c/${business?.slug}/t/${t.qrToken}`;
          const isOccupied = t.status === 'OCCUPIED';

          return (
            <div key={t._id} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 text-center space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-slate-900">{t.tableNumber}</span>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${
                  isOccupied ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  {isOccupied ? 'Occupied' : 'Free'}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center my-2">
                <QRCodeSVG value={qrUrl} size={115} />
              </div>

              <a
                href={qrUrl}
                target="_blank"
                rel="noreferrer"
                className="block w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold text-center transition-all shadow-xs"
              >
                Test QR Scan Page →
              </a>
            </div>
          );
        })}
      </div>
    )}
  </div>
);

export default TablesQrPanel;
