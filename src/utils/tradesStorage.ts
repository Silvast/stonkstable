import type { Trade, TradeGoal, TradeLeg } from './trades';

export const TRADES_KEY = 'stonkstable:trades:v1';
export const TRADE_GOAL_KEY = 'stonkstable:tradeGoal:v1';

const VERSION = 1;

const leg = (value: unknown): TradeLeg | null => {
  if (!value || typeof value !== 'object') return null;
  const { price, commission, date } = value as Record<string, unknown>;
  if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) return null;
  return {
    price,
    commission: typeof commission === 'number' && Number.isFinite(commission) ? Math.max(0, commission) : 0,
    date: typeof date === 'string' ? date : '',
  };
};

const text = (value: unknown): string | undefined => (typeof value === 'string' && value.trim() !== '' ? value : undefined);

const toStoredTrade = (value: unknown): Trade | null => {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const open = leg(raw.open);
  const close = leg(raw.close);
  if (!open) return null;

  const quantity = typeof raw.quantity === 'number' ? raw.quantity : Number.NaN;
  if (!Number.isFinite(quantity) || quantity <= 0) return null;

  return {
    id: typeof raw.id === 'string' && raw.id !== '' ? raw.id : `trade-${quantity}-${open.date}`,
    instrument: typeof raw.instrument === 'string' ? raw.instrument : '',
    quantity,
    currency: typeof raw.currency === 'string' && raw.currency !== '' ? raw.currency : 'EUR',
    open,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString(),
    ...(close ? { close } : {}),
    ...(text(raw.instrumentUrl) ? { instrumentUrl: raw.instrumentUrl as string } : {}),
    ...(text(raw.account) ? { account: raw.account as string } : {}),
    ...(typeof raw.priceNow === 'number' && Number.isFinite(raw.priceNow) && raw.priceNow > 0
      ? { priceNow: raw.priceNow }
      : {}),
    ...(text(raw.note) ? { note: raw.note as string } : {}),
  };
};

const toStoredGoal = (value: unknown): TradeGoal | null => {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.amount !== 'number' || !Number.isFinite(raw.amount) || raw.amount <= 0) return null;

  const since = text(raw.since);
  const label = text(raw.label);

  return {
    amount: raw.amount,
    currency: 'EUR',
    ...(since ? { since } : {}),
    ...(label ? { label } : {}),
  };
};

interface Stored {
    version?: unknown;
    items?: unknown;
    goal?: unknown;
}

function readStore(key: string): Stored | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Stored | null;
    return parsed?.version === VERSION ? parsed : null;
  } catch {
    return null;
  }
}

function store(key: string, body: Stored): void {
  try {
    localStorage.setItem(key, JSON.stringify({ version: VERSION, ...body }));
  } catch (err) {
    console.warn('Could not save trades:', err);
  }
}

export function loadTrades(): Trade[] {
  const stored = readStore(TRADES_KEY);
  if (!stored || !Array.isArray(stored.items)) return [];
  return stored.items.map(toStoredTrade).filter((trade): trade is Trade => trade !== null);
}

export function saveTrades(trades: Trade[]): void {
  store(TRADES_KEY, { items: trades });
}

export function clearTrades(): void {
  try {
    localStorage.removeItem(TRADES_KEY);
  } catch (err) {
    console.warn('Could not clear trades:', err);
  }
}

export function loadTradeGoal(): TradeGoal | null {
  return toStoredGoal(readStore(TRADE_GOAL_KEY)?.goal);
}

export function saveTradeGoal(goal: TradeGoal | null): void {
  store(TRADE_GOAL_KEY, { goal });
}