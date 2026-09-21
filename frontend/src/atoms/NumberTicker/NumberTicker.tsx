import React, { useEffect, useRef } from 'react';
import { useInView, useMotionValue, useSpring } from 'framer-motion';

interface NumberTickerProps {
  value: number;
  direction?: 'up' | 'down';
  delay?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}

export const NumberTicker: React.FC<NumberTickerProps> = ({
  value,
  direction = 'up',
  delay = 0,
  className = '',
  prefix = '',
  suffix = '',
  decimals = 0,
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(direction === 'down' ? value : 0);
  const springValue = useSpring(motionValue, {
    damping: 30,
    stiffness: 100,
  });
  const isInView = useInView(ref, { once: true, margin: '0px' });

  useEffect(() => {
    if (isInView) {
      const timer = setTimeout(() => {
        motionValue.set(direction === 'down' ? 0 : value);
      }, delay * 1000);
      return () => clearTimeout(timer);
    }
  }, [isInView, value, direction, delay, motionValue]);

  useEffect(() => {
    const unsubscribe = springValue.on('change', (latest) => {
      if (ref.current) {
        const formatted = latest.toLocaleString('en-IN', {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        });
        ref.current.textContent = `${prefix}${formatted}${suffix}`;
      }
    });
    return () => unsubscribe();
  }, [springValue, prefix, suffix, decimals]);

  return (
    <span
      ref={ref}
      className={`inline-block tabular-nums tracking-tight ${className}`}
    >
      {prefix}0{suffix}
    </span>
  );
};

export default NumberTicker;
