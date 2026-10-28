export interface TradeLeg {
  /** price per unit, in `currency` */
  price: number;
  /** always >= 0, in `currency` */
  commission: number;
  /** 'YYYY-MM-DD' */
  date: string;
}

export interface Trade {
  id: string;
  instrument: string;
  instrumentUrl?: string;
  account?: string;
  /** units held (open) or sold (closed) */
  quantity: number;
  currency: string;
  open: TradeLeg;
  /** present when the position is closed */
  close?: TradeLeg;
  /** hand typed current price, open positions only */
  priceNow?: number;
  note?: string;
  /** ISO timestamp */
  createdAt: string;
}

export interface TradeGoal {
  amount: number;
  currency: 'EUR';
  /** 'YYYY-MM-DD'; only trades closed on or after this count */
  since?: string;
  label?: string;
}

export interface TradeSummary {
  realised: number;
  openPnl: number;
  projected: number;
  closedCount: number;
  wins: number;
  losses: number;
  /** 0 when nothing is closed yet */
  winRate: number;
  best: number | null;
  worst: number | null;
  /** currencies left out of the EUR totals */
  excludedCurrencies: string[];
}

export interface ProgressPoint {
  id: string;
  date: string;
  pnl: number;
  cumulative: number;
}

export const EURO = 'EUR';
export const MINUS = '\u2212';

const amount = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const isClosed = (trade: Trade): boolean => trade.close !== undefined;

export const isEuro = (trade: Trade): boolean => (trade.currency ?? '').trim().toUpperCase() === EURO;

const legOf = (leg: TradeLeg | undefined): TradeLeg => ({ price: 0, commission: 0, date: '', ...leg });

export function costBasis(trade: Trade): number {
  return trade.quantity * legOf(trade.open).price + legOf(trade.open).commission;
}

export function proceeds(trade: Trade): number | null {
  if (!trade.close) return null;
  return trade.quantity * trade.close.price - trade.close.commission;
}

export function realisedPnl(trade: Trade): number {
  const sold = proceeds(trade);
  return sold === null ? 0 : sold - costBasis(trade);
}

export function realisedPct(trade: Trade): number | null {
  const cost = costBasis(trade);
  if (!trade.close || cost === 0) return null;
  return realisedPnl(trade) / cost;
}

/** Value of an open position at `priceNow`, or null while no price is known. */
export function openPnl(trade: Trade): number | null {
  if (isClosed(trade) || typeof trade.priceNow !== 'number') return null;
  return trade.quantity * trade.priceNow - costBasis(trade);
}

/** Same as `openPnl` but as a fraction of the cost, or null when unknown. */
export function openPct(trade: Trade): number | null {
  const value = openPnl(trade);
  const cost = costBasis(trade);
  return value === null || cost === 0 ? null : value / cost;
}

const countsTowardGoal = (trade: Trade, goal: TradeGoal | null): boolean =>
  !goal?.since || (trade.close?.date ?? '') >= goal.since;

export function summary(trades: Trade[], goal: TradeGoal | null = null): TradeSummary {
  const eur = trades.filter(isEuro);
  const closed = eur.filter(trade => isClosed(trade) && countsTowardGoal(trade, goal));
  const open = eur.filter(trade => !isClosed(trade));

  const pnls = closed.map(realisedPnl);
  const wins = pnls.filter(pnl => pnl > 0).length;
  const losses = pnls.filter(pnl => pnl < 0).length;
  const realised = pnls.reduce((total, pnl) => total + pnl, 0);
  const openTotal = open.reduce((total, trade) => total + (openPnl(trade) ?? 0), 0);

  return {
    realised,
    openPnl: openTotal,
    projected: realised + openTotal,
    closedCount: closed.length,
    wins,
    losses,
    winRate: closed.length === 0 ? 0 : wins / closed.length,
    best: pnls.length === 0 ? null : Math.max(...pnls),
    worst: pnls.length === 0 ? null : Math.min(...pnls),
    excludedCurrencies: [...new Set(trades.filter(trade => !isEuro(trade)).map(trade => trade.currency))].sort(),
  };
}

const byCloseDate = (a: Trade, b: Trade) => (a.close?.date ?? '').localeCompare(b.close?.date ?? '');

/** Cumulative realised EUR by close date, oldest first. */
export function progressSeries(trades: Trade[], goal: TradeGoal | null = null): ProgressPoint[] {
  const closed = trades.filter(trade => isEuro(trade) && isClosed(trade) && countsTowardGoal(trade, goal)).sort(byCloseDate);

  let cumulative = 0;
  return closed.map(trade => {
    const pnl = realisedPnl(trade);
    cumulative += pnl;
    return { id: trade.id, date: trade.close!.date, pnl, cumulative };
  });
}

export function newTradeId(): string {
  const webCrypto = typeof globalThis.crypto !== 'undefined' ? globalThis.crypto : undefined;
  if (webCrypto && typeof webCrypto.randomUUID === 'function') return webCrypto.randomUUID();
  return `trade-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function toTrade(input: Omit<Trade, 'id' | 'createdAt'>): Trade {
  return { ...input, id: newTradeId(), createdAt: new Date().toISOString() };
}

/**
 * Closes `quantity` units of `trade` at `leg`, splitting the opening commission
 * pro rata. The closed part keeps the original id; the remainder gets a new one.
 */
export function splitForClose(trade: Trade, quantity: number, leg: TradeLeg): [Trade, Trade | null] {
  const closedQuantity = Math.min(Math.max(quantity, 0), trade.quantity);
  const share = trade.quantity > 0 ? closedQuantity / trade.quantity : 0;
  const commission = trade.open.commission * share;

  const closed: Trade = {
    ...trade,
    quantity: closedQuantity,
    open: { ...trade.open, commission },
    close: leg,
    priceNow: undefined,
  };

  const remaining = trade.quantity - closedQuantity;
  if (remaining <= 0) return [closed, null];

  const open: Trade = {
    ...trade,
    id: newTradeId(),
    quantity: remaining,
    open: { ...trade.open, commission: trade.open.commission - commission },
    close: undefined,
  };

  return [closed, open];
}

const round2 = (value: number): number => {
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
  return rounded === 0 ? 0 : rounded;
};

/** EUR is shown as €, everything else as its three letter code. */
const symbolOf = (currency: string): string => {
  const code = (currency || EURO).trim().toUpperCase();
  return code === EURO ? '€' : code;
};

export function formatMoney(value: number, currency: string = EURO): string {
  const rounded = round2(value);
  const sign = rounded < 0 ? MINUS : '';
  return `${sign}${amount.format(Math.abs(rounded))} ${symbolOf(currency)}`;
}

export function formatSignedMoney(value: number, currency: string = EURO): string {
  const rounded = round2(value);
  const sign = rounded > 0 ? '+' : rounded < 0 ? MINUS : '';
  return `${sign}${amount.format(Math.abs(rounded))} ${symbolOf(currency)}`;
}

export function formatPercent(fraction: number | null): string {
  if (fraction === null) return '\u2014';
  const percent = round2(fraction * 10000) / 100;
  const sign = percent > 0 ? '+' : percent < 0 ? MINUS : '';
  return `${sign}${Math.abs(percent).toFixed(1)}%`;
}

/** 'YYYY-MM-DD' for today, in the browser's own timezone. */
export function todayIso(): string {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

export function daysBetween(from: string, to: string): number {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return Math.round((end - start) / 86_400_000);
}