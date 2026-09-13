import React from 'react';

// A dense multi-column table has nowhere to shrink to on a phone — badges collide,
// buttons wrap mid-row, text gets clipped. This component is the one place that
// pattern gets solved: define your columns once, define a card once, and every
// consumer gets a table above the breakpoint and a stacked card list below it,
// without re-deriving the responsive logic per feature.

export interface ResponsiveColumn<T> {
  header: string;
  render: (item: T) => React.ReactNode;
  align?: 'left' | 'right' | 'center';
  headerClassName?: string;
  cellClassName?: string;
}

interface ResponsiveDataViewProps<T> {
  data: T[];
  keyExtractor: (item: T) => string;
  columns: ResponsiveColumn<T>[];
  renderCard: (item: T) => React.ReactNode;
  emptyState?: React.ReactNode;
  /** Tailwind breakpoint at which the view switches from cards to a table. Default 'lg'. */
  breakpoint?: 'sm' | 'md' | 'lg' | 'xl';
  rowClassName?: (item: T) => string;
}

const TABLE_VISIBILITY: Record<string, string> = {
  sm: 'hidden sm:block',
  md: 'hidden md:block',
  lg: 'hidden lg:block',
  xl: 'hidden xl:block',
};
const CARD_VISIBILITY: Record<string, string> = {
  sm: 'sm:hidden',
  md: 'md:hidden',
  lg: 'lg:hidden',
  xl: 'xl:hidden',
};
const ALIGN_CLASS: Record<string, string> = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
};

export function ResponsiveDataView<T>({
  data,
  keyExtractor,
  columns,
  renderCard,
  emptyState = null,
  breakpoint = 'lg',
  rowClassName,
}: ResponsiveDataViewProps<T>) {
  if (data.length === 0) {
    return <>{emptyState}</>;
  }

  return (
    <>
      {/* Card list — below the breakpoint */}
      <div className={`${CARD_VISIBILITY[breakpoint]} divide-y divide-slate-100`}>
        {data.map((item) => (
          <div key={keyExtractor(item)}>{renderCard(item)}</div>
        ))}
      </div>

      {/* Table — at/above the breakpoint */}
      <div className={`${TABLE_VISIBILITY[breakpoint]} overflow-x-auto`}>
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 font-black uppercase text-[10px] tracking-wider">
            <tr>
              {columns.map((col, i) => (
                <th
                  key={i}
                  className={`px-5 py-4 whitespace-nowrap ${ALIGN_CLASS[col.align || 'left']} ${col.headerClassName || ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
            {data.map((item) => (
              <tr key={keyExtractor(item)} className={`hover:bg-slate-50/80 transition-colors ${rowClassName?.(item) || ''}`}>
                {columns.map((col, i) => (
                  <td key={i} className={`px-5 py-4 ${ALIGN_CLASS[col.align || 'left']} ${col.cellClassName || ''}`}>
                    {col.render(item)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default ResponsiveDataView;
