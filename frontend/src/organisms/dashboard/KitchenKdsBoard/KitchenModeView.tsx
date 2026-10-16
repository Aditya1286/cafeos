import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChefHat, FileText, Maximize, Minimize, X } from 'lucide-react';
import { KDS_COLUMN_STATUSES, STATUS_CONFIG } from '@/constants/orderStatus';
import { KdsColumn } from './KdsColumn';
import { KitchenKdsBoardMobile } from './KitchenKdsBoardMobile';
import { KdsBoardViewProps } from './types';
import { useClickGuard } from './useClickGuard';

interface KitchenModeViewProps extends KdsBoardViewProps {
  businessName?: string;
  onExit: () => void;
  /** Leaves Kitchen mode and opens the full orders list (hidden when the user has no such tab). */
  onViewAllOrders?: () => void;
}

const clockLabel = (ms: number) =>
  new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/**
 * Kitchen mode: the board taking the whole screen. Header, tab bar and stat cards are out of the way,
 * the three columns use the full height, and tickets are laid out for reading across a kitchen. It is
 * an overlay (portalled to <body>, below the app's modals) so the bill, cancel and bulk-move dialogs
 * still open on top of it. Esc or the Exit button leaves; below `md` it falls back to the phone
 * view's one-column-at-a-time switcher, since three columns won't fit.
 */
export const KitchenModeView = ({
  businessName,
  onExit,
  onViewAllOrders,
  ...viewProps
}: KitchenModeViewProps) => {
  const exitRef = useRef<HTMLButtonElement>(null);
  // Armed on open: the toggle that opened this view may be double-clicked, and the second click
  // must not land on the ticket that is now under the pointer.
  const guard = useClickGuard(500, true);
  const [fullscreen, setFullscreen] = useState(() => !!document.fullscreenElement);
  const canFullscreen =
    typeof document.fullscreenEnabled === 'boolean' && document.fullscreenEnabled;

  // Esc leaves, the page behind stops scrolling, and focus lands on Exit so the keyboard is in
  // the overlay straight away. Everything is put back when it closes.
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    exitRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      // The app's modals and drawers (bill, cancel, bulk move, order details) are `fixed inset-0
      // z-50` layers above this view and don't handle Esc themselves; leave the view alone while
      // one is open rather than closing the kitchen out from under it.
      if (document.querySelector('.fixed.inset-0.z-50')) return;
      onExit();
    };
    const onFullscreenChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('keydown', onKey);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.body.style.overflow = previousOverflow;
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
      previousFocus?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- set up once per open
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      /* the browser refused (iframe, policy): the overlay is still full-window */
    }
  };

  const counts = KDS_COLUMN_STATUSES.map((s) => ({
    status: s,
    n: viewProps.orders.filter((o) => o.orderStatus === s).length,
  }));

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Kitchen mode"
      data-kitchen-mode
      onClickCapture={guard.onClickCapture}
      className="fixed inset-0 z-[45] flex flex-col bg-page text-slate-900 font-sans"
    >
      <header className="shrink-0 flex flex-wrap items-center gap-x-4 gap-y-2 px-4 sm:px-5 py-3 bg-white border-b border-slate-200 shadow-sm">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-9 h-9 rounded-xl bg-brand-50 border border-brand-200 flex items-center justify-center shrink-0">
            <ChefHat className="w-5 h-5 text-brand-600" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-black text-slate-900 leading-tight">Kitchen</h2>
            {businessName && (
              <p className="text-[11px] font-semibold text-slate-500 truncate">{businessName}</p>
            )}
          </div>
        </div>

        {/* Below `md` the phone switcher under the header already shows these counts. */}
        <ul className="hidden md:flex items-center gap-2" aria-label="Orders in each stage">
          {counts.map(({ status, n }) => {
            const sc = STATUS_CONFIG[status];
            return (
              <li
                key={status}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-black bg-white border-slate-200 text-slate-700`}
              >
                <span className={`w-2 h-2 rounded-full ${sc.dot}`} aria-hidden="true" />
                {sc.label}
                <span className="font-mono text-sm">{n}</span>
              </li>
            );
          })}
        </ul>

        <div className="ml-auto flex items-center gap-2">
          <span className="hidden sm:block font-mono text-lg font-black text-slate-700 tabular-nums">
            {clockLabel(viewProps.now)}
          </span>
          {onViewAllOrders && (
            <button
              type="button"
              onClick={() => {
                onExit();
                onViewAllOrders();
              }}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black flex items-center gap-1.5 border border-slate-200 whitespace-nowrap"
            >
              <FileText className="w-4 h-4 text-slate-500" aria-hidden="true" />
              <span className="hidden sm:inline">All orders</span>
            </button>
          )}
          {canFullscreen && (
            <button
              type="button"
              onClick={toggleFullscreen}
              aria-pressed={fullscreen}
              title={fullscreen ? 'Leave full screen' : 'Full screen'}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
            >
              {fullscreen ? (
                <Minimize className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Maximize className="w-4 h-4" aria-hidden="true" />
              )}
              <span className="sr-only">{fullscreen ? 'Leave full screen' : 'Full screen'}</span>
            </button>
          )}
          <button
            ref={exitRef}
            type="button"
            onClick={onExit}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-700 text-white text-xs font-black flex items-center gap-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
          >
            <X className="w-4 h-4" aria-hidden="true" />
            Exit<span className="hidden sm:inline text-slate-400 font-semibold"> (Esc)</span>
          </button>
        </div>
      </header>

      {/* Three full-height columns from `md`; below that, one status at a time. */}
      <div className="hidden md:grid grid-cols-3 gap-4 p-4 flex-1 min-h-0">
        {KDS_COLUMN_STATUSES.map((status) => (
          <KdsColumn key={status} {...viewProps} status={status} scrollable wall />
        ))}
      </div>
      <div className="md:hidden flex-1 min-h-0 overflow-y-auto p-3">
        <KitchenKdsBoardMobile {...viewProps} />
      </div>
    </div>,
    document.body,
  );
};

export default KitchenModeView;
