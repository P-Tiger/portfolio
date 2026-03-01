'use client';

interface Props {
  value: number;
  duration?: number;
  formatter?: (v: number) => string;
  className?: string;
}

export function AnimatedNumber({ value, formatter, className }: Props) {
  const text = formatter ? formatter(value) : Math.round(value).toLocaleString('vi-VN');
  return <span className={`tabular-nums ${className ?? ''}`}>{text}</span>;
}
