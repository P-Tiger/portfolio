export type DisplayCurrency = 'VND' | 'USD';

const DEFAULT_USD_TO_VND_RATE = 26000;

function normalizeUsdToVndRate(rate?: number): number {
  if (!rate || !Number.isFinite(rate) || rate <= 0) return DEFAULT_USD_TO_VND_RATE;
  return rate;
}

export function formatMoney(value: number, currency: DisplayCurrency, usdToVndRate?: number): string {
  if (currency === 'USD') {
    const rate = normalizeUsdToVndRate(usdToVndRate);
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value / rate);
  }

  return new Intl.NumberFormat('vi-VN').format(Math.round(value));
}

export function getCurrencyLabel(currency: DisplayCurrency): string {
  return currency;
}

export function formatVND(value: number): string {
  return new Intl.NumberFormat('vi-VN').format(Math.round(value));
}

export function formatVNDFull(value: number): string {
  return new Intl.NumberFormat('vi-VN').format(Math.round(value));
}

export function formatQuantity(value: number): string {
  if (Number.isInteger(value)) return value.toLocaleString('vi-VN');
  return value.toLocaleString('vi-VN', { maximumFractionDigits: 6 });
}

export function formatPercent(value: number): string {
  return (value >= 0 ? '+' : '') + value.toFixed(2) + '%';
}
