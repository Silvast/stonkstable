import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ParsedOrder } from '../utils/nordnetParser';
import { Trade, TradeGoal, TradeLeg, splitForClose, toTrade } from '../utils/trades';
import {
  TRADES_KEY,
  TRADE_GOAL_KEY,
  loadTradeGoal,
  loadTrades,
  saveTradeGoal,
  saveTrades,
} from '../utils/tradesStorage';

interface TradesValue {
  trades: Trade[];
  /** open positions, newest opening first */
  open: Trade[];
  /** closed trades, newest close first */
  closed: Trade[];
  goal: TradeGoal | null;
  addTrade: (trade: Omit<Trade, 'id' | 'createdAt'>) => Trade;
  closeTrade: (id: string, leg: TradeLeg, quantity?: number) => void;
  reopenTrade: (id: string) => void;
  updateTrade: (id: string, patch: Partial<Trade>) => void;
  removeTrade: (id: string) => void;
  restoreTrade: (trade: Trade) => void;
  setGoal: (goal: TradeGoal | null) => void;
  /** an open position this sell order could close, oldest first */
  findOpenMatch: (order: ParsedOrder) => Trade | null;
}

const byOpenedDescending = (a: Trade, b: Trade) => b.open.date.localeCompare(a.open.date);
const byClosedDescending = (a: Trade, b: Trade) => (b.close?.date ?? '').localeCompare(a.close?.date ?? '');

const sameInstrument = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
const sameAccount = (a?: string, b?: string) => !a || !b || a.trim() === b.trim();

const TradesContext = createContext<TradesValue | null>(null);

export const TradesProvider = ({ children }: { children: React.ReactNode }) => {
  const [trades, setTrades] = useState<Trade[]>(loadTrades);
  const [goal, setGoalState] = useState<TradeGoal | null>(loadTradeGoal);

  const current = useRef(trades);
  const lastPersisted = useRef(trades);
  const lastPersistedGoal = useRef<TradeGoal | null>(goal);

  const commit = useCallback((next: Trade[]) => {
    current.current = next;
    setTrades(next);
  }, []);

  useEffect(() => {
    if (trades === lastPersisted.current) return;
    lastPersisted.current = trades;
    saveTrades(trades);
  }, [trades]);

  useEffect(() => {
    if (goal === lastPersistedGoal.current) return;
    lastPersistedGoal.current = goal;
    saveTradeGoal(goal);
  }, [goal]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === TRADES_KEY) {
        const loaded = loadTrades();
        lastPersisted.current = loaded;
        commit(loaded);
        return;
      }
      if (event.key === TRADE_GOAL_KEY) {
        setGoalState(loadTradeGoal());
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [commit]);

  const addTrade = useCallback((input: Omit<Trade, 'id' | 'createdAt'>) => {
    const trade = toTrade(input);
    commit([...current.current, trade]);
    return trade;
  }, [commit]);

  const closeTrade = useCallback((id: string, leg: TradeLeg, quantity?: number) => {
    const trade = current.current.find(existing => existing.id === id);
    if (!trade) return;

    const [closed, remaining] = splitForClose(trade, quantity ?? trade.quantity, leg);
    commit([...current.current.filter(existing => existing.id !== id), ...(remaining ? [remaining] : []), closed]);
  }, [commit]);

  const reopenTrade = useCallback((id: string) => {
    const trade = current.current.find(existing => existing.id === id);
    if (!trade?.close) return;
    commit(current.current.map(existing => (existing.id === id ? { ...existing, close: undefined } : existing)));
  }, [commit]);

  const updateTrade = useCallback((id: string, patch: Partial<Trade>) => {
    commit(current.current.map(existing => (existing.id === id ? { ...existing, ...patch, id: existing.id } : existing)));
  }, [commit]);

  const removeTrade = useCallback((id: string) => {
    commit(current.current.filter(existing => existing.id !== id));
  }, [commit]);

  const restoreTrade = useCallback((trade: Trade) => {
    if (current.current.some(existing => existing.id === trade.id)) return;
    commit([...current.current, trade]);
  }, [commit]);

  const setGoal = useCallback((next: TradeGoal | null) => setGoalState(next), []);

  const open = useMemo(
    () => trades.filter(trade => !trade.close).sort(byOpenedDescending),
    [trades]
  );

  const closed = useMemo(
    () => trades.filter(trade => trade.close).sort(byClosedDescending),
    [trades]
  );

  const findOpenMatch = useCallback((order: ParsedOrder) => {
    const matches = open.filter(trade =>
      sameInstrument(trade.instrument, order.instrument) &&
      sameAccount(trade.account, order.account) &&
      trade.quantity >= order.quantity
    );
    return matches[matches.length - 1] ?? null;
  }, [open]);

  const value = useMemo<TradesValue>(() => ({
    trades,
    open,
    closed,
    goal,
    addTrade,
    closeTrade,
    reopenTrade,
    updateTrade,
    removeTrade,
    restoreTrade,
    setGoal,
    findOpenMatch,
  }), [trades, open, closed, goal, addTrade, closeTrade, reopenTrade, updateTrade, removeTrade, restoreTrade, setGoal, findOpenMatch]);

  return (
    <TradesContext.Provider value={value}>
      {children}
    </TradesContext.Provider>
  );
};

export const useTrades = (): TradesValue => {
  const context = useContext(TradesContext);
  if (!context) {
    throw new Error('useTrades must be used within a TradesProvider');
  }
  return context;
};