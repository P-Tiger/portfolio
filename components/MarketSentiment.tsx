'use client';

import { memo, useEffect, useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';

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
        <p className="text-xs theme-text-secondary mt-0.5">{label}</p>
      </div>
    </div>
  );
}

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
      <div className="theme-bg-card theme-border border rounded-xl p-5 animate-pulse">
        <div className="h-5 theme-bg-tertiary rounded w-40 mb-4 mx-auto" />
        <div className="h-[160px] theme-bg-tertiary rounded" />
      </div>
    );
  }

  return (
    <div className="theme-bg-card theme-border border rounded-xl p-5 hover:theme-border-light transition-colors">
      <div className="flex items-center justify-center gap-2 mb-2">
        <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.5 9.5c.5-1 1.5-1.5 2.5-1.5 1.5 0 2.5 1 2.5 2.5 0 1.5-1.5 2-2.5 2.5V15" />
            <circle cx="12" cy="18" r="0.5" fill="currentColor" />
          </svg>
        </div>
        <span className="text-base font-medium theme-text-secondary">Crypto Fear & Greed</span>
      </div>
      {data ? (
        <>
          <GaugeChart value={data.value} label={getClassificationVi(data.classification)} />
          <div className="flex justify-between text-xs theme-text-muted mt-2 px-2">
            <span>Sợ Hãi</span>
            <span>Cập nhật: {data.timestamp}</span>
            <span>Tham Lam</span>
          </div>
        </>
      ) : (
        <div className="h-[160px] flex items-center justify-center">
          <p className="theme-text-muted text-sm">Không có dữ liệu</p>
        </div>
      )}
    </div>
  );
});
