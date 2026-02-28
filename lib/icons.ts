import { Category } from './types';

// Icon mappings for specific crypto symbols
const CRYPTO_ICONS: Record<string, string> = {
  bitcoin: '₿',
  btc: '₿',
  ethereum: 'Ξ',
  eth: 'Ξ',
  solana: '◎',
  sol: '◎',
  binancecoin: 'Ⓑ',
  bnb: 'Ⓑ',
  cardano: '₳',
  ada: '₳',
  ripple: 'ꭧ',
  xrp: 'ꭧ',
  dogecoin: 'Ð',
  doge: 'Ð',
  polkadot: '●',
  dot: '●',
};

// Generic icons by category
const CATEGORY_ICONS: Record<Category, string> = {
  crypto: '🪙',
  stock: '📈',
  gold: '🥇',
  usd: '💵',
  cash: '💰',
};

/**
 * Get icon for an asset based on category and symbol
 */
export function getAssetIcon(category: Category, symbol?: string): string {
  // Try to get specific crypto icon
  if (category === 'crypto' && symbol) {
    const cryptoId = symbol.toLowerCase();
    if (CRYPTO_ICONS[cryptoId]) {
      return CRYPTO_ICONS[cryptoId];
    }
  }

  // Fall back to category icon
  return CATEGORY_ICONS[category] || '📦';
}
