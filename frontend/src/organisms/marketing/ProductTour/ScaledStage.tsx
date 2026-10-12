import React, { useLayoutEffect, useRef, useState } from 'react';

interface ScaledStageProps {
  /** Logical size the children are designed at; the stage scales them to fit the container. */
  width: number;
  height: number;
  children: React.ReactNode;
}

/** Lays children out at a fixed design size and scales the result to the container's width.
 * The wrapper keeps the design aspect ratio, so the page height is the same before and after the
 * scale is measured, and on every screen swapped into it. */
export const ScaledStage: React.FC<ScaledStageProps> = ({ width, height, children }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / width);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [width]);

  return (
    <div ref={ref} className="relative w-full" style={{ aspectRatio: `${width} / ${height}` }}>
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{ width, height, transform: `scale(${scale})` }}
      >
        {children}
      </div>
    </div>
  );
};
