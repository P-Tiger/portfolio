import { PriceMap } from './types';

// Mapping CoinGecko ID -> currency ticker for fallback API
const CRYPTO_ID_TO_TICKER: Record<string, string> = {
  bitcoin: 'btc',
  ethereum: 'eth',
  solana: 'sol',
  binancecoin: 'bnb',
  cardano: 'ada',
  ripple: 'xrp',
  dogecoin: 'doge',
  polkadot: 'dot',
  avalanche: 'avax',
  chainlink: 'link',
  tron: 'trx',
  litecoin: 'ltc',
  'shiba-inu': 'shib',
  uniswap: 'uni',
  toncoin: 'ton',
};

// ============ CRYPTO ============
export async function fetchCryptoPrices(ids: string[]): Promise<PriceMap> {
  if (ids.length === 0) return {};

  // Try CoinGecko first
  const coingecko = await fetchCryptoCoinGecko(ids);
  if (Object.keys(coingecko).length > 0) return coingecko;

  // Fallback to fawazahmed0
  console.log('[prices] CoinGecko failed, trying fawazahmed0 fallback...');
  return fetchCryptoFallback(ids);
}

async function fetchCryptoCoinGecko(ids: string[]): Promise<PriceMap> {
  try {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=vnd&include_24hr_change=true`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'PortfolioDashboard/1.0' },
      cache: 'no-store',
    });
    if (!res.ok) {
      console.error(`[prices] CoinGecko HTTP ${res.status}`);
      return {};
    }
    const data = await res.json();
    if (data.status?.error_code) {
      console.error(`[prices] CoinGecko API error:`, data.status);
      return {};
    }
    const map: PriceMap = {};
    for (const id of ids) {
      if (data[id]?.vnd) {
        map[id] = {
          vnd: data[id].vnd,
          change24h: data[id].vnd_24h_change ?? 0,
        };
      }
    }
    console.log(`[prices] CoinGecko OK: ${Object.keys(map).join(', ')}`);
    return map;
  } catch (e) {
    console.error('[prices] CoinGecko fetch error:', (e as Error).message);
    return {};
  }
}

async function fetchCryptoFallback(ids: string[]): Promise<PriceMap> {
  const map: PriceMap = {};
  const promises = ids.map(async (id) => {
    const ticker = CRYPTO_ID_TO_TICKER[id];
    if (!ticker) {
      console.warn(`[prices] No ticker mapping for "${id}", skipping fallback`);
      return;
    }
    try {
      const url = `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${ticker}.json`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      const vnd = data[ticker]?.vnd;
      if (vnd && vnd > 0) {
        map[id] = { vnd, change24h: 0 };
        console.log(`[prices] Fallback OK: ${id} = ${vnd} VND`);
      }
    } catch {
      console.error(`[prices] Fallback failed for ${id}`);
    }
  });
  await Promise.all(promises);
  return map;
}

// ============ VN STOCKS (CafeF) ============
export async function fetchStockPrices(tickers: string[]): Promise<PriceMap> {
  if (tickers.length === 0) return {};
  try {
    const map: PriceMap = {};
    const remaining = new Set(tickers);

    for (const center of [1, 2, 3]) {
      if (remaining.size === 0) break;
      const url = `https://banggia.cafef.vn/stockhandler.ashx?center=${center}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) continue;
      const data: Array<{ a: string; b: number; k: number; l: number }> = await res.json();
      for (const item of data) {
        const ticker = item.a?.toUpperCase();
        if (remaining.has(ticker)) {
          const price = (item.b ?? item.l ?? 0) * 1000;
          const ref = (item.l ?? 0) * 1000;
          const change = ref > 0 ? ((price - ref) / ref) * 100 : 0;
          map[ticker] = { vnd: price, change24h: change };
          remaining.delete(ticker);
        }
      }
    }
    console.log(`[prices] CafeF OK: ${Object.keys(map).join(', ')}`);
    return map;
  } catch (e) {
    console.error('[prices] CafeF error:', (e as Error).message);
    return {};
  }
}

