'use client';

import { DisplayCurrency, formatMoney, getCurrencyLabel } from '@/lib/format';
import { useCallback, useEffect, useId, useMemo, useRef, useState, useTransition } from 'react';

interface PerformancePoint {
  date: string;
  value: number;
}

const TIMEFRAMES = [
  { key: '5m', label: '5m' },
  { key: '30m', label: '30m' },
  { key: '1h', label: '1H' },
  { key: '4h', label: '4H' },
  { key: '1d', label: '1D' },
  { key: '1m', label: '1M' },
] as const;

const MARGIN = { top: 10, right: 10, bottom: 25, left: 10 };

interface Props {
  title?: string;
  category?: string;
  displayCurrency?: DisplayCurrency;
  usdToVndRate?: number;
}

export function PerformanceChart({
  title = 'Portfolio Performance',
  category,
  displayCurrency = 'VND',
  usdToVndRate = 0,
}: Props) {
  const gradientId = useId().replace(/:/g, '_');
  const [activeTimeframe, setActiveTimeframe] = useState('4h');
  const [data, setData] = useState<PerformancePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [, startTfTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<SVGGElement>(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const cat = category || 'overview';
    setLoading(true);
    fetch(`/api/history?tf=${activeTimeframe}&cat=${cat}`)
      .then((res) => res.json())
      .then((points: PerformancePoint[]) => {
        if (Array.isArray(points)) setData(points);
        setLoading(false);
      })
      .catch(() => {
        setData([]);
        setLoading(false);
      });
  }, [activeTimeframe, category]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDims({ w: width, h: height });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const hasData = data.length >= 2;
  const first = hasData ? data[0].value : 0;
  const last = hasData ? data[data.length - 1].value : 0;
  const change = last - first;
  const changePercent = first > 0 ? (change / first) * 100 : 0;
  const isPositive = change >= 0;
  const strokeColor = isPositive ? '#10b981' : '#ef4444';
  const gradientColor = isPositive ? '#34d399' : '#f87171';

  const chartW = dims.w - MARGIN.left - MARGIN.right;
  const chartH = dims.h - MARGIN.top - MARGIN.bottom;

  const chartData = useMemo(() => {
    if (!hasData || chartW <= 0 || chartH <= 0) return null;
    const values = data.map((d) => d.value);
    const minV = Math.min(...values);
    const maxV = Math.max(...values);
    const range = maxV - minV || 1;

    const points = data.map((d, i) => ({
      x: MARGIN.left + (i / (data.length - 1)) * chartW,
      y: MARGIN.top + chartH - ((d.value - minV) / range) * chartH,
      data: d,
    }));

    const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
    const area =
      line +
      ` L${points[points.length - 1].x},${MARGIN.top + chartH} L${points[0].x},${MARGIN.top + chartH} Z`;

    const labelCount = Math.min(5, data.length);
    const xLabels: { x: number; label: string }[] = [];
    for (let i = 0; i < labelCount; i++) {
      const idx = Math.round((i / (labelCount - 1)) * (data.length - 1));
      xLabels.push({ x: points[idx].x, label: data[idx].date });
    }

    return { points, linePath: line, areaPath: area, xLabels };
  }, [data, hasData, chartW, chartH]);

  // Ref-based tooltip - zero re-renders on mouse move
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!chartData || chartW <= 0) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const idx = Math.round(((mouseX - MARGIN.left) / chartW) * (data.length - 1));
      const ci = Math.max(0, Math.min(data.length - 1, idx));
      const p = chartData.points[ci];

      const indicator = indicatorRef.current;
      if (indicator) {
        indicator.style.display = '';
        const line = indicator.querySelector('line');
        const circle = indicator.querySelector('circle');
        if (line) {
          line.setAttribute('x1', String(p.x));
          line.setAttribute('x2', String(p.x));
        }
        if (circle) {
          circle.setAttribute('cx', String(p.x));
          circle.setAttribute('cy', String(p.y));
        }
      }

      const tip = tooltipRef.current;
      if (tip) {
        tip.style.display = '';
        const flipLeft = p.x > dims.w * 0.75;
        tip.style.left = `${p.x}px`;
        tip.style.top = `${p.y - 50}px`;
        tip.style.transform = flipLeft ? 'translateX(-100%)' : 'translateX(-50%)';
        tip.textContent = '';
        const d1 = document.createElement('p');
        d1.className = 'text-zinc-400 text-xs';
        d1.textContent = p.data.date;
        const d2 = document.createElement('p');
        d2.className = 'font-medium text-white';
        d2.textContent = `${formatMoney(p.data.value, displayCurrency, usdToVndRate)} ${getCurrencyLabel(displayCurrency)}`;
        tip.appendChild(d1);
        tip.appendChild(d2);
      }
    },
    [chartData, chartW, data.length, dims.w, displayCurrency, usdToVndRate],
  );

  const handleMouseLeave = useCallback(() => {
    if (indicatorRef.current) indicatorRef.current.style.display = 'none';
    if (tooltipRef.current) tooltipRef.current.style.display = 'none';
  }, []);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-baseline gap-3">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          {hasData && !loading && (
            <div className="text-right sm:text-left">
              <span className={`text-sm font-bold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                {isPositive ? '+' : ''}
                {formatMoney(change, displayCurrency, usdToVndRate)} {getCurrencyLabel(displayCurrency)}
              </span>
              <span className={`ml-2 text-xs ${isPositive ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
                ({isPositive ? '+' : ''}
                {changePercent.toFixed(2)}%)
              </span>
            </div>
          )}
        </div>
        <div className="flex gap-1 bg-zinc-800/50 rounded-lg p-1">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.key}
              onClick={() => startTfTransition(() => setActiveTimeframe(tf.key))}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                activeTimeframe === tf.key ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      <div ref={containerRef} className="h-[300px] relative">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="flex items-center gap-2 text-zinc-500 text-sm">
              <div className="w-4 h-4 border-2 border-zinc-600 border-t-zinc-400 rounded-full animate-spin" />
              Đang tải...
            </div>
          </div>
        ) : !hasData ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <p className="text-zinc-400 text-sm mb-1">Không có dữ liệu lịch sử</p>
              <p className="text-zinc-500 text-xs">Danh mục này không chứa Crypto, Vàng, USD hoặc Cổ phiếu</p>
            </div>
          </div>
        ) : (
          chartData &&
          dims.w > 0 && (
            <>
              <svg
                ref={svgRef}
                width={dims.w}
                height={dims.h}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                className="overflow-visible"
              >
                <defs>
                  <linearGradient id={`perfGrad_${gradientId}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={gradientColor} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={gradientColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <path d={chartData.areaPath} fill={`url(#perfGrad_${gradientId})`} />
                <path d={chartData.linePath} fill="none" stroke={strokeColor} strokeWidth={2} />
                {chartData.xLabels.map((l, i) => (
                  <text key={i} x={l.x} y={dims.h - 4} textAnchor="middle" fill="#71717a" fontSize={11}>
                    {l.label}
                  </text>
                ))}
                <g ref={indicatorRef} style={{ display: 'none' }}>
                  <line y1={MARGIN.top} y2={MARGIN.top + chartH} stroke="#3f3f46" strokeWidth={1} />
                  <circle r={4} fill={strokeColor} stroke="#18181b" strokeWidth={2} />
                </g>
              </svg>
              <div
                ref={tooltipRef}
                className="absolute pointer-events-none bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm z-10"
                style={{ display: 'none' }}
              />
            </>
          )
        )}
      </div>
    </div>
  );
}
