import type { ExchangeCode, StockEntry } from '../context/StockSelectionContext';

export interface FavouriteStock {
  code: string;
  exchange: ExchangeCode;
  name: string;
  currency: string;
  addedAt: string;
}

export const FAVOURITES_KEY = 'stonkstable:favourites:v1';
const VERSION = 1;

export const favouriteId = (code: string, exchange: string): string => `${code}.${exchange}`;

export function toFavourite(entry: StockEntry, exchange: ExchangeCode): FavouriteStock {
  return {
    code: entry.Code,
    exchange,
    name: entry.Name,
    currency: entry.Currency,
    addedAt: new Date().toISOString(),
  };
}

const EXCHANGES: readonly string[] = ['US', 'HE', 'LSE'] satisfies ExchangeCode[];

const isFavourite = (item: unknown): item is FavouriteStock => {
  if (!item || typeof item !== 'object') return false;
  const { code, exchange } = item as Record<string, unknown>;
  return typeof code === 'string' && code !== '' && typeof exchange === 'string' && EXCHANGES.includes(exchange);
};

export function loadFavourites(): FavouriteStock[] {
  try {
    const raw = localStorage.getItem(FAVOURITES_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as { version?: unknown; items?: unknown };
    if (parsed?.version !== VERSION || !Array.isArray(parsed.items)) return [];

    const seen = new Set<string>();
    return parsed.items.filter(isFavourite).filter(item => {
      const id = favouriteId(item.code, item.exchange);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  } catch {
    return [];
  }
}

export function saveFavourites(list: FavouriteStock[]): void {
  try {
    localStorage.setItem(FAVOURITES_KEY, JSON.stringify({ version: VERSION, items: list }));
  } catch (err) {
    console.warn('Could not save favourites:', err);
  }
}
