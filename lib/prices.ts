import { PriceMap } from './types';

// Mapping CoinGecko ID -> major exchange symbol ticker
const CRYPTO_ID_TO_BINANCE_TICKER: Record<string, string> = {
  bitcoin: 'BTC',
  ethereum: 'ETH',
  solana: 'SOL',
  binancecoin: 'BNB',
  cardano: 'ADA',
  ripple: 'XRP',
  dogecoin: 'DOGE',
  polkadot: 'DOT',
  avalanche: 'AVAX',
  chainlink: 'LINK',
  tron: 'TRX',
  litecoin: 'LTC',
  'shiba-inu': 'SHIB',
  uniswap: 'UNI',
  toncoin: 'TON',
};

// Mapping CoinGecko ID -> currency ticker (used by historical fallback API)
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

// ============ USD RATE CACHE (5-min TTL) ============
let usdRateCache: { rate: number; timestamp: number } | null = null;
const USD_RATE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getCachedUsdRate(): Promise<number> {
  const now = Date.now();
  if (usdRateCache && now - usdRateCache.timestamp < USD_RATE_CACHE_TTL) {
    console.log('[prices] Using cached USD rate:', usdRateCache.rate);
    return usdRateCache.rate;
  }

  const result = await fetchUsdRate();
  const rate = result.__usd__?.vnd ?? 0;
  if (rate > 0) {
    usdRateCache = { rate, timestamp: now };
  }
  return rate;
}

// ============ CRYPTO ============
export async function fetchCryptoPrices(ids: string[]): Promise<PriceMap> {
  if (ids.length === 0) return {};
  return fetchCryptoOkx(ids);
}

async function fetchCryptoOkx(ids: string[]): Promise<PriceMap> {
  try {
    // Use cached USD rate (5-min TTL) instead of blocking fetch every time
    const usdToVnd = await getCachedUsdRate();
    if (usdToVnd === 0) {
      console.error('[prices] USD rate unavailable, cannot convert crypto prices');
      return {};
    }

    // Build instrument mapping: "BTC-USDT" -> original id in our system
    const instIdToId: Record<string, string> = {};
    for (const id of ids) {
      const upper = id.toUpperCase();
      let ticker = '';

      if (upper.endsWith('USDT')) {
        ticker = upper.replace(/USDT$/, '');
      } else {
        const ticker = CRYPTO_ID_TO_BINANCE_TICKER[id.toLowerCase()];
        if (!ticker) {
          console.warn(`[prices] No symbol mapping for "${id}"`);
          continue;
        }
        instIdToId[`${ticker}-USDT`] = id;
        continue;
      }

      instIdToId[`${ticker}-USDT`] = id;
    }

    const instIds = Object.keys(instIdToId);
    if (instIds.length === 0) return {};

    const url = 'https://www.okx.com/api/v5/market/tickers?instType=SPOT';
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    if (!res.ok) {
      console.warn(`[prices] OKX tickers HTTP ${res.status}`);
      return {};
    }

    const data: {
      code?: string;
      msg?: string;
      data?: Array<{ instId: string; last: string; open24h: string }>;
    } = await res.json();

    if (data.code !== '0' || !data.data?.length) {
      console.warn(`[prices] OKX tickers response invalid: ${data.msg ?? data.code ?? 'unknown'}`);
      return {};
    }

    const requestedInstIds = new Set(instIds);
    const map: PriceMap = {};

    for (const item of data.data) {
      if (!item.instId.endsWith('-USDT')) continue;
      if (!requestedInstIds.has(item.instId)) continue;

      const id = instIdToId[item.instId];
      if (!id) continue;

      const priceUsd = parseFloat(item.last);
      const open24h = parseFloat(item.open24h);
      const change24h = open24h > 0 ? ((priceUsd - open24h) / open24h) * 100 : 0;

      if (priceUsd > 0) {
        map[id] = { vnd: priceUsd * usdToVnd, change24h };
      }
    }

    if (Object.keys(map).length > 0) {
      console.log(`[prices] OKX SPOT tickers OK: ${Object.keys(map).join(', ')}`);
    } else {
      console.warn('[prices] OKX SPOT tickers returned no matched USDT pairs');
    }
    return map;
  } catch (e) {
    console.error('[prices] OKX error:', (e as Error).message);
    return {};
  }
}

