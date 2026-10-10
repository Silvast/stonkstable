import { StockData } from './stockTable';

export type Bar = Pick<StockData, 'date' | 'open' | 'high' | 'low' | 'close' | 'volume'>;

const mean = (values: number[]): number =>
  values.reduce((sum, value) => sum + value, 0) / values.length;

export function sma(values: number[], period: number): number | null {
  if (period <= 0 || values.length < period) return null;
  return mean(values.slice(-period));
}

const rsiFromAverages = (avgGain: number, avgLoss: number): number => {
  if (avgLoss === 0) return avgGain === 0 ? 50 : 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
};

export function rsi(closes: number[], period = 14): { value: number; previous: number } | null {
  if (period <= 0 || closes.length < period + 2) return null;

  const changes = closes.slice(1).map((close, i) => close - closes[i]);
  let avgGain = mean(changes.slice(0, period).map(change => Math.max(change, 0)));
  let avgLoss = mean(changes.slice(0, period).map(change => Math.max(-change, 0)));

  let previous = rsiFromAverages(avgGain, avgLoss);
  let value = previous;
  for (const change of changes.slice(period)) {
    previous = value;
    avgGain = (avgGain * (period - 1) + Math.max(change, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-change, 0)) / period;
    value = rsiFromAverages(avgGain, avgLoss);
  }

  return { value, previous };
}

export function trueRange(bar: Bar, prevClose: number): number {
  return Math.max(
    bar.high - bar.low,
    Math.abs(bar.high - prevClose),
    Math.abs(bar.low - prevClose)
  );
}

export function atr(bars: Bar[], period = 14): { value: number; percent: number } | null {
  if (period <= 0 || bars.length < period + 1) return null;

  const ranges = bars.slice(1).map((bar, i) => trueRange(bar, bars[i].close));
  let value = mean(ranges.slice(0, period));
  for (const range of ranges.slice(period)) {
    value = (value * (period - 1) + range) / period;
  }

  const lastClose = bars[bars.length - 1].close;
  if (lastClose === 0) return null;
  return { value, percent: value / lastClose * 100 };
}

export function pivots(bar: Bar): { p: number; r1: number; s1: number } {
  const p = (bar.high + bar.low + bar.close) / 3;
  return { p, r1: 2 * p - bar.low, s1: 2 * p - bar.high };
}

export function streak(closes: number[]): number {
  if (closes.length < 2) return 0;

  const direction = Math.sign(closes[closes.length - 1] - closes[closes.length - 2]);
  if (direction === 0) return 0;

  let count = 0;
  for (let i = closes.length - 1; i > 0; i--) {
    if (Math.sign(closes[i] - closes[i - 1]) !== direction) break;
    count++;
  }
  return count * direction;
}

export function relativeVolume(volumes: number[], period = 20): number | null {
  if (period <= 0 || volumes.length < period + 1) return null;

  const average = mean(volumes.slice(-period - 1, -1));
  if (average === 0) return null;
  return volumes[volumes.length - 1] / average;
}

export function rangeHighLow(bars: Bar[], period = 20): { high: number; low: number } | null {
  if (period <= 0 || bars.length < period) return null;

  const recent = bars.slice(-period);
  return {
    high: Math.max(...recent.map(bar => bar.high)),
    low: Math.min(...recent.map(bar => bar.low)),
  };
}

export function gapPercent(bars: Bar[]): number | null {
  if (bars.length < 2) return null;

  const prevClose = bars[bars.length - 2].close;
  if (prevClose === 0) return null;
  return (bars[bars.length - 1].open / prevClose - 1) * 100;
}
