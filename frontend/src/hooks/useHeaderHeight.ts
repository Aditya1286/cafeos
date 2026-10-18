import { useEffect, useState } from 'react';

/** Height of the dashboard's sticky header, so a bar can stick just below it. */
export const useHeaderHeight = (fallback = 56): number => {
  const [height, setHeight] = useState(fallback);
  useEffect(() => {
    const measure = () => {
      const header = document.querySelector('header');
      if (header) setHeight(Math.round(header.getBoundingClientRect().height));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);
  return height;
};
