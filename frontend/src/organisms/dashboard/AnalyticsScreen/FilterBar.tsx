import React, { useEffect, useRef, useState } from 'react';
import { Filter, RefreshCw } from 'lucide-react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { BottomSheet } from '@/molecules/MobileList';
import {
  COMPARE_OPTIONS,
  DAYPART_OPTIONS,
  FilterState,
  GRANULARITY_OPTIONS,
  PAYMENT_OPTIONS,
  RANGE_PRESETS,
  SOURCE_OPTIONS,
  ViewSupport,
  activeFilterCount,
  todayKey,
  validateCustomRange,
} from '@/utils/analyticsFilters';

interface FilterBarProps {
  filters: FilterState;
  onChange: (next: FilterState) => void;
  /** What the open view can honour; the rest is disabled with a hint, never silently ignored. */
  support: ViewSupport;
  categories: { _id: string; name: string }[];
  onRefresh: () => void;
  refreshing: boolean;
}

const selectCls =
  'h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-200 disabled:opacity-50';
const chipCls = (on: boolean) =>
  `rounded-lg border px-2 py-1 text-[11px] font-bold transition-colors ${on ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-100'}`;

const toggle = <T extends string>(list: T[], item: T): T[] =>
  list.includes(item) ? list.filter((x) => x !== item) : [...list, item];

const shiftDays = (key: string, days: number): string => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
};

// ── Range, comparison and bucket size ────────────────────────────────────────────────────────────
const RangeControls: React.FC<{
  filters: FilterState;
  onChange: (next: FilterState) => void;
  stacked?: boolean;
}> = ({ filters, onChange, stacked }) => {
  const custom = 'from' in filters.range ? filters.range : null;
  // Typing a date must not send half a range to the server: edits are held here until the range is valid.
  const [draft, setDraft] = useState({ from: custom?.from ?? '', to: custom?.to ?? '' });
  useEffect(() => {
    if (custom) setDraft({ from: custom.from, to: custom.to });
  }, [custom?.from, custom?.to]); // eslint-disable-line react-hooks/exhaustive-deps
  const problem = custom ? validateCustomRange(draft.from, draft.to) : null;

  const editDraft = (patch: Partial<typeof draft>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    if (validateCustomRange(next.from, next.to) === null)
      onChange({ ...filters, range: { from: next.from, to: next.to } });
  };

  const field = (label: string, control: React.ReactNode) =>
    stacked ? (
      <label className="block space-y-1">
        <span className="text-[11px] font-extrabold text-slate-700">{label}</span>
        {control}
      </label>
    ) : (
      <label className="flex items-center gap-1.5">
        <span className="sr-only">{label}</span>
        {control}
      </label>
    );

  return (
    <div className={stacked ? 'space-y-3' : 'flex flex-wrap items-center gap-2'}>
      {field(
        'Period',
        <select
          aria-label="Period"
          className={`${selectCls} ${stacked ? 'w-full' : ''}`}
          value={custom ? 'custom' : (filters.range as { preset: string }).preset}
          onChange={(e) => {
            const v = e.target.value;
            if (v === 'custom') {
              const today = todayKey();
              onChange({ ...filters, range: { from: shiftDays(today, -6), to: today } });
            } else {
              onChange({
                ...filters,
                range: { preset: v as (typeof RANGE_PRESETS)[number]['id'] },
              });
            }
          }}
        >
          {RANGE_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
          <option value="custom">Custom…</option>
        </select>,
      )}
      {custom && (
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            aria-label="From"
            className={selectCls}
            value={draft.from}
            max={draft.to || undefined}
            onChange={(e) => editDraft({ from: e.target.value })}
          />
          <span className="text-xs text-slate-400">to</span>
          <input
            type="date"
            aria-label="To"
            className={selectCls}
            value={draft.to}
            min={draft.from || undefined}
            onChange={(e) => editDraft({ to: e.target.value })}
          />
        </div>
      )}
      {problem && (
        <p role="alert" className="text-[11px] font-bold text-rose-600">
          {problem}
        </p>
      )}
      {field(
        'Compare with',
        <select
          aria-label="Compare with"
          className={`${selectCls} ${stacked ? 'w-full' : ''}`}
          value={filters.compare}
          onChange={(e) =>
            onChange({ ...filters, compare: e.target.value as FilterState['compare'] })
          }
        >
          {COMPARE_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.id === 'none' ? o.label : `vs ${o.label.toLowerCase()}`}
            </option>
          ))}
        </select>,
      )}
      {field(
        'Detail',
        <select
          aria-label="Detail"
          className={`${selectCls} ${stacked ? 'w-full' : ''}`}
          value={filters.granularity}
          onChange={(e) =>
            onChange({ ...filters, granularity: e.target.value as FilterState['granularity'] })
          }
        >
          {GRANULARITY_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.id === 'auto' ? 'Detail: auto' : o.label}
            </option>
          ))}
        </select>,
      )}
    </div>
  );
};

// ── Slices and item filters ──────────────────────────────────────────────────────────────────────
const Group: React.FC<{
  title: string;
  hint?: string;
  disabled?: boolean;
  children: React.ReactNode;
}> = ({ title, hint, disabled, children }) => (
  <fieldset disabled={disabled} className={`space-y-1.5 ${disabled ? 'opacity-50' : ''}`}>
    <legend className="text-[11px] font-extrabold text-slate-700">
      {title}
      {disabled && hint && <span className="ml-1.5 font-medium text-slate-400">{hint}</span>}
    </legend>
    <div className="flex flex-wrap gap-1.5">{children}</div>
  </fieldset>
);

