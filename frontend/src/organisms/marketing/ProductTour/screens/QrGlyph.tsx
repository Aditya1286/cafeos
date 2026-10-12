import React from 'react';

const SIZE = 13;
const FINDER = 4;

// Decorative, QR-looking pattern: three finder squares plus scattered modules. It is not a
// scannable code.
const isDark = (x: number, y: number, seed: number): boolean => {
  const corner = (fx: number, fy: number) =>
    x >= fx && x < fx + FINDER && y >= fy && y < fy + FINDER ? { rx: x - fx, ry: y - fy } : null;
  const finder = corner(0, 0) || corner(SIZE - FINDER, 0) || corner(0, SIZE - FINDER);
  if (finder) {
    const { rx, ry } = finder;
    const ring = rx === 0 || ry === 0 || rx === FINDER - 1 || ry === FINDER - 1;
    return ring || (rx === 1 && ry === 1);
  }
  return (x * 7 + y * 13 + seed * 5 + x * y) % 5 < 2;
};

export const QrGlyph: React.FC<{ seed?: number; className?: string }> = ({
  seed = 1,
  className = '',
}) => (
  <svg
    viewBox={`0 0 ${SIZE} ${SIZE}`}
    className={className}
    shapeRendering="crispEdges"
    aria-hidden="true"
  >
    <rect width={SIZE} height={SIZE} fill="#fff" />
    {Array.from({ length: SIZE * SIZE }, (_, i) => {
      const x = i % SIZE;
      const y = Math.floor(i / SIZE);
      return isDark(x, y, seed) ? (
        <rect key={i} x={x} y={y} width="1" height="1" fill="#0f172a" />
      ) : null;
    })}
  </svg>
);
