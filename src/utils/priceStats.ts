import dayjs, { Dayjs } from 'dayjs';
import { StockData } from './stockTable';

export interface PriceSummary {
  lastDate: string;
  lastClose: number;
  change: number | null;
  changePercent: number | null;
  periodChangePercent: number;
  high: number;
  low: number;
  averageVolume: number;
  upDays: number;
  days: number;
}

export interface DailyMove {
  row: StockData;
  up: boolean;
}

const UNITS: [number, string][] = [
  [1e9, 'B'],
  [1e6, 'M'],
  [1e3, 'K'],
];

export function formatVolume(volume: number): string {
  for (const [size, suffix] of UNITS) {
    if (volume >= size) return `${(volume / size).toFixed(1).replace(/\.0$/, '')}${suffix}`;
  }
  return String(volume);
}

const oldestFirst = (rows: StockData[]) => [...rows].sort((a, b) => a.date.localeCompare(b.date));

export function dailyMoves(rows: StockData[]): DailyMove[] {
  return oldestFirst(rows).map((row, index, sorted) => {
    const reference = index === 0 ? row.open : sorted[index - 1].close;
    return { row, up: row.close > reference };
  });
}

export function summarisePrices(rows: StockData[]): PriceSummary | null {
  if (rows.length === 0) return null;
  const sorted = oldestFirst(rows);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const previous = sorted.length > 1 ? sorted[sorted.length - 2] : null;
  const change = previous ? last.close - previous.close : null;

  return {
    lastDate: last.date,
    lastClose: last.close,
    change,
    changePercent: previous && change !== null ? (change / previous.close) * 100 : null,
    periodChangePercent: (last.close / first.close - 1) * 100,
    high: Math.max(...sorted.map(row => row.high)),
    low: Math.min(...sorted.map(row => row.low)),
    averageVolume: sorted.reduce((sum, row) => sum + row.volume, 0) / sorted.length,
    upDays: dailyMoves(sorted).filter(move => move.up).length,
    days: sorted.length,
  };
}

export function pricesToCsv(rows: StockData[]): string {
  const lines = oldestFirst(rows).map(row =>
    [row.date, row.open, row.high, row.low, row.close, row.volume].join(',')
  );
  return ['Date,Open,High,Low,Close,Volume', ...lines].join('\n');
}

export function formatDateRange(start: Dayjs, end: Dayjs): string {
  const startFormat = start.year() === end.year() ? 'D MMM' : 'D MMM YYYY';
  return `${start.format(startFormat)} – ${end.format('D MMM YYYY')}`;
}

export function formatCloseDate(date: string): string {
  return `${dayjs(date).format('ddd D MMM')} close`;
}

export function formatRowDate(date: string): string {
  const day = dayjs(date);
  return day.format(day.year() === dayjs().year() ? 'ddd D MMM' : 'ddd D MMM YYYY');
}
