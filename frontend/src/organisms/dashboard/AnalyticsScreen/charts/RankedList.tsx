import React from 'react';
import { useElementSize } from '@/hooks/useElementSize';
import type { RankedColumn, RankedResult, RankedRow } from '@/services/dashboard/analytics/types';
import { changeTone, formatChange, formatValue } from '@/utils/analyticsFormat';
import { EmptyChart } from './EmptyChart';

const ROW_HEIGHT = 32;
const HEADER_HEIGHT = 18;
const FOOTER_HEIGHT = 26;
const TONE_CLASS = {
  good: 'text-emerald-600',
  bad: 'text-rose-600',
  neutral: 'text-slate-500',
} as const;

interface RankedListProps {
  result: RankedResult;
  /** The column drawn as a bar behind the name. */
  primary: string;
  /** Other columns shown as plain figures, dropped (right to left) when the card is narrow. */
  columns: string[];
  /** Offered when some rows did not fit; opens the full list. */
  onViewAll?: () => void;
  /** Show every row (inside the "View all" dialog, which scrolls). */
  showAll?: boolean;
  /** What to say when there are no rows. */
  emptyMessage?: string;
}

/** One cell. A few columns have a meaning beyond their number. */
const Cell: React.FC<{ column: RankedColumn; value: number | null }> = ({ column, value }) => {
  if (column.id === 'trend') {
    const change = formatChange(value);
    if (change.direction === 'none') return <span className="text-slate-300">new</span>;
    const tone = changeTone(change.direction, 'up');
    return (
      <span className={`font-bold ${TONE_CLASS[tone]}`}>
        {change.direction === 'up' ? '▲' : change.direction === 'down' ? '▼' : ''} {change.text}
      </span>
    );
  }
  if (column.id === 'days' && value === null) return <>never</>;
  return <>{formatValue(value, column.unit)}</>;
};

/**
 * A ranked metric as a list: a name, a bar-and-figure for the main column, and a few more figures.
 * It shows as many rows as the card has room for (never scrolls the page) and offers "View all"
 * for the rest.
 */
export const RankedList: React.FC<RankedListProps> = ({
  result,
  primary,
  columns,
  onViewAll,
  showAll = false,
  emptyMessage = 'Nothing in this period',
}) => {
  const [ref, size] = useElementSize<HTMLDivElement>();
  const byId = new Map(result.columns.map((c) => [c.id, c]));
  const main = byId.get(primary);

  if (result.rows.length === 0) return <EmptyChart message={emptyMessage} />;
  if (!main) return <EmptyChart message="Nothing to show" />;

  // Narrower cards drop the extra columns, last first.
  const wanted = columns.map((id) => byId.get(id)).filter((c): c is RankedColumn => !!c);
  const extra =
    size.width >= 480
      ? wanted
      : size.width >= 360
        ? wanted.slice(0, 2)
        : size.width >= 260
          ? wanted.slice(0, 1)
          : [];

  const rows = result.rows;
  const measured = showAll || size.height > 0;
  const fit = showAll
    ? rows.length
    : Math.max(Math.floor((size.height - HEADER_HEIGHT) / ROW_HEIGHT), 1);
  // Keep a row's worth of room for "View all" when it is needed.
  const needsMore = !showAll && (rows.length > fit || result.truncated);
  const visible = needsMore
    ? rows.slice(
        0,
        Math.max(Math.floor((size.height - HEADER_HEIGHT - FOOTER_HEIGHT) / ROW_HEIGHT), 1),
      )
    : rows;
  const max = Math.max(...rows.map((r) => r.values[primary] ?? 0), 1);

  return (
    <div ref={ref} className={showAll ? '' : 'h-full min-h-0'}>
      {measured && (
        <>
          <div
            className="flex items-center gap-2 px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400"
            style={{ height: HEADER_HEIGHT }}
          >
            <span className="min-w-0 flex-1" />
            <span className="shrink-0 whitespace-nowrap">{main.label}</span>
            {extra.map((c) => (
              <span key={c.id} className="w-16 shrink-0 whitespace-nowrap text-right">
                {c.label}
              </span>
            ))}
          </div>
          <ul>
            {visible.map((row: RankedRow) => (
              <li
                key={row.id}
                className="relative flex items-center gap-2 rounded-md px-2 text-xs"
                style={{ height: ROW_HEIGHT }}
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-y-0.5 left-0 rounded bg-brand-50"
                  style={{ width: `${Math.round(((row.values[primary] ?? 0) / max) * 100)}%` }}
                />
                <span className="relative min-w-0 flex-1">
                  <span className="block truncate font-bold leading-tight text-slate-900">
                    {row.label}
                  </span>
                  {row.sublabel && (
                    <span className="block truncate text-[10px] leading-tight text-slate-400">
                      {row.sublabel}
                    </span>
                  )}
                </span>
                <span className="relative shrink-0 font-black text-slate-900">
                  <Cell column={main} value={row.values[primary] ?? null} />
                </span>
                {extra.map((c) => (
                  <span
                    key={c.id}
                    className="relative w-16 shrink-0 whitespace-nowrap text-right text-slate-500"
                  >
                    <Cell column={c} value={row.values[c.id] ?? null} />
                  </span>
                ))}
              </li>
            ))}
          </ul>
          {needsMore && onViewAll && (
            <button
              type="button"
              onClick={onViewAll}
              className="w-full text-left text-[11px] font-bold text-brand-600 hover:underline"
              style={{ height: FOOTER_HEIGHT }}
            >
              View all {result.truncated ? '' : rows.length} →
            </button>
          )}
          {showAll && result.note && (
            <p className="px-2 pt-2 text-[11px] font-medium text-slate-400">{result.note}</p>
          )}
        </>
      )}
    </div>
  );
};
