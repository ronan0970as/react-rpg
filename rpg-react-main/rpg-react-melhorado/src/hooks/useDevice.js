import { useState, useEffect } from 'react';

export function useDevice() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 751 : false
  );

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 750px)');
    setIsMobile(mq.matches);
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return { isMobile, isDesktop: !isMobile };
}
