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
