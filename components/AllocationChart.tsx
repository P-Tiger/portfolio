'use client';

import { formatVND } from '@/lib/format';
import { CategoryBreakdown } from '@/lib/types';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: CategoryBreakdown }> }) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm">
      <p className="font-medium text-white">{data.name}</p>
      <p className="text-zinc-300">{formatVND(data.value)} VND</p>
      <p className="text-zinc-400">{data.percent.toFixed(1)}%</p>
    </div>
  );
}

export function AllocationChart({ data }: { data: CategoryBreakdown[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <h2 className="text-lg font-semibold text-white mb-4">Phân bổ tài sản</h2>
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
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <p className="text-xs text-zinc-500">Tổng</p>
              <p className="text-sm font-bold text-white">{formatVND(total)}</p>
            </div>
          </div>
        </div>

        <div className="w-full md:w-1/2 space-y-3">
          {data.map((item, i) => (
            <div key={item.name} className={`animate-fade-in delay-${i + 1} flex items-center gap-3`}>
              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-300">{item.name}</span>
                  <span className="text-zinc-400">{item.percent.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-1.5 mt-1">
                  <div
                    className="h-1.5 rounded-full animate-slide-right"
                    style={{
                      width: `${item.percent}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-zinc-500">{formatVND(item.value)} VND</span>
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
