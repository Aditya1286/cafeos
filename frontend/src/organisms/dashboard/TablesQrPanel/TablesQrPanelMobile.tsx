import { useState } from 'react';
import { Plus, QrCode, ChevronRight, Search } from 'lucide-react';
import { MobileOverview, StickyBar, PillRow, PillOption } from '@/molecules/MobileList';
import { MasterQrCard } from './MasterQrCard';
import { TableSheet } from './TableSheet';
import { TablesQrPanelProps } from './TablesQrPanel';

type TableFilter = 'ALL' | 'FREE' | 'OCCUPIED' | 'DISABLED';

const isActive = (t: any) => t.isActive ?? true;
const isOccupied = (t: any) => isActive(t) && t.status === 'OCCUPIED';
const isFree = (t: any) => isActive(t) && t.status !== 'OCCUPIED';

const FILTERS: Record<TableFilter, (t: any) => boolean> = {
  ALL: () => true,
  FREE: isFree,
  OCCUPIED: isOccupied,
  DISABLED: (t) => !isActive(t),
};

const Switch = ({
  on,
  disabled,
  onClick,
  label,
}: {
  on: boolean;
  disabled?: boolean;
  onClick: () => void;
  label: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-pressed={on}
    aria-label={label}
    className={`shrink-0 relative w-12 h-7 rounded-full transition-colors disabled:opacity-50 ${on ? 'bg-brand-600' : 'bg-slate-300'}`}
  >
    <span
      className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-md transition-transform ${on ? 'translate-x-5' : 'translate-x-0'}`}
    />
  </button>
);

/**
 * Tables & QR on a phone. The settings and the master QR sit in a closed overview; the tables are
 * short rows you can filter (Free, Occupied, Disabled) and search. Tapping a table opens its QR
 * code at scanning size, with download and the table's actions.
 */
export const TablesQrPanelMobile = ({
  tables,
  business,
  tablesEnabled,
  savingTablesEnabled,
  onToggleTablesEnabled,
  onAddTable,
  onToggleTableActive,
  onDeleteTable,
  onMarkTableEmpty,
  menuUrl,
  masterQrEnabled,
  savingMasterQr,
  onToggleMasterQr,
  readOnly = false,
}: TablesQrPanelProps) => {
  const [filter, setFilter] = useState<TableFilter>('ALL');
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const counts = {
    ALL: tables.length,
    FREE: tables.filter(isFree).length,
    OCCUPIED: tables.filter(isOccupied).length,
    DISABLED: tables.filter(FILTERS.DISABLED).length,
  };
  const pills: PillOption[] = [
    { value: 'ALL', label: 'All', count: counts.ALL },
    { value: 'FREE', label: 'Free', count: counts.FREE },
    { value: 'OCCUPIED', label: 'Occupied', count: counts.OCCUPIED },
    ...(counts.DISABLED > 0
      ? [{ value: 'DISABLED', label: 'Disabled', count: counts.DISABLED }]
      : []),
  ];
  const shown = tables.filter(
    (t) =>
      FILTERS[filter](t) &&
      String(t.tableNumber).toLowerCase().includes(query.trim().toLowerCase()),
  );
  const open = tables.find((t) => t._id === openId) ?? null;

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <MobileOverview
            summary={
              tablesEnabled ? (
                <>
                  {counts.ALL} tables
                  <span className="text-slate-500 font-bold"> · {counts.OCCUPIED} occupied</span>
                </>
              ) : (
                'Tables are off'
              )
            }
          >
            {!readOnly && (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-black text-slate-900">
                    This business uses physical tables
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    Off for a business with no seating: customers order without picking a table.
                  </p>
                </div>
                <Switch
                  on={tablesEnabled}
                  disabled={savingTablesEnabled}
                  onClick={onToggleTablesEnabled}
                  label="Business uses physical tables"
                />
              </div>
            )}
            <MasterQrCard
              menuUrl={menuUrl}
              tablesEnabled={tablesEnabled}
              masterQrEnabled={masterQrEnabled}
              saving={savingMasterQr}
              onToggle={readOnly ? undefined : onToggleMasterQr}
            />
          </MobileOverview>
        </div>
        {tablesEnabled && !readOnly && (
          <button
            type="button"
            onClick={onAddTable}
            className="flex items-center gap-1 h-[42px] px-3.5 rounded-2xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-extrabold shrink-0"
          >
            <Plus className="w-4 h-4" /> Add
          </button>
        )}
      </div>

      {!tablesEnabled ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center space-y-2">
          <QrCode className="w-9 h-9 text-slate-300 mx-auto" />
          <h3 className="text-sm font-black text-slate-700">
            Tables are disabled for this business
          </h3>
          <p className="text-xs text-slate-400">
            Customers ordering via your public menu link don't need to select a table.
            {!readOnly && ' Turn tables back on in the overview above if you add seating later.'}
          </p>
        </div>
      ) : (
        <>
          <StickyBar>
            {tables.length > 8 && (
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Find a table…"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-slate-200 text-base sm:text-xs font-semibold text-slate-800 outline-none focus:border-brand-500"
                />
              </div>
            )}
            <PillRow options={pills} value={filter} onChange={(v) => setFilter(v as TableFilter)} />
          </StickyBar>

          {shown.length === 0 ? (
            <div className="py-10 text-center bg-white rounded-2xl border border-slate-200">
              <p className="text-xs font-bold text-slate-500">
                {tables.length === 0 ? 'No tables yet.' : 'No tables match.'}
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {shown.map((t) => (
                <li key={t._id}>
                  <button
                    type="button"
                    onClick={() => setOpenId(t._id)}
                    className={`w-full flex items-center gap-3 bg-white rounded-2xl border border-slate-200 shadow-xs px-3.5 py-3 text-left active:bg-slate-50 ${
                      isActive(t) ? '' : 'opacity-60'
                    }`}
                  >
                    <QrCode className="w-5 h-5 text-slate-400 shrink-0" />
                    <span className="flex-1 min-w-0 truncate text-sm font-black text-slate-900">
                      {t.tableNumber}
                    </span>
                    {!isActive(t) ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black border bg-slate-100 text-slate-500 border-slate-300">
                        Disabled
                      </span>
                    ) : (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                          isOccupied(t)
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {isOccupied(t) ? 'Occupied' : 'Free'}
                      </span>
                    )}
                    <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {open && (
        <TableSheet
          table={open}
          qrUrl={`${window.location.origin}/c/${business?.slug}/t/${open.qrToken}`}
          readOnly={readOnly}
          onClose={() => setOpenId(null)}
          onToggleActive={() => onToggleTableActive(open._id)}
          onDelete={() => onDeleteTable(open._id)}
          onMarkEmpty={() => onMarkTableEmpty(open._id)}
        />
      )}
    </div>
  );
};

export default TablesQrPanelMobile;
