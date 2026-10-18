import React, { useEffect, useRef, useState } from 'react';

interface SnapSliderProps {
  /** One child per slide. */
  children: React.ReactNode[];
  /** Slide width: a Tailwind width class (a part of the row, so the next slide peeks in). */
  slideClassName?: string;
  /** Dots under the slider showing which slide is in view. */
  dots?: boolean;
  /** Snap to a slide when letting go; off for a free scroller such as a row of chips. */
  snap?: boolean;
  className?: string;
  ariaLabel?: string;
}

/**
 * A row that slides sideways with a finger, one slide at a time. It is a plain scrolling row, so the
 * browser does the sliding. It is meant to sit inside swipeable tabs (SwipeTabs): sliding here must
 * not also change the tab, so it keeps its touches from reaching the tabs' own swipe handler.
 */
export const SnapSlider = ({
  children,
  slideClassName = 'w-[85%]',
  dots = true,
  snap = true,
  className = '',
  ariaLabel,
}: SnapSliderProps) => {
  const row = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);
  const slides = React.Children.toArray(children);

  // SwipeTabs listens for pointer-downs on its own panel (a native listener), which a React
  // handler here would be too late to stop.
  useEffect(() => {
    const el = row.current;
    if (!el) return;
    const keep = (e: Event) => e.stopPropagation();
    el.addEventListener('pointerdown', keep);
    return () => el.removeEventListener('pointerdown', keep);
  }, []);

  const handleScroll = () => {
    const el = row.current;
    if (!el || !el.children.length) return;
    const slideWidth = (el.children[0] as HTMLElement).offsetWidth || 1;
    setCurrent(Math.min(slides.length - 1, Math.max(0, Math.round(el.scrollLeft / slideWidth))));
  };

  return (
    <div className={className}>
      <div
        ref={row}
        role="group"
        aria-label={ariaLabel}
        onScroll={handleScroll}
        className={`flex gap-3 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden touch-pan-x ${
          snap ? 'snap-x snap-mandatory' : ''
        }`}
      >
        {slides.map((slide, i) => (
          <div key={i} className={`shrink-0 ${snap ? 'snap-start' : ''} ${slideClassName}`}>
            {slide}
          </div>
        ))}
      </div>
      {dots && slides.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-2.5" aria-hidden="true">
          {slides.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === current ? 'w-4 bg-brand-500' : 'w-1.5 bg-slate-300'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default SnapSlider;
