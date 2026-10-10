import dayjs from 'dayjs';
import { StockData } from './stockTable';
import { NewsResult } from './news';

export interface CachedAnalysis {
  eod: StockData[];
  news: NewsResult;
  fetchedAt: string;
}

const PREFIX = 'stonkstable:analysis:';
const VERSION = 'v1';

const today = (): string => dayjs().format('YYYY-MM-DD');

const cacheKey = (symbol: string, exchange: string): string =>
  `${PREFIX}${VERSION}:${symbol}.${exchange}:${today()}`;

const isCachedAnalysis = (value: unknown): value is CachedAnalysis => {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Partial<CachedAnalysis>;
  return Array.isArray(entry.eod)
    && !!entry.news && Array.isArray(entry.news.data)
    && typeof entry.fetchedAt === 'string';
};

export function readCache(symbol: string, exchange: string): CachedAnalysis | null {
  try {
    const raw = localStorage.getItem(cacheKey(symbol, exchange));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isCachedAnalysis(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function pruneCache(): void {
  try {
    const suffix = `:${today()}`;
    const stale = Object.keys(localStorage)
      .filter(key => key.startsWith(PREFIX) && !key.endsWith(suffix));
    stale.forEach(key => localStorage.removeItem(key));
  } catch {
    return;
  }
}

export function writeCache(
  symbol: string,
  exchange: string,
  eod: { data: StockData[]; error: string | null },
  news: NewsResult
): void {
  if (eod.error || eod.data.length === 0) return;

  const entry: CachedAnalysis = { eod: eod.data, news, fetchedAt: new Date().toISOString() };
  try {
    pruneCache();
    localStorage.setItem(cacheKey(symbol, exchange), JSON.stringify(entry));
  } catch {
    return;
  }
}
