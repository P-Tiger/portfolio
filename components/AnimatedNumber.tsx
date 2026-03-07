'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  value: number;
  duration?: number;
  formatter?: (v: number) => string;
  className?: string;
}

// Check if user prefers reduced motion or is on mobile (skip animation for better INP)
const shouldSkipAnimation = () => {
  if (typeof window === 'undefined') return true;
  // Check for reduced motion preference
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
  // Skip animation on mobile for better INP (screen width < 768px)
  if (window.innerWidth < 768) return true;
  return false;
};

export function AnimatedNumber({ value, duration = 500, formatter, className }: Props) {
  const [display, setDisplay] = useState(value);
  const ref = useRef<number>(value);
  const startTime = useRef<number>(0);
  const rafId = useRef<number>(0);
  const lastRenderTime = useRef<number>(0);
  const isFirstRender = useRef(true);

  useEffect(() => {
    const from = ref.current;
    const to = value;

    // Skip animation: on mobile, reduced motion, or subsequent updates
    if (shouldSkipAnimation() || !isFirstRender.current || from !== 0) {
      ref.current = to;
      setDisplay(to);
      isFirstRender.current = false;
      return;
    }

    isFirstRender.current = false;
    startTime.current = performance.now();
    lastRenderTime.current = 0;

    function tick(now: number) {
      const elapsed = now - startTime.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = from + (to - from) * eased;
      ref.current = current;

      // Throttle to ~15fps (66ms) instead of ~20fps (50ms) for better performance
      if (now - lastRenderTime.current >= 66 || progress >= 1) {
        setDisplay(current);
        lastRenderTime.current = now;
      }

      if (progress < 1) {
        rafId.current = requestAnimationFrame(tick);
      }
    }

    rafId.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId.current);
  }, [value, duration]);

  const text = formatter ? formatter(display) : Math.round(display).toLocaleString('vi-VN');

  return <span className={`tabular-nums ${className ?? ''}`}>{text}</span>;
}
