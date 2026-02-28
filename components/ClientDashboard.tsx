'use client';

import { useEffect, useRef, useState } from 'react';
import { Dashboard } from './Dashboard';
import {
  AssetRaw,
  Category,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  CategoryBreakdown,
  PortfolioData,
  PriceMap,
} from '@/lib/types';

function resolvePrice(raw: AssetRaw, prices: PriceMap) {
  let currentPrice = 0;
  let change24h = 0;

  switch (raw.category) {
    case 'crypto': {
      const p = prices[raw.symbol.toLowerCase()];
      if (p) { currentPrice = p.vnd; change24h = p.change24h; }
      break;
    }
    case 'stock': {
      const p = prices[raw.symbol.toUpperCase()];
      if (p) { currentPrice = p.vnd; change24h = p.change24h; }
      break;
    }
    case 'gold': {
      const p = prices['__gold__'];
      if (p) { currentPrice = p.vnd; change24h = p.change24h; }
      break;
    }
    case 'usd': {
      const p = prices['__usd__'];
      if (p) { currentPrice = p.vnd; change24h = p.change24h; }
      break;
    }
    case 'cash': {
      currentPrice = 1;
      break;
    }
  }

  return { currentPrice, change24h };
}

function buildPortfolioData(rawAssets: AssetRaw[], prices: PriceMap): PortfolioData {
  const assets = rawAssets.map((raw) => {
    const { currentPrice, change24h } = resolvePrice(raw, prices);
    const totalValue = raw.quantity * currentPrice;
    const totalCost = raw.quantity * raw.buyPrice;
    const pnl = totalValue - totalCost;
    const pnlPercent = totalCost > 0 ? (pnl / totalCost) * 100 : 0;
    return { ...raw, currentPrice, change24h, totalValue, totalCost, pnl, pnlPercent };
  });

  const totalValue = assets.reduce((s, a) => s + a.totalValue, 0);
  const totalCost = assets.reduce((s, a) => s + a.totalCost, 0);
  const totalPnl = totalValue - totalCost;
  const totalPnlPercent = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

  const catMap = new Map<Category, { value: number; cost: number; count: number }>();
  for (const a of assets) {
    const e = catMap.get(a.category) ?? { value: 0, cost: 0, count: 0 };
    e.value += a.totalValue;
    e.cost += a.totalCost;
    e.count += 1;
    catMap.set(a.category, e);
  }

  const categoryBreakdown: CategoryBreakdown[] = Array.from(catMap.entries())
    .map(([cat, d]) => {
      const pnl = d.value - d.cost;
      return {
        category: cat,
        name: CATEGORY_LABELS[cat] || cat,
        value: d.value, cost: d.cost, pnl,
        pnlPercent: d.cost > 0 ? (pnl / d.cost) * 100 : 0,
        percent: totalValue > 0 ? (d.value / totalValue) * 100 : 0,
        color: CATEGORY_COLORS[cat] || '#6b7280',
        count: d.count,
      };
    })
    .sort((a, b) => b.value - a.value);

  return {
    assets: assets.sort((a, b) => b.totalValue - a.totalValue),
    totalValue, totalCost, totalPnl, totalPnlPercent, categoryBreakdown,
    lastUpdated: new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
  };
}

function loadPrices(): PriceMap {
  try {
    const s = localStorage.getItem('portfolio-prices');
    return s ? JSON.parse(s) : {};
  } catch { return {}; }
}

function savePrices(prices: PriceMap) {
  try { localStorage.setItem('portfolio-prices', JSON.stringify(prices)); }
  catch { /* ignore */ }
}

function loadRawAssets(): AssetRaw[] {
  try {
    const s = localStorage.getItem('portfolio-raw-assets');
    return s ? JSON.parse(s) : [];
  } catch { return []; }
}

function saveRawAssets(assets: AssetRaw[]) {
  try { localStorage.setItem('portfolio-raw-assets', JSON.stringify(assets)); }
  catch { /* ignore */ }
}

const emptyData: PortfolioData = {
  assets: [],
  totalValue: 0,
  totalCost: 0,
  totalPnl: 0,
  totalPnlPercent: 0,
  categoryBreakdown: [],
  lastUpdated: new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
};

export function ClientDashboard() {
  // SSR disabled → localStorage available in initializer → no flash of 0s
  const [portfolioData, setPortfolioData] = useState<PortfolioData>(() => {
    const storedAssets = loadRawAssets();
    const storedPrices = loadPrices();
    if (storedAssets.length > 0 && Object.keys(storedPrices).length > 0) {
      return buildPortfolioData(storedAssets, storedPrices);
    }
    return emptyData;
  });
  const rawAssetsRef = useRef<AssetRaw[]>(loadRawAssets());

  useEffect(() => {
    const fetchNotion = async () => {
      try {
        const res = await fetch('/api/portfolio-data');
        if (!res.ok) return;
        const notionData: PortfolioData & { rawAssets?: AssetRaw[] } = await res.json();
        const raw = notionData.rawAssets || [];
        rawAssetsRef.current = raw;
        saveRawAssets(raw);

        // Rebuild with current prices + fresh assets
        const prices = loadPrices();
        if (Object.keys(prices).length > 0) {
          setPortfolioData(buildPortfolioData(raw, prices));
        } else {
          setPortfolioData(notionData);
        }
      } catch (e) {
        console.error('[dashboard] Notion fetch error:', (e as Error).message);
      }
    };

    const fetchPrices = async () => {
      if (rawAssetsRef.current.length === 0) return;
      try {
        const res = await fetch('/api/refresh-prices');
        if (!res.ok) return;
        const prices: PriceMap = await res.json();
        savePrices(prices);
        setPortfolioData(buildPortfolioData(rawAssetsRef.current, prices));
      } catch (e) {
        console.error('[dashboard] Prices fetch error:', (e as Error).message);
      }
    };

    // Initial load: Notion first, then prices
    fetchNotion().then(() => fetchPrices());

    // Refresh Notion every 5 min, prices every 5s
    const notionInterval = setInterval(fetchNotion, 5 * 60 * 1000);
    const pricesInterval = setInterval(fetchPrices, 5000);
    return () => {
      clearInterval(notionInterval);
      clearInterval(pricesInterval);
    };
  }, []);

  return <Dashboard data={portfolioData} />;
}
