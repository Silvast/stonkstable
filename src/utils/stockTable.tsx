import React from 'react';
import dayjs from 'dayjs';

export type Order = 'asc' | 'desc';

export interface Column {
  id: 'date' | 'open' | 'close' | 'high' | 'low' | 'volume' | 'changePercent';
  label: string;
  numeric: boolean;
  calculate?: (row: StockData) => number;
  responsiveVisibility?: {
    xs?: boolean;
    sm?: boolean;
    md?: boolean;
    lg?: boolean;
    xl?: boolean;
  };
}

export interface StockData {
  date: string;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
  [key: string]: string | number; 
}

export function calculatePercentChange(row: StockData): number {
  return 100 * (row.close / row.open - 1);
}

export function descendingComparator<T>(a: T, b: T, orderBy: keyof T) {
  if (orderBy === 'date') {
    return (b[orderBy] as string).localeCompare(a[orderBy] as string);
  }
 
  if (orderBy === 'changePercent') {
    const aValue = calculatePercentChange(a as unknown as StockData);
    const bValue = calculatePercentChange(b as unknown as StockData);
    if (bValue < aValue) return -1;
    if (bValue > aValue) return 1;
    return 0;
  }
  if (b[orderBy] < a[orderBy]) {
    return -1;
  }
  if (b[orderBy] > a[orderBy]) {
    return 1;
  }
  return 0;
}

export function getComparator<Key extends keyof any>(
  order: Order,
  orderBy: Key,
): (
  a: { [key in Key]: number | string },
  b: { [key in Key]: number | string },
) => number {
  return order === 'desc'
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
}

export function stableSort<T>(array: readonly T[], comparator: (a: T, b: T) => number) {
  const stabilizedThis = array.map((el, index) => [el, index] as [T, number]);
  stabilizedThis.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) {
      return order;
    }
    return a[1] - b[1];
  });
  return stabilizedThis.map((el) => el[0]);
}

export const COLUMNS: Column[] = [
  { 
    id: 'date', 
    label: 'Date', 
    numeric: false, 
    responsiveVisibility: { xs: true, sm: true, md: true, lg: true, xl: true } 
  },
  { 
    id: 'open', 
    label: 'Open', 
    numeric: true,
    responsiveVisibility: { xs: true, sm: true, md: true, lg: true, xl: true } 
  },
  { 
    id: 'close', 
    label: 'Close', 
    numeric: true,
    responsiveVisibility: { xs: true, sm: true, md: true, lg: true, xl: true } 
  },
  { 
    id: 'high', 
    label: 'High', 
    numeric: true,
    responsiveVisibility: { xs: false, sm: false, md: true, lg: true, xl: true } 
  },
  { 
    id: 'low', 
    label: 'Low', 
    numeric: true,
    responsiveVisibility: { xs: false, sm: false, md: true, lg: true, xl: true } 
  },
  { 
    id: 'changePercent', 
    label: 'Change %', 
    numeric: true,
    calculate: calculatePercentChange,
    responsiveVisibility: { xs: true, sm: true, md: true, lg: true, xl: true } 
  },
  { 
    id: 'volume', 
    label: 'Volume', 
    numeric: true,
    responsiveVisibility: { xs: false, sm: false, md: true, lg: true, xl: true } 
  },
];

export const fetchStockDataFromApi = async (
  symbol: string,
  stockExchange: string,
  startDate: dayjs.Dayjs | null,
  endDate: dayjs.Dayjs | null,
  apiKey: string
): Promise<{ data: StockData[], error: string | null }> => {
  if (!startDate || !endDate) {
    return { data: [], error: 'Please select a valid date range' };
  }

  try {
    const formattedFromDate = startDate.format('YYYY-MM-DD');
    const formattedToDate = endDate.format('YYYY-MM-DD');
    
    const tokenValue = apiKey.trim() || 'demo';
    
    const fullSymbol = `${symbol}.${stockExchange}`;
    
    const apiUrl = `https://eodhd.com/api/eod/${fullSymbol}?from=${formattedFromDate}&to=${formattedToDate}&period=d&api_token=${tokenValue}&fmt=json`;
    
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const apiData = await response.json();
    
    if (Array.isArray(apiData) && apiData.length === 0) {
      return { data: [], error: 'No data available for the selected parameters' };
    } else {
      return { data: apiData, error: null };
    }
  } catch (err) {
    console.error('Error fetching stock data:', err);
    return { data: [], error: 'Failed to load stock data. Please try again later.' };
  }
};

export const renderCellContent = (row: StockData, column: Column): React.ReactNode => {
  if (column.id === 'changePercent' && column.calculate) {
    const value = column.calculate(row);
    const isPositive = value > 0;
    const isZero = value === 0;
    
    return (
      <span style={{ color: isPositive ? 'green' : isZero ? 'inherit' : 'red' }}>
        {isPositive ? '+' : ''}{value.toFixed(2)}%
      </span>
    );
  }
  
  if (column.id === 'volume') {
    return row[column.id].toLocaleString();
  }

  if (column.numeric && typeof row[column.id] === 'number') {
    return Number(row[column.id]).toFixed(2);
  }

  return row[column.id];
}; 