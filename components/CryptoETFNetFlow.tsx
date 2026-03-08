'use client';

import { memo, useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type Timeframe = '30D' | '1Y' | 'ALL';

interface APIDataPoint {
  value: number;
  btcValue: number;
  ethValue: number;
  timestamp: string;
}

interface FlowDataPoint {
  date: string;
  btcFlow: number;
  ethFlow: number;
  total: number;
}

interface APIResponse {
  data: {
    points: APIDataPoint[];
    aggregation: string;
    total: number;
    totalBtcValue: number;
    totalEthValue: number;
  };
  status: {
    error_code: string;
    error_message: string;
  };
}

const TIMEFRAME_TO_RANGE: Record<Timeframe, string> = {
  '30D': '30d',
  '1Y': '1y',
  ALL: 'all',
};

function formatDate(timestamp: string, aggregation: string): string {
  const date = new Date(parseInt(timestamp, 10));
  if (aggregation === 'week') {
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  }
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

function formatFlow(value: number): string {
  const absValue = Math.abs(value);
  if (absValue >= 1e9) {
    return `${(value / 1e9).toFixed(1)}B`;
  }
  if (absValue >= 1e6) {
    return `${(value / 1e6).toFixed(0)}M`;
  }
  if (absValue >= 1e3) {
    return `${(value / 1e3).toFixed(0)}K`;
  }
  return `${value.toFixed(0)}`;
}

function formatFlowFull(value: number): string {
  const absValue = Math.abs(value);
  if (absValue >= 1e9) {
    return `$${(value / 1e9).toFixed(2)}B`;
  }
  if (absValue >= 1e6) {
    return `$${(value / 1e6).toFixed(1)}M`;
  }
  return `$${value.toLocaleString()}`;
}

interface TooltipPayload {
  value: number;
  dataKey: string;
  payload: FlowDataPoint;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipPayload[]; label?: string }) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;

  return (
    <div className="theme-bg-secondary theme-border-light border rounded-lg p-3 shadow-xl">
      <p className="theme-text-secondary text-xs mb-2">{label}</p>
      <div className="flex items-center gap-2 mb-1">
        <div className="w-2 h-2 rounded-full bg-orange-500" />
        <span className="theme-text-secondary text-sm">BTC ETF:</span>
        <span className={`text-sm font-medium ${data.btcFlow >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {data.btcFlow >= 0 ? '+' : ''}
          {formatFlowFull(data.btcFlow)}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-blue-500" />
        <span className="theme-text-secondary text-sm">ETH ETF:</span>
        <span className={`text-sm font-medium ${data.ethFlow >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {data.ethFlow >= 0 ? '+' : ''}
          {formatFlowFull(data.ethFlow)}
        </span>
      </div>
      <div className="border-t theme-border mt-2 pt-2">
        <span className="theme-text-secondary text-xs">Total: </span>
        <span className={`text-sm font-medium ${data.total >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {data.total >= 0 ? '+' : ''}
          {formatFlowFull(data.total)}
        </span>
      </div>
    </div>
  );
}

export const CryptoETFNetFlow = memo(function CryptoETFNetFlow() {
  const [data, setData] = useState<FlowDataPoint[]>([]);
  const [totals, setTotals] = useState({ total: 0, btc: 0, eth: 0 });
  const [timeframe, setTimeframe] = useState<Timeframe>('30D');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const range = TIMEFRAME_TO_RANGE[timeframe];
        const res = await fetch(`/api/etf-flow?range=${range}`);

        if (!res.ok) {
          throw new Error('Failed to fetch data');
        }

        const json: APIResponse = await res.json();

        if (json.status.error_code !== '0') {
          throw new Error(json.status.error_message || 'API error');
        }

        const points = json.data.points.map((p) => ({
          date: formatDate(p.timestamp, json.data.aggregation),
          btcFlow: p.btcValue,
          ethFlow: p.ethValue,
          total: p.value,
        }));

        setData(points);
        setTotals({
          total: json.data.total,
          btc: json.data.totalBtcValue,
          eth: json.data.totalEthValue,
        });
      } catch (err) {
        console.error('Failed to fetch ETF data:', err);
        setError('Không thể tải dữ liệu');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [timeframe]);

  const isTotalPositive = totals.total >= 0;
  const isBtcPositive = totals.btc >= 0;
  const isEthPositive = totals.eth >= 0;

  if (loading && data.length === 0) {
    return (
      <div className="theme-bg-card theme-border border rounded-xl p-5 animate-pulse">
        <div className="h-5 theme-bg-tertiary rounded w-48 mb-4" />
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="h-16 theme-bg-tertiary rounded" />
          <div className="h-16 theme-bg-tertiary rounded" />
          <div className="h-16 theme-bg-tertiary rounded" />
        </div>
        <div className="h-[220px] theme-bg-tertiary rounded" />
      </div>
    );
  }

  return (
    <div className="theme-bg-card theme-border border rounded-xl p-5 hover:theme-border-light transition-colors">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <span className="text-base font-medium theme-text-secondary">Crypto ETFs Net Flow</span>
        </div>
        {/* Timeframe selector */}
        <div className="flex gap-1 theme-bg-tertiary rounded-lg p-1">
          {(['30D', '1Y', 'ALL'] as Timeframe[]).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-2.5 py-1 text-xs rounded transition-colors ${
                timeframe === tf ? 'theme-btn-active' : 'theme-btn-inactive'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="h-[300px] flex items-center justify-center">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      ) : (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="theme-bg-tertiary rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs theme-text-secondary">Total Net Flow</span>
              </div>
              <p className={`text-lg font-bold ${isTotalPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                {isTotalPositive ? '+' : ''}
                {formatFlowFull(totals.total)}
              </p>
            </div>
            <div className="theme-bg-tertiary rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-orange-500" />
                <span className="text-xs theme-text-secondary">Bitcoin ETF</span>
              </div>
              <p className={`text-lg font-bold ${isBtcPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                {isBtcPositive ? '+' : ''}
                {formatFlowFull(totals.btc)}
              </p>
            </div>
            <div className="theme-bg-tertiary rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-xs theme-text-secondary">Ethereum ETF</span>
              </div>
              <p className={`text-lg font-bold ${isEthPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                {isEthPositive ? '+' : ''}
                {formatFlowFull(totals.eth)}
              </p>
            </div>
          </div>

          {/* Chart */}
          <div className="h-[220px] relative">
            {loading && (
              <div className="absolute inset-0 bg-zinc-900/50 flex items-center justify-center z-10">
                <div className="w-6 h-6 border-2 border-zinc-600 border-t-zinc-300 rounded-full animate-spin" />
              </div>
            )}
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#71717a', fontSize: 10 }}
                  interval="preserveStartEnd"
                  minTickGap={40}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#71717a', fontSize: 10 }}
                  tickFormatter={(v) => `$${formatFlow(v)}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={0} stroke="#52525b" strokeWidth={1} />
                <Bar dataKey="btcFlow" stackId="a" radius={[0, 0, 0, 0]} maxBarSize={20}>
                  {data.map((entry, index) => (
                    <Cell key={`btc-${index}`} fill={entry.btcFlow >= 0 ? '#f97316' : '#ea580c'} fillOpacity={0.9} />
                  ))}
                </Bar>
                <Bar dataKey="ethFlow" stackId="a" radius={[2, 2, 0, 0]} maxBarSize={20}>
                  {data.map((entry, index) => (
                    <Cell key={`eth-${index}`} fill={entry.ethFlow >= 0 ? '#3b82f6' : '#2563eb'} fillOpacity={0.9} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-center gap-6 mt-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-orange-500" />
              <span className="text-xs theme-text-secondary">BTC ETF</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-blue-500" />
              <span className="text-xs theme-text-secondary">ETH ETF</span>
            </div>
          </div>

          <p className="text-xs theme-text-muted text-center mt-3">
            Nguồn: CoinMarketCap • {timeframe === '30D' ? 'Daily' : 'Weekly'} data
          </p>
        </>
      )}
    </div>
  );
});
