'use client';

import { memo, useEffect, useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';

interface SentimentData {
  crypto: {
    value: number;
    classification: string;
    timestamp: string;
  } | null;
  stock: {
    value: number;
    classification: string;
    timestamp: string;
  } | null;
}

function getClassification(value: number): string {
  if (value <= 25) return 'Extreme Fear';
  if (value <= 45) return 'Fear';
  if (value <= 55) return 'Neutral';
  if (value <= 75) return 'Greed';
  return 'Extreme Greed';
}

function getSentimentColor(value: number): string {
  if (value <= 25) return '#ef4444';
  if (value <= 45) return '#fb923c';
  if (value <= 55) return '#facc15';
  if (value <= 75) return '#a3e635';
  return '#34d399';
}

function getSentimentTextColor(value: number): string {
  if (value <= 25) return 'text-red-500';
  if (value <= 45) return 'text-orange-400';
  if (value <= 55) return 'text-yellow-400';
  if (value <= 75) return 'text-lime-400';
  return 'text-emerald-400';
}

function getClassificationVi(classification: string): string {
  const map: Record<string, string> = {
    'Extreme Fear': 'Cực Sợ Hãi',
    Fear: 'Sợ Hãi',
    Neutral: 'Trung Lập',
    Greed: 'Tham Lam',
    'Extreme Greed': 'Cực Tham Lam',
  };
  return map[classification] || classification;
}

const GAUGE_COLORS = ['#ef4444', '#fb923c', '#facc15', '#a3e635', '#34d399'];

function GaugeChart({ value, label }: { value: number; label: string }) {
  const gaugeData = [
    { name: 'Extreme Fear', value: 25 },
    { name: 'Fear', value: 20 },
    { name: 'Neutral', value: 10 },
    { name: 'Greed', value: 20 },
    { name: 'Extreme Greed', value: 25 },
  ];

  // Value 0 = -90deg (left), Value 50 = 0deg (up), Value 100 = 90deg (right)
  const needleRotation = (value / 100) * 180 - 90;

  return (
    <div className="relative w-full h-[160px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={gaugeData}
            cx="50%"
            cy="85%"
            startAngle={180}
            endAngle={0}
            innerRadius={60}
            outerRadius={85}
            dataKey="value"
            stroke="none"
            isAnimationActive={false}
          >
            {gaugeData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={GAUGE_COLORS[index]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div
        className="absolute left-1/2 bottom-[15%] origin-bottom"
        style={{
          transform: `translateX(-50%) rotate(${needleRotation}deg)`,
          width: '3px',
          height: '50px',
          background: 'linear-gradient(to top, #fff 0%, #fff 70%, transparent 100%)',
          borderRadius: '2px',
          boxShadow: '0 0 8px rgba(255,255,255,0.5)',
        }}
      />
      <div className="absolute left-1/2 bottom-[15%] -translate-x-1/2 w-4 h-4 bg-white rounded-full shadow-lg" />
      <div className="absolute left-1/2 bottom-0 -translate-x-1/2 text-center">
        <span className={`text-3xl font-bold ${getSentimentTextColor(value)}`}>{value}</span>
        <p className="text-xs text-zinc-400 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

export const MarketSentiment = memo(function MarketSentiment() {
  const [data, setData] = useState<SentimentData>({ crypto: null, stock: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSentiment() {
      try {
        // Fetch Crypto Fear & Greed Index
        const cryptoRes = await fetch('https://api.alternative.me/fng/?limit=1');
        const cryptoData = await cryptoRes.json();
        const cryptoValue = parseInt(cryptoData.data[0].value, 10);

        // For stock market, we'll use CNN Fear & Greed proxy or simulate with VIX-based calculation
        // Since CNN API is not publicly available, we'll show a placeholder or use an alternative
        // For now, let's fetch VIX data from a free source
        let stockValue = 50; // Default neutral
        let stockClassification = 'Neutral';

        try {
          // Try to get VIX-based sentiment (inverted: high VIX = fear, low VIX = greed)
          // Using Yahoo Finance proxy through a CORS-enabled endpoint
          const vixRes = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?interval=1d&range=1d');
          if (vixRes.ok) {
            const vixData = await vixRes.json();
            const vixValue = vixData.chart?.result?.[0]?.meta?.regularMarketPrice || 20;
            // Convert VIX to Fear/Greed scale (inverted)
            // VIX 10 = Extreme Greed (100), VIX 40+ = Extreme Fear (0)
            stockValue = Math.max(0, Math.min(100, 100 - (vixValue - 10) * (100 / 30)));
            stockClassification = getClassification(stockValue);
          }
        } catch {
          // If VIX fetch fails, keep default neutral
        }

        setData({
          crypto: {
            value: cryptoValue,
            classification: cryptoData.data[0].value_classification,
            timestamp: new Date(parseInt(cryptoData.data[0].timestamp, 10) * 1000).toLocaleDateString('vi-VN'),
          },
          stock: {
            value: Math.round(stockValue),
            classification: stockClassification,
            timestamp: new Date().toLocaleDateString('vi-VN'),
          },
        });
      } catch (error) {
        console.error('Failed to fetch sentiment data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchSentiment();
    // Refresh every 5 minutes
    const interval = setInterval(fetchSentiment, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 animate-pulse">
            <div className="h-5 bg-zinc-800 rounded w-40 mb-4 mx-auto" />
            <div className="h-[160px] bg-zinc-800 rounded" />
            <div className="h-4 bg-zinc-800 rounded w-24 mt-3 mx-auto" />
          </div>
        ))}
      </div>
    );
  }

  const sentimentCards = [
    {
      label: 'Crypto Fear & Greed',
      shortLabel: 'Crypto',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M9.5 9.5c.5-1 1.5-1.5 2.5-1.5 1.5 0 2.5 1 2.5 2.5 0 1.5-1.5 2-2.5 2.5V15" />
          <circle cx="12" cy="18" r="0.5" fill="currentColor" />
        </svg>
      ),
      data: data.crypto,
      iconBg: 'bg-amber-500/20',
      iconColor: 'text-amber-400',
    },
    {
      label: 'Stock Fear & Greed',
      shortLabel: 'Chứng khoán',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      ),
      data: data.stock,
      iconBg: 'bg-blue-500/20',
      iconColor: 'text-blue-400',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {sentimentCards.map((card) => (
        <div
          key={card.label}
          className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-colors"
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className={`p-2 rounded-lg ${card.iconBg} ${card.iconColor}`}>{card.icon}</div>
            <span className="text-base font-medium text-zinc-300">{card.label}</span>
          </div>

          {card.data ? (
            <>
              <GaugeChart value={card.data.value} label={getClassificationVi(card.data.classification)} />
              <div className="flex justify-between text-xs text-zinc-500 mt-2 px-2">
                <span>Sợ Hãi</span>
                <span>Cập nhật: {card.data.timestamp}</span>
                <span>Tham Lam</span>
              </div>
            </>
          ) : (
            <div className="h-[160px] flex items-center justify-center">
              <p className="text-zinc-500 text-sm">Không có dữ liệu</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
});

// Single sentiment card component for use in category tabs
export const CryptoSentiment = memo(function CryptoSentiment() {
  const [data, setData] = useState<{ value: number; classification: string; timestamp: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCryptoSentiment() {
      try {
        const res = await fetch('https://api.alternative.me/fng/?limit=1');
        const json = await res.json();
        const value = parseInt(json.data[0].value, 10);
        setData({
          value,
          classification: json.data[0].value_classification,
          timestamp: new Date(parseInt(json.data[0].timestamp, 10) * 1000).toLocaleDateString('vi-VN'),
        });
      } catch (error) {
        console.error('Failed to fetch crypto sentiment:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchCryptoSentiment();
    const interval = setInterval(fetchCryptoSentiment, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 animate-pulse">
        <div className="h-5 bg-zinc-800 rounded w-40 mb-4 mx-auto" />
        <div className="h-[160px] bg-zinc-800 rounded" />
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-colors">
      <div className="flex items-center justify-center gap-2 mb-2">
        <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.5 9.5c.5-1 1.5-1.5 2.5-1.5 1.5 0 2.5 1 2.5 2.5 0 1.5-1.5 2-2.5 2.5V15" />
            <circle cx="12" cy="18" r="0.5" fill="currentColor" />
          </svg>
        </div>
        <span className="text-base font-medium text-zinc-300">Crypto Fear & Greed</span>
      </div>
      {data ? (
        <>
          <GaugeChart value={data.value} label={getClassificationVi(data.classification)} />
          <div className="flex justify-between text-xs text-zinc-500 mt-2 px-2">
            <span>Sợ Hãi</span>
            <span>Cập nhật: {data.timestamp}</span>
            <span>Tham Lam</span>
          </div>
        </>
      ) : (
        <div className="h-[160px] flex items-center justify-center">
          <p className="text-zinc-500 text-sm">Không có dữ liệu</p>
        </div>
      )}
    </div>
  );
});

export const StockSentiment = memo(function StockSentiment() {
  const [data, setData] = useState<{ value: number; classification: string; timestamp: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStockSentiment() {
      try {
        let stockValue = 50;
        let stockClassification = 'Neutral';
        const res = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?interval=1d&range=1d');
        if (res.ok) {
          const json = await res.json();
          const vixValue = json.chart?.result?.[0]?.meta?.regularMarketPrice || 20;
          stockValue = Math.max(0, Math.min(100, 100 - (vixValue - 10) * (100 / 30)));
          stockClassification = getClassification(stockValue);
        }
        setData({
          value: Math.round(stockValue),
          classification: stockClassification,
          timestamp: new Date().toLocaleDateString('vi-VN'),
        });
      } catch (error) {
        console.error('Failed to fetch stock sentiment:', error);
        setData({
          value: 50,
          classification: 'Neutral',
          timestamp: new Date().toLocaleDateString('vi-VN'),
        });
      } finally {
        setLoading(false);
      }
    }
    fetchStockSentiment();
    const interval = setInterval(fetchStockSentiment, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 animate-pulse">
        <div className="h-5 bg-zinc-800 rounded w-40 mb-4 mx-auto" />
        <div className="h-[160px] bg-zinc-800 rounded" />
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-colors">
      <div className="flex items-center justify-center gap-2 mb-2">
        <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
        </div>
        <span className="text-base font-medium text-zinc-300">Stock Fear & Greed</span>
      </div>
      {data ? (
        <>
          <GaugeChart value={data.value} label={getClassificationVi(data.classification)} />
          <div className="flex justify-between text-xs text-zinc-500 mt-2 px-2">
            <span>Sợ Hãi</span>
            <span>Cập nhật: {data.timestamp}</span>
            <span>Tham Lam</span>
          </div>
        </>
      ) : (
        <div className="h-[160px] flex items-center justify-center">
          <p className="text-zinc-500 text-sm">Không có dữ liệu</p>
        </div>
      )}
    </div>
  );
});