// ============ GOLD (SJC Vietnam / fallback XAU international) ============
const TROY_OZ_TO_CHI = 8.294;

async function fetchGoldSJC(): Promise<{ pricePerChi: number } | null> {
  try {
    const url = 'https://sjc.com.vn/GoldPrice/Services/PriceService.ashx';
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.success || !Array.isArray(json.data)) return null;
    // Find SJC bar price (1L, 10L, 1KG) in Ho Chi Minh - BuyValue is per lượng
    const sjc = json.data.find(
      (item: { TypeName: string; BranchName: string }) =>
        item.TypeName?.includes('SJC 1L') && item.BranchName === 'Hồ Chí Minh',
    );
    const buyPerLuong = (sjc as { BuyValue?: number })?.BuyValue;
    if (!buyPerLuong || buyPerLuong <= 0) return null;
    return { pricePerChi: buyPerLuong / 10 };
  } catch {
    return null;
  }
}

export async function fetchGoldPricePerChi(): Promise<PriceMap> {
  // Try SJC official API first (accurate domestic price)
  const sjc = await fetchGoldSJC();
  if (sjc) {
    console.log(`[prices] SJC Gold OK: ${Math.round(sjc.pricePerChi)} VND/chỉ`);
    return { __gold__: { vnd: sjc.pricePerChi, change24h: 0 } };
  }

  // Fallback to international XAU price
  console.log('[prices] SJC failed, trying XAU international fallback...');
  try {
    const url = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/xau.json';
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Gold API ${res.status}`);
    const data = await res.json();
    const pricePerOz = data.xau?.vnd ?? 0;
    if (pricePerOz === 0) throw new Error('Gold price is 0');
    const pricePerChi = pricePerOz / TROY_OZ_TO_CHI;
    console.log(`[prices] Gold XAU fallback: ${Math.round(pricePerChi)} VND/chỉ`);
    return { __gold__: { vnd: pricePerChi, change24h: 0 } };
  } catch (e) {
    console.error('[prices] Gold error:', (e as Error).message);
    return {};
  }
}

// ============ USD/VND Exchange Rate ============
export async function fetchUsdRate(): Promise<PriceMap> {
  try {
    const url = 'https://open.er-api.com/v6/latest/USD';
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`USD API ${res.status}`);
    const data = await res.json();
    const rate = data.rates?.VND ?? 0;
    if (rate === 0) throw new Error('USD rate is 0');
    console.log(`[prices] USD OK: ${rate} VND`);
    return { __usd__: { vnd: rate, change24h: 0 } };
  } catch (e) {
    console.error('[prices] USD error:', (e as Error).message);
    return {};
  }
}

// ============ CRYPTO HISTORICAL (CoinGecko / fallback) ============
export interface HistoryPoint {
  timestamp: number;
  price: number;
}

export async function fetchCryptoHistory(id: string, days: number = 30): Promise<HistoryPoint[]> {
  // Try CoinGecko market_chart first (fine-grained: 5-min to daily)
  try {
    const url = `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=vnd&days=${days}`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'PortfolioDashboard/1.0' },
      cache: 'no-store',
    });
    if (res.ok) {
      const data = await res.json();
      if (data.prices?.length) {
        console.log(`[prices] CoinGecko history OK: ${id} (${data.prices.length} points, ${days}d)`);
        return data.prices.map((p: [number, number]) => ({
          timestamp: p[0],
          price: p[1],
        }));
      }
    }
  } catch (e) {
    console.warn(`[prices] CoinGecko history failed for ${id}:`, (e as Error).message);
  }

  // Fallback: fawazahmed0 daily data (same approach as gold/usd history)
  const ticker = CRYPTO_ID_TO_TICKER[id];
  if (!ticker) {
    console.warn(`[prices] No ticker mapping for "${id}", cannot fetch history fallback`);
    return [];
  }

  console.log(`[prices] Trying fawazahmed0 history fallback for ${id} (${ticker})...`);
  const points: HistoryPoint[] = [];
  const now = new Date();
  const sampleCount = Math.min(days, 10);
  const interval = Math.max(1, Math.floor(days / sampleCount));
  const dates: string[] = [];

  for (let i = days; i >= 0; i -= interval) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }

  const results = await Promise.allSettled(
    dates.map(async (date) => {
      const apiUrl = `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${date}/v1/currencies/${ticker}.json`;
      const res = await fetch(apiUrl, { cache: 'no-store' });
      if (!res.ok) return null;
      const data = await res.json();
      const vnd = data?.[ticker]?.vnd;
      if (!vnd || vnd === 0) return null;
      return { timestamp: new Date(date).getTime(), price: vnd };
    }),
  );

  for (const r of results) {
    if (r.status === 'fulfilled' && r.value) {
      points.push(r.value);
    }
  }

  console.log(`[prices] Fallback history for ${id}: ${points.length} data points`);
  return points.sort((a, b) => a.timestamp - b.timestamp);
}

// ============ GOLD HISTORICAL (fawazahmed0 dated versions) ============
export async function fetchGoldHistory(days: number = 30): Promise<HistoryPoint[]> {
  const points: HistoryPoint[] = [];
  const now = new Date();
  const sampleCount = Math.min(days, 10);
  const interval = Math.max(1, Math.floor(days / sampleCount));
  const dates: string[] = [];

  for (let i = days; i >= 0; i -= interval) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }

  const results = await Promise.allSettled(
    dates.map(async (date) => {
      const url = `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${date}/v1/currencies/xau.json`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) return null;
      const data = await res.json();
      const vndPerOz = data?.xau?.vnd;
      if (!vndPerOz || vndPerOz === 0) return null;
      const vndPerChi = Math.abs(vndPerOz) / TROY_OZ_TO_CHI;
      return { timestamp: new Date(date).getTime(), price: vndPerChi };
    }),
  );

  for (const r of results) {
    if (r.status === 'fulfilled' && r.value) {
      points.push(r.value);
    }
  }

  console.log(`[prices] Gold history: ${points.length} data points`);
  return points.sort((a, b) => a.timestamp - b.timestamp);
}

// ============ USD HISTORICAL (fawazahmed0 dated versions) ============
export async function fetchUsdHistory(days: number = 30): Promise<HistoryPoint[]> {
  const points: HistoryPoint[] = [];
  const now = new Date();
  const sampleCount = Math.min(days, 10);
  const interval = Math.max(1, Math.floor(days / sampleCount));
  const dates: string[] = [];

  for (let i = days; i >= 0; i -= interval) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }

  const results = await Promise.allSettled(
    dates.map(async (date) => {
      const url = `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${date}/v1/currencies/usd.json`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) return null;
      const data = await res.json();
      const rate = data?.usd?.vnd;
      if (!rate || rate === 0) return null;
      return { timestamp: new Date(date).getTime(), price: rate };
    }),
  );

  for (const r of results) {
    if (r.status === 'fulfilled' && r.value) {
      points.push(r.value);
    }
  }

  console.log(`[prices] USD history: ${points.length} data points`);
  return points.sort((a, b) => a.timestamp - b.timestamp);
}

// ============ FETCH ALL PRICES ============
export async function fetchAllPrices(
  cryptoIds: string[],
  stockTickers: string[],
  hasGold: boolean,
  hasUsd: boolean,
): Promise<PriceMap> {
  const promises: Promise<PriceMap>[] = [];
  promises.push(fetchCryptoPrices(cryptoIds));
  promises.push(fetchStockPrices(stockTickers));
  if (hasGold) promises.push(fetchGoldPricePerChi());
  if (hasUsd) promises.push(fetchUsdRate());

  const results = await Promise.all(promises);
  const merged = Object.assign({}, ...results);
  console.log(`[prices] All prices fetched: ${Object.keys(merged).length} items`);
  return merged;
}