const SliceControls: React.FC<{
  filters: FilterState;
  onChange: (next: FilterState) => void;
  support: ViewSupport;
  categories: { _id: string; name: string }[];
}> = ({ filters, onChange, support, categories }) => {
  const slicesHint = 'not used on this view';
  return (
    <div className="space-y-3">
      <Group title="Order source" disabled={!support.slices} hint={slicesHint}>
        {SOURCE_OPTIONS.map((o) => (
          <button
            key={o.id}
            type="button"
            aria-pressed={filters.source.includes(o.id)}
            className={chipCls(filters.source.includes(o.id))}
            onClick={() => onChange({ ...filters, source: toggle(filters.source, o.id) })}
          >
            {o.label}
          </button>
        ))}
      </Group>
      <Group title="Payment" disabled={!support.slices} hint={slicesHint}>
        {PAYMENT_OPTIONS.map((o) => (
          <button
            key={o.id}
            type="button"
            aria-pressed={filters.paymentMethod.includes(o.id)}
            className={chipCls(filters.paymentMethod.includes(o.id))}
            onClick={() =>
              onChange({ ...filters, paymentMethod: toggle(filters.paymentMethod, o.id) })
            }
          >
            {o.label}
          </button>
        ))}
      </Group>
      <Group title="Time of day" disabled={!support.slices} hint={slicesHint}>
        {DAYPART_OPTIONS.map((o) => (
          <button
            key={o.id}
            type="button"
            aria-pressed={filters.daypart.includes(o.id)}
            className={chipCls(filters.daypart.includes(o.id))}
            onClick={() => onChange({ ...filters, daypart: toggle(filters.daypart, o.id) })}
          >
            {o.label}
          </button>
        ))}
      </Group>
      <Group title="Veg / non-veg" disabled={!support.itemFilters} hint="Overview and Menu only">
        {(['veg', 'nonveg'] as const).map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={filters.veg === v}
            className={chipCls(filters.veg === v)}
            onClick={() => onChange({ ...filters, veg: filters.veg === v ? null : v })}
          >
            {v === 'veg' ? 'Veg' : 'Non-veg'}
          </button>
        ))}
      </Group>
      {categories.length > 0 && (
        <Group title="Category" disabled={!support.itemFilters} hint="Overview and Menu only">
          {categories.map((c) => (
            <button
              key={c._id}
              type="button"
              aria-pressed={filters.categoryIds.includes(c._id)}
              className={chipCls(filters.categoryIds.includes(c._id))}
              onClick={() =>
                onChange({ ...filters, categoryIds: toggle(filters.categoryIds, c._id) })
              }
            >
              {c.name}
            </button>
          ))}
        </Group>
      )}
      {activeFilterCount(filters, support) > 0 && (
        <button
          type="button"
          className="text-[11px] font-bold text-brand-600 hover:underline"
          onClick={() =>
            onChange({
              ...filters,
              source: [],
              paymentMethod: [],
              daypart: [],
              categoryIds: [],
              veg: null,
            })
          }
        >
          Clear filters
        </button>
      )}
    </div>
  );
};

/**
 * The filters above every view: period, comparison and detail, plus the order and item filters
 * behind a "Filters" button. On a phone everything folds into one dialog.
 */
export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onChange,
  support,
  categories,
  onRefresh,
  refreshing,
}) => {
  const wide = useMediaQuery('(min-width: 1024px)');
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLDivElement>(null);
  const count = activeFilterCount(filters, support);
  const nothingToFilter = !support.slices && !support.itemFilters;

  useEffect(() => {
    if (!open || !wide) return;
    const onDown = (e: MouseEvent) => {
      if (anchor.current && !anchor.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open, wide]);

  const filtersButton = (
    <button
      type="button"
      disabled={nothingToFilter}
      title={nothingToFilter ? 'This view has no extra filters' : undefined}
      aria-expanded={open}
      onClick={() => setOpen((v) => !v)}
      className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
    >
      <Filter className="h-3.5 w-3.5" aria-hidden="true" />
      Filters
      {count > 0 && (
        <span className="rounded-full bg-brand-600 px-1.5 text-[10px] font-black text-white">
          {count}
        </span>
      )}
    </button>
  );

  const refresh = (
    <button
      type="button"
      onClick={onRefresh}
      aria-label="Refresh"
      title="Refresh"
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
    >
      <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
    </button>
  );

  if (!wide) {
    return (
      <div className="flex items-center gap-2">
        {filtersButton}
        {refresh}
        {open && (
          // A sheet from the bottom whose content scrolls: a centred dialog this tall ran off both
          // ends of an ordinary Android screen, with its top out of reach.
          <BottomSheet
            title="Filters"
            onClose={() => setOpen(false)}
            footer={
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-full rounded-xl bg-slate-900 py-3 text-xs font-black text-white hover:bg-slate-800"
              >
                Done
              </button>
            }
          >
            <RangeControls filters={filters} onChange={onChange} stacked />
            <SliceControls
              filters={filters}
              onChange={onChange}
              support={support}
              categories={categories}
            />
          </BottomSheet>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <RangeControls filters={filters} onChange={onChange} />
      <div ref={anchor} className="relative">
        {filtersButton}
        {open && (
          <div
            role="dialog"
            aria-label="Filters"
            className="absolute right-0 top-full z-30 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl"
          >
            <SliceControls
              filters={filters}
              onChange={onChange}
              support={support}
              categories={categories}
            />
          </div>
        )}
      </div>
      {refresh}
    </div>
  );
};
