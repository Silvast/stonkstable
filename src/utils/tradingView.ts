import type { ExchangeCode } from '../context/StockSelectionContext';

const TV_PREFIXES: Record<ExchangeCode, string> = {
  US: '',
  HE: 'OMXHEX:',
  LSE: 'LSE:',
};

export function tradingViewUrl(symbol: string, exchange: ExchangeCode): string {
  const tvSymbol = `${TV_PREFIXES[exchange]}${symbol}`;
  return `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(tvSymbol)}`;
}
