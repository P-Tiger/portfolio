'use client';

import { DisplayCurrency, formatMoney, getCurrencyLabel } from '@/lib/format';
import { CategoryBreakdown } from '@/lib/types';
import { useCallback, useRef, useState } from 'react';

const SVG_SIZE = 230;
const CX = SVG_SIZE / 2;
const CY = SVG_SIZE / 2;
const OUTER_R = 105;
const INNER_R = 70;
const GAP_DEG = 2;

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(startDeg: number, endDeg: number) {
  const os = polar(CX, CY, OUTER_R, startDeg);
  const oe = polar(CX, CY, OUTER_R, endDeg);
  const is_ = polar(CX, CY, INNER_R, startDeg);
  const ie = polar(CX, CY, INNER_R, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return [
    `M${os.x},${os.y}`,
    `A${OUTER_R},${OUTER_R} 0 ${large} 1 ${oe.x},${oe.y}`,
    `L${ie.x},${ie.y}`,
    `A${INNER_R},${INNER_R} 0 ${large} 0 ${is_.x},${is_.y}`,
    'Z',
  ].join(' ');
}

export function AllocationChart({
  data,
  displayCurrency,
  usdToVndRate,
}: {
  data: CategoryBreakdown[];
  displayCurrency: DisplayCurrency;
  usdToVndRate: number;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const [hovered, setHovered] = useState<number | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Build arc segments
  let cumDeg = 0;
  const segments = data.map((entry) => {
    const span = (entry.percent / 100) * 360;
    const start = cumDeg + GAP_DEG / 2;
    const end = cumDeg + span - GAP_DEG / 2;
    cumDeg += span;
    return { start, end, entry };
  });

  const handleEnter = useCallback((i: number) => setHovered(i), []);
  const handleLeave = useCallback(() => setHovered(null), []);

  const hoveredData = hovered !== null ? data[hovered] : null;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <h2 className="text-lg font-semibold text-white mb-4">Phân bổ tài sản</h2>
      <div className="flex flex-col md:flex-row items-center gap-6">
        <div className="w-full md:w-1/2 h-[280px] relative flex items-center justify-center">
          <svg width={SVG_SIZE} height={SVG_SIZE} viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}>
            {segments.map((seg, i) => (
              <path
                key={i}
                d={arcPath(seg.start, seg.end)}
                fill={seg.entry.color}
                opacity={hovered === null || hovered === i ? 1 : 0.4}
                onMouseEnter={() => handleEnter(i)}
                onMouseLeave={handleLeave}
                style={{ cursor: 'pointer', transition: 'opacity 0.15s' }}
              />
            ))}
          </svg>
          {/* Center text */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              {hoveredData ? (
                <>
                  <p className="text-xs text-zinc-400">{hoveredData.name}</p>
                  <p className="text-sm font-bold text-white">
                    {formatMoney(hoveredData.value, displayCurrency, usdToVndRate)}
                  </p>
                  <p className="text-xs text-zinc-500">{hoveredData.percent.toFixed(1)}%</p>
                </>
              ) : (
                <>
                  <p className="text-xs text-zinc-500">Tổng</p>
                  <p className="text-sm font-bold text-white">{formatMoney(total, displayCurrency, usdToVndRate)}</p>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="w-full md:w-1/2 space-y-3">
          {data.map((item) => (
            <div key={item.name} className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-300">{item.name}</span>
                  <span className="text-zinc-400">{item.percent.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-1.5 mt-1">
                  <div
                    className="h-1.5 rounded-full"
                    style={{
                      width: `${item.percent}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-zinc-500">
                    {formatMoney(item.value, displayCurrency, usdToVndRate)} {getCurrencyLabel(displayCurrency)}
                  </span>
                  <span className={`text-xs ${item.pnl >= 0 ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
                    {item.pnl >= 0 ? '+' : ''}
                    {item.pnlPercent.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
