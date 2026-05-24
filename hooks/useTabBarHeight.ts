import { useState, useLayoutEffect } from 'react';

export function useTabBarHeight() {
  const [height, setHeight] = useState(68); // fallback 68px

  useLayoutEffect(() => {
    const el = document.querySelector('[data-tab-bar]');
    if (!el) return;

    const updateHeight = () => setHeight(el.getBoundingClientRect().height);
    updateHeight();

    const ro = new ResizeObserver(updateHeight);
    ro.observe(el);
    
    return () => ro.disconnect();
  }, []);

  return height;
}