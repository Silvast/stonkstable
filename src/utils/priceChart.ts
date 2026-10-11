import dayjs from 'dayjs';
import { StockData } from './stockTable';
import { dailyMoves } from './priceStats';

export const CHART = {
  width: 960,
  height: 260,
  left: 56,
  right: 16,
  priceTop: 12,
  priceBottom: 190,
  volumeBase: 242,
  volumeHeight: 40,
  maxBarWidth: 24,
  gridLines: 5,
} as const;

export interface PriceChart {
  line: string;
  grid: { y: number; label: string }[];
  bars: { x: number; y: number; width: number; height: number; up: boolean }[];
  dates: { x: number; label: string }[];
  description: string;
}

const STEPS = [1, 2, 2.5, 5, 10];

const niceScale = (min: number, max: number) => {
  const intervals = CHART.gridLines - 1;
  const span = max - min || Math.abs(max) * 0.02 || 1;
  const magnitude = 10 ** Math.floor(Math.log10(span / intervals));
  for (const factor of STEPS) {
    const step = factor * magnitude;
    const low = Math.floor(min / step) * step;
    if (low + step * intervals >= max) return { low, step };
  }
  return { low: min, step: span / intervals };
};

const decimalsFor = (step: number) => (step >= 10 ? 0 : 2);

export function buildPriceChart(rows: StockData[]): PriceChart {
  const moves = dailyMoves(rows);
  const closes = moves.map(move => move.row.close);
  const { low, step } = niceScale(Math.min(...closes), Math.max(...closes));
  const high = low + step * (CHART.gridLines - 1);

  const plotWidth = CHART.width - CHART.left - CHART.right;
  const xStep = moves.length > 1 ? plotWidth / (moves.length - 1) : 0;
  const xAt = (index: number) => (moves.length > 1 ? CHART.left + index * xStep : CHART.left + plotWidth / 2);
  const yAt = (price: number) =>
    CHART.priceTop + ((high - price) / (high - low)) * (CHART.priceBottom - CHART.priceTop);

  const line = moves
    .map((move, index) => `${index ? 'L' : 'M'}${xAt(index).toFixed(1)} ${yAt(move.row.close).toFixed(1)}`)
    .join(' ');

  const grid = Array.from({ length: CHART.gridLines }, (_, index) => {
    const price = low + step * index;
    return { y: yAt(price), label: price.toFixed(decimalsFor(step)) };
  });

  const maxVolume = Math.max(...moves.map(move => move.row.volume));
  const barWidth = Math.min(CHART.maxBarWidth, xStep ? xStep * 0.6 : CHART.maxBarWidth);
  const bars = moves.map((move, index) => {
    const height = maxVolume > 0 ? (move.row.volume / maxVolume) * CHART.volumeHeight : 0;
    return { x: xAt(index) - barWidth / 2, y: CHART.volumeBase - height, width: barWidth, height, up: move.up };
  });

  const labelIndexes = [...new Set([0, 0.25, 0.5, 0.75, 1].map(at => Math.round(at * (moves.length - 1))))];
  const dates = labelIndexes.map(index => ({ x: xAt(index), label: dayjs(moves[index].row.date).format('D MMM') }));

  const description = `Closing price from ${closes[0].toFixed(2)} to ${closes[closes.length - 1].toFixed(2)} over ${moves.length} trading days, with daily volume bars`;

  return { line, grid, bars, dates, description };
}
