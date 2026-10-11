import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { clearDeviceApiKey, loadDeviceApiKey, saveDeviceApiKey } from '../utils/apiKeyStorage';
import { loadCloudApiKey, saveCloudApiKey } from '../utils/settingsCloud';

import heStocks from '../assets/he.json';
import usStocks from '../assets/us.json';
import lseStocks from '../assets/lse.json';

export interface StockEntry {
  Code: string;
  Name: string;
  Country: string;
  Exchange: string;
  Currency: string;
  Type: string;
  Isin: string | null;
}

export type ExchangeCode = 'US' | 'HE' | 'LSE';

interface StockSelection {
  symbol: string;
  exchange: ExchangeCode;
  apiKey: string;
  selectedStock: StockEntry | null;
  stockOptions: StockEntry[];
  setSymbol: (code: string) => void;
  setExchange: (code: ExchangeCode) => void;
  setApiKey: (key: string) => void;
  rememberOnDevice: boolean;
  setRememberOnDevice: (remember: boolean) => void;
  apiKeySaveError: string | null;
  setSelectedStock: (entry: StockEntry | null) => void;
}

const STOCK_LISTS: Record<ExchangeCode, StockEntry[]> = {
  US: usStocks as StockEntry[],
  HE: heStocks as StockEntry[],
  LSE: lseStocks as StockEntry[],
};

type KeySource = 'none' | 'link' | 'device' | 'account' | 'typed';

const SAVE_DELAY_MS = 1000;
const SAVE_ERROR = "Couldn't save the key to your account";

const initialApiKey = (): { key: string; source: KeySource } => {
  const fromLink = new URLSearchParams(window.location.search).get('apikey');
  if (fromLink) return { key: fromLink, source: 'link' };
  const fromDevice = loadDeviceApiKey();
  if (fromDevice) return { key: fromDevice, source: 'device' };
  return { key: '', source: 'none' };
};

const StockSelectionContext = createContext<StockSelection | null>(null);

export const StockSelectionProvider = ({ children }: { children: React.ReactNode }) => {
  const [symbol, setSymbol] = useState<string>('AAPL');
  const [exchange, setExchange] = useState<ExchangeCode>('US');
  const { status } = useAuth();
  const signedIn = status === 'signedIn';
  const [initialKey] = useState(initialApiKey);
  const [apiKey, setApiKeyState] = useState<string>(initialKey.key);
  const [rememberOnDevice, setRememberState] = useState(() => loadDeviceApiKey() !== null);
  const [apiKeySaveError, setApiKeySaveError] = useState<string | null>(null);
  const apiKeyRef = useRef(initialKey.key);
  const keySource = useRef<KeySource>(initialKey.source);
  const rememberRef = useRef(rememberOnDevice);
  const signedInRef = useRef(signedIn);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [stockOptions, setStockOptions] = useState<StockEntry[]>(STOCK_LISTS.US);
  const [selectedStock, setSelectedStockState] = useState<StockEntry | null>(() => {
    const defaultStock = STOCK_LISTS.US.find(stock => stock.Code === 'AAPL');
    return defaultStock || null;
  });

  const applyApiKey = useCallback((key: string, source: KeySource) => {
    keySource.current = source;
    apiKeyRef.current = key;
    setApiKeyState(key);
  }, []);

  useEffect(() => {
    signedInRef.current = signedIn;

    if (!signedIn) {
      clearTimeout(saveTimer.current);
      if (keySource.current === 'account') applyApiKey('', 'none');
      return;
    }

    if (keySource.current !== 'none') return;
    let active = true;
    loadCloudApiKey()
      .then(key => {
        if (active && key && keySource.current === 'none') applyApiKey(key, 'account');
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [signedIn, applyApiKey]);

  useEffect(() => () => clearTimeout(saveTimer.current), []);

  const setApiKey = useCallback((key: string) => {
    applyApiKey(key, 'typed');
    setApiKeySaveError(null);

    if (rememberRef.current) {
      if (key) saveDeviceApiKey(key);
      else clearDeviceApiKey();
    }

    if (signedInRef.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        saveCloudApiKey(key).catch(() => setApiKeySaveError(SAVE_ERROR));
      }, SAVE_DELAY_MS);
    }
  }, [applyApiKey]);

  const setRememberOnDevice = useCallback((remember: boolean) => {
    rememberRef.current = remember;
    setRememberState(remember);
    if (remember && apiKeyRef.current) saveDeviceApiKey(apiKeyRef.current);
    if (!remember) clearDeviceApiKey();
  }, []);

  useEffect(() => {
    const stockList = STOCK_LISTS[exchange];
    setStockOptions(stockList);

    const found = stockList.find(stock => stock.Code === symbol);
    setSelectedStockState(found || null);
  }, [exchange, symbol]);

  const value = useMemo<StockSelection>(() => ({
    symbol,
    exchange,
    apiKey,
    selectedStock,
    stockOptions,
    setSymbol,
    setExchange,
    setApiKey,
    rememberOnDevice,
    setRememberOnDevice,
    apiKeySaveError,
    setSelectedStock: (entry: StockEntry | null) => {
      setSelectedStockState(entry);
      if (entry) {
        setSymbol(entry.Code);
      }
    },
  }), [symbol, exchange, apiKey, selectedStock, stockOptions, setApiKey, rememberOnDevice, setRememberOnDevice, apiKeySaveError]);

  return (
    <StockSelectionContext.Provider value={value}>
      {children}
    </StockSelectionContext.Provider>
  );
};

export const useStockSelection = (): StockSelection => {
  const context = useContext(StockSelectionContext);
  if (!context) {
    throw new Error('useStockSelection must be used within a StockSelectionProvider');
  }
  return context;
};
