import React, { useRef, useState } from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import type { SlotConfig, ViewConfig } from './views';

interface ScreenGridProps {
  view: ViewConfig;
  renderSlot: (slot: SlotConfig) => React.ReactNode;
}

interface Page {
  key: string;
  label: string;
  node: React.ReactNode;
}

/** Phones: one card per screen, swiped sideways. Nothing stacks downward. */
const Pager: React.FC<{ pages: Page[] }> = ({ pages }) => {
  const scroller = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div
        ref={scroller}
        onScroll={() => {
          const el = scroller.current;
          if (el && el.clientWidth > 0) setIndex(Math.round(el.scrollLeft / el.clientWidth));
        }}
        className="flex min-h-0 flex-1 snap-x snap-mandatory gap-3 overflow-x-auto overflow-y-hidden [scrollbar-width:none]"
      >
        {pages.map((p) => (
          <div key={p.key} className="h-full w-full shrink-0 snap-center">
            {p.node}
          </div>
        ))}
      </div>
      <div
        className="flex shrink-0 items-center justify-center gap-1.5"
        role="tablist"
        aria-label="Charts"
      >
        {pages.map((p, i) => (
          <button
            key={p.key}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-label={`Show ${p.label}`}
            onClick={() =>
              scroller.current?.scrollTo({
                left: i * scroller.current.clientWidth,
                behavior: 'smooth',
              })
            }
            className={`h-1.5 rounded-full transition-all ${i === index ? 'w-4 bg-slate-900' : 'w-1.5 bg-slate-300'}`}
          />
        ))}
      </div>
    </div>
  );
};

/**
 * Lays a view's slots out to fill the space it is given, with nothing below the fold. On a wide
 * screen that is the view's CSS grid; on a phone, a pager (the KPI cards share the first page).
 */
export const ScreenGrid: React.FC<ScreenGridProps> = ({ view, renderSlot }) => {
  const wide = useMediaQuery('(min-width: 1024px)');

  if (wide) {
    return (
      <div
        className="grid h-full min-h-0 gap-3"
        style={{
          gridTemplateColumns: view.columns,
          gridTemplateRows: view.rows,
          gridTemplateAreas: view.areas.map((row) => `"${row}"`).join(' '),
        }}
      >
        {view.slots.map((slot) => (
          <div key={slot.id} className="min-h-0 min-w-0" style={{ gridArea: slot.area }}>
            {renderSlot(slot)}
          </div>
        ))}
      </div>
    );
  }

  const kpis = view.slots.filter((s) => s.component === 'kpi');
  const charts = view.slots.filter((s) => s.component !== 'kpi');
  // The headline numbers share the first page with the first chart, so that page is not mostly empty.
  const firstChart = kpis.length > 0 ? charts[0] : undefined;
  const otherCharts = kpis.length > 0 ? charts.slice(1) : charts;
  const pages: Page[] = [
    ...(kpis.length > 0
      ? [
          {
            key: 'kpis',
            label: 'the headline numbers',
            node: (
              <div className="flex h-full min-h-0 flex-col gap-2">
                <div className="grid shrink-0 grid-cols-2 gap-2">
                  {kpis.map((s) => (
                    <div key={s.id} className="min-w-0">
                      {renderSlot(s)}
                    </div>
                  ))}
                </div>
                {firstChart && <div className="min-h-0 flex-1">{renderSlot(firstChart)}</div>}
              </div>
            ),
          },
        ]
      : []),
    ...otherCharts.map((s) => ({ key: s.id, label: s.title, node: renderSlot(s) })),
  ];
  return <Pager key={view.id} pages={pages} />;
};
