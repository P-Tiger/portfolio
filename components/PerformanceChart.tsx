'use client';

import { DisplayCurrency, formatMoney, getCurrencyLabel } from '@/lib/format';
import { useEffect, useId, useState, useTransition } from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface PerformancePoint {
  date: string;
  value: number;
}

const TIMEFRAMES = [
  { key: '1d', label: '1D' },
  { key: '1m', label: '1M' },
  { key: '3m', label: '3M' },
  { key: '1y', label: '1Y' },
  { key: 'all', label: 'ALL' },
] as const;

function CustomTooltip({
  active,
  payload,
  label,
  displayCurrency,
  usdToVndRate,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
  displayCurrency: DisplayCurrency;
  usdToVndRate: number;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="theme-bg-secondary theme-border-light border rounded-lg px-3 py-2 text-sm">
      <p className="theme-text-secondary text-xs">{label}</p>
      <p className="font-medium theme-text-primary">
        {formatMoney(payload[0].value, displayCurrency, usdToVndRate)} {getCurrencyLabel(displayCurrency)}
      </p>
    </div>
  );
}

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
  const [activeTimeframe, setActiveTimeframe] = useState('1m');
  const [data, setData] = useState<PerformancePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [, startTfTransition] = useTransition();

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

  const hasData = data.length >= 2;
  const first = hasData ? data[0].value : 0;
  const last = hasData ? data[data.length - 1].value : 0;
  const change = last - first;
  const changePercent = first > 0 ? (change / first) * 100 : 0;
  const isPositive = change >= 0;
  const gradientColor = isPositive ? '#34d399' : '#f87171';
  const strokeColor = isPositive ? '#10b981' : '#ef4444';

  return (
    <div className="animate-fade-in theme-bg-card theme-border border rounded-xl p-5">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-baseline gap-3">
          <h2 className="text-lg font-semibold theme-text-primary">{title}</h2>
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
        {/* Timeframe selector */}
        <div className="flex gap-1 theme-bg-tertiary rounded-lg p-1">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.key}
              onClick={() => startTfTransition(() => setActiveTimeframe(tf.key))}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                activeTimeframe === tf.key ? 'theme-btn-active shadow-sm' : 'theme-btn-inactive'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart area */}
      <div className="h-[300px]">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="flex items-center gap-2 theme-text-muted text-sm">
              <div className="w-4 h-4 border-2 border-zinc-600 border-t-zinc-400 rounded-full animate-spin" />
              Đang tải...
            </div>
          </div>
        ) : !hasData && data.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <p className="theme-text-secondary text-sm mb-1">Chưa có dữ liệu lịch sử</p>
              <p className="theme-text-muted text-xs">Dữ liệu sẽ được ghi nhận hàng ngày</p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id={`perfGrad_${gradientId}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={gradientColor} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={gradientColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tick={{ fill: '#71717a', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                tickFormatter={(d: string) => {
                  const date = new Date(d);
                  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
                }}
              />
              <YAxis hide domain={['dataMin', 'dataMax']} />
              <Tooltip
                content={<CustomTooltip displayCurrency={displayCurrency} usdToVndRate={usdToVndRate} />}
                cursor={{ stroke: '#3f3f46' }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={strokeColor}
                strokeWidth={2}
                fill={`url(#perfGrad_${gradientId})`}
                dot={false}
                isAnimationActive={false}
                activeDot={{ r: 4, fill: strokeColor, stroke: '#18181b', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
