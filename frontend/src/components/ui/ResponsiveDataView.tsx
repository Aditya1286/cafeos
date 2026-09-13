import React, { useEffect, useMemo, useState } from 'react';
import { Search, X, ChevronLeft, ChevronRight } from 'lucide-react';

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

/** Controlled: caller already filtered `data` (e.g. a server-side search) — the box is just UI. */
export interface ControlledSearchConfig {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
}

/** Uncontrolled: the component filters `data` itself by substring-matching these fields. */
export interface UncontrolledSearchConfig<T> {
  keys: (keyof T)[];
  placeholder?: string;
  id?: string;
}

export type ResponsiveDataViewSearch<T> = ControlledSearchConfig | UncontrolledSearchConfig<T>;

const isControlledSearch = <T,>(search: ResponsiveDataViewSearch<T>): search is ControlledSearchConfig =>
  'onChange' in search;

/** Controlled: `data` is already just the current page (e.g. a server-paginated API) — the
 * footer is just UI, and every interaction is handed back to the caller. */
export interface ControlledPaginationConfig {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
}

/** Uncontrolled: the component pages `data` itself. */
export interface UncontrolledPaginationConfig {
  defaultPageSize?: number;
  pageSizeOptions?: number[];
}

export type ResponsiveDataViewPagination = true | ControlledPaginationConfig | UncontrolledPaginationConfig;

const isControlledPagination = (pagination: ResponsiveDataViewPagination): pagination is ControlledPaginationConfig =>
  typeof pagination === 'object' && 'onPageChange' in pagination;

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 25, 50];

const getPageSizeOptions = (pagination?: ResponsiveDataViewPagination): number[] => {
  if (pagination && pagination !== true && pagination.pageSizeOptions) return pagination.pageSizeOptions;
  return DEFAULT_PAGE_SIZE_OPTIONS;
};

const getDefaultPageSize = (pagination?: ResponsiveDataViewPagination): number => {
  if (pagination && pagination !== true && !isControlledPagination(pagination) && pagination.defaultPageSize) {
    return pagination.defaultPageSize;
  }
  return getPageSizeOptions(pagination)[0];
};

interface ResponsiveDataViewProps<T> {
  data: T[];
  keyExtractor: (item: T) => string;
  columns: ResponsiveColumn<T>[];
  renderCard: (item: T) => React.ReactNode;
  emptyState?: React.ReactNode;
  /** Tailwind breakpoint at which the view switches from cards to a table. Default 'lg'. */
  breakpoint?: 'sm' | 'md' | 'lg' | 'xl';
  rowClassName?: (item: T) => string;
  /** Search box rendered above the data. Omit for none. */
  search?: ResponsiveDataViewSearch<T>;
  /** Rows-per-page selector + page navigation, rendered below the data. Omit for none. */
  pagination?: ResponsiveDataViewPagination;
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
  search,
  pagination,
}: ResponsiveDataViewProps<T>) {
  const [internalSearchTerm, setInternalSearchTerm] = useState('');
  const [internalPage, setInternalPage] = useState(1);
  const [internalPageSize, setInternalPageSize] = useState(() => getDefaultPageSize(pagination));

  const searchControlled = search ? isControlledSearch(search) : false;
  const searchTerm = search ? (searchControlled ? (search as ControlledSearchConfig).value : internalSearchTerm) : '';
  const setSearchTerm = search
    ? (searchControlled ? (search as ControlledSearchConfig).onChange : setInternalSearchTerm)
    : undefined;

  // Filter locally only in uncontrolled mode — a controlled search means the caller already
  // filtered `data` (typically via a server request), so filtering again here would double-apply it.
  const searchedData = useMemo(() => {
    if (!search || searchControlled) return data;
    const keys = (search as UncontrolledSearchConfig<T>).keys;
    const term = internalSearchTerm.trim().toLowerCase();
    if (!term) return data;
    return data.filter((item) => keys.some((key) => String(item[key] ?? '').toLowerCase().includes(term)));
  }, [data, search, searchControlled, internalSearchTerm]);

  const paginationControlled = pagination ? isControlledPagination(pagination) : false;

  // Reset back to page 1 whenever the uncontrolled search term narrows the result set — otherwise
  // a user could be left staring at an out-of-range empty page.
  useEffect(() => {
    if (pagination && !paginationControlled) setInternalPage(1);
  }, [internalSearchTerm]); // eslint-disable-line react-hooks/exhaustive-deps

  const page = paginationControlled ? (pagination as ControlledPaginationConfig).page : internalPage;
  const pageSize = paginationControlled ? (pagination as ControlledPaginationConfig).pageSize : internalPageSize;
  const total = paginationControlled ? (pagination as ControlledPaginationConfig).total : searchedData.length;
  const pageSizeOptions = getPageSizeOptions(pagination);
  const onPageChange = paginationControlled ? (pagination as ControlledPaginationConfig).onPageChange : setInternalPage;
  const onPageSizeChange = paginationControlled
    ? (pagination as ControlledPaginationConfig).onPageSizeChange
    : (size: number) => { setInternalPageSize(size); setInternalPage(1); };

  const pageData = useMemo(() => {
    if (!pagination) return searchedData;
    if (paginationControlled) return searchedData; // caller already handed us just this page
    const start = (internalPage - 1) * internalPageSize;
    return searchedData.slice(start, start + internalPageSize);
  }, [searchedData, pagination, paginationControlled, internalPage, internalPageSize]);

  const totalPages = Math.max(1, Math.ceil(total / (pageSize || 1)));

  return (
    <>
      {search && (
        <div className="relative p-4 border-b border-slate-100">
          <Search className="w-4 h-4 text-slate-400 absolute left-7 top-1/2 -translate-y-1/2" />
          <input
            id={search.id}
            type="text"
            placeholder={search.placeholder || 'Search...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm?.(e.target.value)}
            className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-100 transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm?.('')}
              className="absolute right-6 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {pageData.length === 0 ? (
        emptyState
      ) : (
        <>
          {/* Card list — below the breakpoint */}
          <div className={`${CARD_VISIBILITY[breakpoint]} divide-y divide-slate-100`}>
            {pageData.map((item) => (
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
                {pageData.map((item) => (
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
      )}

      {pagination && total > 0 && (
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
            <span>Rows per page</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
              className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700 outline-none focus:border-orange-500"
            >
              {pageSizeOptions.map((size: number) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-500 whitespace-nowrap">
              Page {page} of {totalPages} · {total} total
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}
                className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => onPageChange(page + 1)}
                className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ResponsiveDataView;
