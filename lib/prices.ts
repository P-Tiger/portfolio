import { PriceMap } from './types';

// ============ USD RATE CACHE (5-min TTL) ============
let usdRateCache: { rate: number; timestamp: number } | null = null;
const USD_RATE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

type OkxSpotTicker = { instId: string; last: string; open24h: string };
let okxSpotTickersCache: { data: OkxSpotTicker[]; timestamp: number } | null = null;
const OKX_SPOT_TICKERS_CACHE_TTL = 30 * 1000; // 30 seconds

// ============ SJC GOLD CACHE (1-hour TTL) ============
let sjcGoldCache: { pricePerChi: number; timestamp: number } | null = null;
const SJC_CACHE_TTL = 60 * 60 * 1000; // 1 hour

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

async function getCachedOkxSpotTickers(): Promise<OkxSpotTicker[] | null> {
  const now = Date.now();
  if (okxSpotTickersCache && now - okxSpotTickersCache.timestamp < OKX_SPOT_TICKERS_CACHE_TTL) {
    console.log('[prices] Using cached OKX SPOT tickers');
    return okxSpotTickersCache.data;
  }

  const url = 'https://www.okx.com/api/v5/market/tickers?instType=SPOT';
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  if (!res.ok) {
    console.warn(`[prices] OKX tickers HTTP ${res.status}`);
    return null;
  }

  const body: {
    code?: string;
    msg?: string;
    data?: OkxSpotTicker[];
  } = await res.json();

  if (body.code !== '0' || !body.data?.length) {
    console.warn(`[prices] OKX tickers response invalid: ${body.msg ?? body.code ?? 'unknown'}`);
    return null;
  }

  okxSpotTickersCache = { data: body.data, timestamp: now };
  return body.data;
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

      if (!upper.endsWith('USDT')) {
        console.warn(`[prices] Skipping "${id}" – expected ticker ending with USDT`);
        continue;
      }

      ticker = upper.replace(/USDT$/, '');
      instIdToId[`${ticker}-USDT`] = id;
    }

    const instIds = Object.keys(instIdToId);
    if (instIds.length === 0) return {};

    const tickers = await getCachedOkxSpotTickers();
    if (!tickers?.length) {
      return {};
    }

    const requestedInstIds = new Set(instIds);
    const map: PriceMap = {};

    for (const item of tickers) {
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

// ============ GOLD (SJC Vietnam) ============
export async function fetchGoldPricePerChi(): Promise<PriceMap> {
  const now = Date.now();
  if (sjcGoldCache && now - sjcGoldCache.timestamp < SJC_CACHE_TTL) {
    console.log(`[prices] Using cached SJC Gold: ${Math.round(sjcGoldCache.pricePerChi)} VND/chỉ`);
    return { __gold__: { vnd: sjcGoldCache.pricePerChi, change24h: 0 } };
  }

  try {
    const url = 'https://sjc.com.vn/GoldPrice/Services/PriceService.ashx';
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`SJC HTTP ${res.status}`);
    const json = await res.json();
    if (!json.success || !Array.isArray(json.data)) throw new Error('SJC invalid response');
    // Find SJC bar price (1L) in Ho Chi Minh - BuyValue is per lượng
    const sjc = json.data.find(
      (item: { TypeName: string; BranchName: string }) =>
        item.TypeName?.includes('SJC 1L') && item.BranchName === 'Hồ Chí Minh',
    );
    const buyPerLuong = (sjc as { BuyValue?: number })?.BuyValue;
    if (!buyPerLuong || buyPerLuong <= 0) throw new Error('SJC price not found');
    const pricePerChi = buyPerLuong / 10;
    sjcGoldCache = { pricePerChi, timestamp: now };
    console.log(`[prices] SJC Gold OK: ${Math.round(pricePerChi)} VND/chỉ`);
    return { __gold__: { vnd: pricePerChi, change24h: 0 } };
  } catch (e) {
    console.error('[prices] SJC error:', (e as Error).message);
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

// ============ SERVER-SIDE PRICE CACHE (dynamic TTL, default 30s) ============
let priceCache: { data: PriceMap; timestamp: number; key: string } | null = null;
const DEFAULT_PRICE_CACHE_TTL = 30 * 1000; // 30 seconds

export async function fetchAllPricesCached(
  cryptoIds: string[],
  stockTickers: string[],
  hasGold: boolean,
  hasUsd: boolean,
  cacheTtlSec: number = 30,
): Promise<PriceMap> {
  const now = Date.now();
  const ttlMs = Number.isFinite(cacheTtlSec)
    ? Math.max(5_000, Math.min(120_000, Math.round(cacheTtlSec * 1000)))
    : DEFAULT_PRICE_CACHE_TTL;
  const cacheKey = `${cryptoIds.sort().join(',')}_${stockTickers.sort().join(',')}_${hasGold}_${hasUsd}`;

  if (priceCache && priceCache.key === cacheKey && now - priceCache.timestamp < ttlMs) {
    console.log('[prices] Serving cached prices (age:', Math.round((now - priceCache.timestamp) / 1000), 's)');
    return priceCache.data;
  }

  const prices = await fetchAllPrices(cryptoIds, stockTickers, hasGold, hasUsd);
  priceCache = { data: prices, timestamp: now, key: cacheKey };
  return prices;
}
