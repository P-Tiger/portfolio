'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  value: number;
  duration?: number;
  formatter?: (v: number) => string;
  className?: string;
}

export function AnimatedNumber({ value, duration = 800, formatter, className }: Props) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number>(0);
  const startTime = useRef<number>(0);
  const rafId = useRef<number>(0);
  const lastRenderTime = useRef<number>(0);

  useEffect(() => {
    const from = ref.current;
    const to = value;
    startTime.current = performance.now();
    lastRenderTime.current = 0;

    function tick(now: number) {
      const elapsed = now - startTime.current;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = from + (to - from) * eased;
      ref.current = current;

      // Throttle state updates to ~20fps (every 50ms) to reduce main thread work
      if (now - lastRenderTime.current >= 50 || progress >= 1) {
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
