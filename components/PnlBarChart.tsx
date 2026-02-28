'use client';

import { formatVND } from '@/lib/format';
import { Asset } from '@/lib/types';
import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: { name: string; pnl: number; pnlPercent: number } }>;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const isPositive = d.pnl >= 0;
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm">
      <p className="font-medium text-white">{d.name}</p>
      <p className={isPositive ? 'text-emerald-400' : 'text-red-400'}>
        {isPositive ? '+' : ''}
        {formatVND(d.pnl)} VND
      </p>
      <p className="text-zinc-400">
        {isPositive ? '+' : ''}
        {d.pnlPercent.toFixed(1)}%
      </p>
    </div>
  );
}

export function PnlBarChart({ assets }: { assets: Asset[] }) {
  const data = assets
    .filter((a) => a.totalCost > 0)
    .sort((a, b) => b.pnl - a.pnl)
    .slice(0, 10)
    .map((a) => ({
      name: a.name.length > 12 ? a.name.slice(0, 12) + '...' : a.name,
      pnl: a.pnl,
      pnlPercent: a.pnlPercent,
    }));

  if (data.length === 0) return null;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <h2 className="text-lg font-semibold text-white mb-4">Lời / Lỗ theo tài sản</h2>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20 }}>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" width={100} tick={{ fill: '#a1a1aa', fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <ReferenceLine x={0} stroke="#3f3f46" />
            <Bar dataKey="pnl" radius={[0, 4, 4, 0]} maxBarSize={24}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.pnl >= 0 ? '#34d399' : '#f87171'} fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
