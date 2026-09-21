import React, { useState, MouseEvent } from 'react';
import { motion, useMotionTemplate, useMotionValue } from 'framer-motion';

interface CardSpotlightProps {
  children: React.ReactNode;
  className?: string;
  radius?: number;
  color?: string;
}

export const CardSpotlight: React.FC<CardSpotlightProps> = ({
  children,
  className = '',
  radius = 350,
  color = '#ef4444',
}) => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }: MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`group relative rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm transition-all duration-300 hover:shadow-xl hover:shadow-red-500/5 ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Interactive Cursor Radial Spotlight */}
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-3xl opacity-0 transition duration-300 group-hover:opacity-100"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              ${radius}px circle at ${mouseX}px ${mouseY}px,
              rgba(239, 68, 68, 0.08),
              transparent 80%
            )
          `,
        }}
      />

      {/* Subtle Animated Glow Ring Border */}
      <div className="absolute inset-0 rounded-3xl border border-red-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      {/* Main Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
};

export default CardSpotlight;