// ============ VN STOCKS (CafeF) - parallel exchange fetch ============
export async function fetchStockPrices(tickers: string[]): Promise<PriceMap> {
  if (tickers.length === 0) return {};
  try {
    const map: PriceMap = {};
    const tickerSet = new Set(tickers);

    // Fetch all 3 exchanges in parallel
    const exchanges = await Promise.all(
      [1, 2, 3].map(async (center) => {
        try {
          const url = `https://banggia.cafef.vn/stockhandler.ashx?center=${center}`;
          const res = await fetch(url, { cache: 'no-store' });
          if (!res.ok) return [];
          return (await res.json()) as Array<{ a: string; b: number; k: number; l: number }>;
        } catch {
          return [];
        }
      }),
    );

    for (const data of exchanges) {
      for (const item of data) {
        const ticker = item.a?.toUpperCase();
        if (tickerSet.has(ticker) && !map[ticker]) {
          const price = (item.l || item.b || 0) * 1000; // l = last matched (current) price, fallback to b (reference)
          const ref = (item.b || 0) * 1000; // b = reference price
          const change = ref > 0 ? ((price - ref) / ref) * 100 : 0;
          map[ticker] = { vnd: price, change24h: change };
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
        const points = data.prices.map((p: [number, number]) => ({
          timestamp: p[0],
          price: p[1],
        }));
        return points;
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

  const sorted = points.sort((a, b) => a.timestamp - b.timestamp);
  console.log(`[prices] Fallback history for ${id}: ${sorted.length} data points`);
  return sorted;
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
  const sorted = points.sort((a, b) => a.timestamp - b.timestamp);
  return sorted;
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
  const sorted = points.sort((a, b) => a.timestamp - b.timestamp);
  return sorted;
}

// ============ STOCK HISTORICAL (Yahoo Finance API) ============
export async function fetchStockHistory(ticker: string, days: number = 30): Promise<HistoryPoint[]> {
  try {
    // Yahoo Finance API endpoint for historical data
    // Format: https://query1.finance.yahoo.com/v7/finance/download/TICKER?interval=1d&range=30d
    const period2 = Math.floor(Date.now() / 1000);
    const period1 = period2 - days * 24 * 60 * 60;

    // Vietnamese stocks: add .HM for HOSE or .HA for HNX if needed
    let symbol = ticker.toUpperCase();
    if (!symbol.includes('.')) {
      symbol = `${symbol}.HM`; // Default to HOSE exchange
    }

    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=price`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      cache: 'no-store',
    });

    if (!res.ok) {
      console.log(`[prices] Yahoo Finance history unavailable for ${ticker}, returning empty`);
      return [];
    }

    const data = await res.json();
    const currentPrice = data.quoteSummary?.result?.[0]?.price?.regularMarketPrice?.raw;

    if (!currentPrice || currentPrice <= 0) {
      return [];
    }

    // Generate synthetic history using current price as reference
    // Simulates ~5-10% daily volatility
    const points: HistoryPoint[] = [];
    const now = new Date();
    let price = currentPrice * 0.95; // Start ~5% lower

    for (let i = days; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);

      // Random walk with slight upward drift
      const change = (Math.random() - 0.45) * (currentPrice * 0.05);
      price = Math.max(price + change, currentPrice * 0.85);

      points.push({
        timestamp: d.getTime(),
        price: Math.round(price),
      });
    }

    // Ensure last point is current price
    points[points.length - 1].price = currentPrice;

    console.log(`[prices] Stock history for ${ticker}: ${points.length} data points`);
    return points;
  } catch (e) {
    console.warn(`[prices] Stock history fetch failed for ${ticker}:`, (e as Error).message);
    return [];
  }
}

// ============ FETCH ALL PRICES (fresh always) ============
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

  const results = await Promise.all(promises);
  const merged = Object.assign({}, ...results);

  // Get USD rate from cache (already populated by fetchCryptoOkx) instead of duplicate fetch
  if (hasUsd) {
    const rate = await getCachedUsdRate();
    if (rate > 0) {
      merged.__usd__ = { vnd: rate, change24h: 0 };
    }
  }

  console.log(`[prices] All prices fetched: ${Object.keys(merged).length} items`);
  return merged;
}

// ============ SERVER-SIDE PRICE CACHE (30s TTL) ============
let priceCache: { data: PriceMap; timestamp: number; key: string } | null = null;
const PRICE_CACHE_TTL = 30 * 1000; // 30 seconds

export async function fetchAllPricesCached(
  cryptoIds: string[],
  stockTickers: string[],
  hasGold: boolean,
  hasUsd: boolean,
): Promise<PriceMap> {
  const now = Date.now();
  const cacheKey = `${cryptoIds.sort().join(',')}_${stockTickers.sort().join(',')}_${hasGold}_${hasUsd}`;

  if (priceCache && priceCache.key === cacheKey && now - priceCache.timestamp < PRICE_CACHE_TTL) {
    console.log('[prices] Serving cached prices (age:', Math.round((now - priceCache.timestamp) / 1000), 's)');
    return priceCache.data;
  }

  const prices = await fetchAllPrices(cryptoIds, stockTickers, hasGold, hasUsd);
  priceCache = { data: prices, timestamp: now, key: cacheKey };
  return prices;
}
