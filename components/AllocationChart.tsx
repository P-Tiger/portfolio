'use client';

import { DisplayCurrency, formatMoney, getCurrencyLabel } from '@/lib/format';
import { CategoryBreakdown } from '@/lib/types';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

function CustomTooltip({
  active,
  payload,
  displayCurrency,
  usdToVndRate,
}: {
  active?: boolean;
  payload?: Array<{ payload: CategoryBreakdown }>;
  displayCurrency: DisplayCurrency;
  usdToVndRate: number;
}) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div className="theme-bg-secondary theme-border-light border rounded-lg px-3 py-2 text-sm">
      <p className="font-medium theme-text-primary">{data.name}</p>
      <p className="theme-text-secondary">
        {formatMoney(data.value, displayCurrency, usdToVndRate)} {getCurrencyLabel(displayCurrency)}
      </p>
      <p className="theme-text-muted">{data.percent.toFixed(1)}%</p>
    </div>
  );
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

  return (
    <div className="theme-bg-card theme-border border rounded-xl p-5">
      <h2 className="text-lg font-semibold theme-text-primary mb-4">Phân bổ tài sản</h2>
      <div className="flex flex-col md:flex-row items-center gap-6">
        <div className="w-full md:w-1/2 h-[280px] relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={115}
                dataKey="value"
                nameKey="name"
                stroke="none"
                paddingAngle={2}
                isAnimationActive={false}
              >
                {data.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip displayCurrency={displayCurrency} usdToVndRate={usdToVndRate} />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <p className="text-xs theme-text-muted">Tổng</p>
              <p className="text-sm font-bold theme-text-primary">
                {formatMoney(total, displayCurrency, usdToVndRate)}
              </p>
            </div>
          </div>
        </div>

        <div className="w-full md:w-1/2 space-y-3">
          {data.map((item, i) => (
            <div key={item.name} className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between text-sm">
                  <span className="theme-text-secondary">{item.name}</span>
                  <span className="theme-text-muted">{item.percent.toFixed(1)}%</span>
                </div>
                <div className="w-full theme-bg-tertiary rounded-full h-1.5 mt-1">
                  <div
                    className="h-1.5 rounded-full"
                    style={{
                      width: `${item.percent}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs theme-text-muted">
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
