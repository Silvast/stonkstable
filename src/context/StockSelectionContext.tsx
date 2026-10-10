import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

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
  setSelectedStock: (entry: StockEntry | null) => void;
}

const STOCK_LISTS: Record<ExchangeCode, StockEntry[]> = {
  US: usStocks as StockEntry[],
  HE: heStocks as StockEntry[],
  LSE: lseStocks as StockEntry[],
};

const StockSelectionContext = createContext<StockSelection | null>(null);

export const StockSelectionProvider = ({ children }: { children: React.ReactNode }) => {
  const [symbol, setSymbol] = useState<string>('AAPL');
  const [exchange, setExchange] = useState<ExchangeCode>('US');
  const [apiKey, setApiKey] = useState<string>('');
  const [stockOptions, setStockOptions] = useState<StockEntry[]>(STOCK_LISTS.US);
  const [selectedStock, setSelectedStockState] = useState<StockEntry | null>(() => {
    const defaultStock = STOCK_LISTS.US.find(stock => stock.Code === 'AAPL');
    return defaultStock || null;
  });

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const apiKeyParam = urlParams.get('apikey');

    if (apiKeyParam) {
      setApiKey(apiKeyParam);
    }
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
    setSelectedStock: (entry: StockEntry | null) => {
      setSelectedStockState(entry);
      if (entry) {
        setSymbol(entry.Code);
      }
    },
  }), [symbol, exchange, apiKey, selectedStock, stockOptions]);

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
