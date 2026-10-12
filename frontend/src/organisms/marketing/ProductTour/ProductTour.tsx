import React, { useState } from 'react';
import { TOUR_STEPS, TourScreenId } from '@/constants/productTour';
import { ScaledStage } from './ScaledStage';
import { TourTabs } from './TourTabs';
import { TOUR_SCREENS } from './screens';

const STAGE_WIDTH = 760;
const STAGE_HEIGHT = 496;
const PANEL_ID = 'tour-panel';

export const ProductTour: React.FC = () => {
  const [active, setActive] = useState<TourScreenId>('guest');
  const step = TOUR_STEPS.find((s) => s.id === active) ?? TOUR_STEPS[0];

  return (
    <section id="features" className="scroll-mt-20 py-24 px-4 lg:px-8 bg-page">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 leading-tight mb-3">
            Take a look inside
          </h2>
          <p className="text-slate-600 font-medium leading-relaxed">
            The same screens your guests, kitchen and you will use every day.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,8fr)] gap-6 lg:gap-10 items-start">
          <TourTabs steps={TOUR_STEPS} active={active} onSelect={setActive} panelId={PANEL_ID} />

          <div>
            <div
              id={PANEL_ID}
              role="tabpanel"
              aria-labelledby={`tour-tab-${active}`}
              data-mascot-peek="tour"
              className="relative z-10 rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-300/40 overflow-hidden"
            >
              <ScaledStage width={STAGE_WIDTH} height={STAGE_HEIGHT}>
                {/* Every screen stays mounted and only fades, so switching never reflows. */}
                {TOUR_STEPS.map((s) => {
                  const Screen = TOUR_SCREENS[s.id];
                  const visible = s.id === active;
                  return (
                    <div
                      key={s.id}
                      aria-hidden={!visible}
                      className={`absolute inset-0 transition-opacity duration-300 motion-reduce:transition-none ${
                        visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
                      }`}
                    >
                      <Screen />
                    </div>
                  );
                })}
              </ScaledStage>
            </div>

            <p className="mt-3 text-xs text-slate-400 font-medium text-center">
              Sample data shown. Your own menu and orders appear here.
            </p>

            {/* Small screens: the description sits under the stage, in a fixed-height block. */}
            <div className="lg:hidden mt-4 min-h-[170px] rounded-2xl bg-white border border-slate-200 p-4">
              <p className="text-[15px] font-extrabold text-slate-900 leading-snug">{step.title}</p>
              <p className="mt-1.5 text-sm text-slate-600 font-medium leading-relaxed">
                {step.body}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProductTour;
