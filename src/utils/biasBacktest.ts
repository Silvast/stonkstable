import { AnalysisResult, MIN_BARS, buildAnalysis } from './analysis';
import { NewsResult } from './news';
import { StockData } from './stockTable';

export const DEFAULT_HORIZONS = [1, 3, 5];
export const MIN_SIGNALS = 30;

type BiasLabel = AnalysisResult['bias']['label'];

const LABELS: BiasLabel[] = ['Leaning long', 'Leaning short', 'Stand aside'];
const NO_NEWS: NewsResult = { data: [], error: null };

export interface HorizonStat {
  samples: number;
  hitRate: number | null;
  avgReturnPercent: number | null;
}

export interface BaselineStat {
  samples: number;
  upRate: number | null;
  downRate: number | null;
  avgReturnPercent: number | null;
}

export interface BiasBacktestRow {
  label: BiasLabel;
  signals: number;
  byHorizon: Record<number, HorizonStat>;
}

export interface BiasBacktest {
  days: number;
  horizons: number[];
  rows: BiasBacktestRow[];
  baseline: Record<number, BaselineStat>;
}

interface DayOutcome {
  label: BiasLabel;
  forward: (number | null)[];
}

const average = (values: number[]): number | null =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;

const share = (count: number, total: number): number | null =>
  total ? count / total : null;

const isDirectional = (label: BiasLabel): boolean => label !== 'Stand aside';

const isHit = (label: BiasLabel, returnPercent: number): boolean =>
  label === 'Leaning long' ? returnPercent > 0 : returnPercent < 0;

/**
 * Walks through history and, for each day with enough bars, asks what buildAnalysis
 * would have said using only the bars up to that day (news excluded: it has no history).
 * Then records the close-to-close return over each horizon (in trading days) from that day.
 */
export function backtestBias(bars: StockData[], horizons: number[] = DEFAULT_HORIZONS): BiasBacktest {
  const sorted = [...bars].sort((a, b) => a.date.localeCompare(b.date));
  const closes = sorted.map(bar => bar.close);

  const outcomes: DayOutcome[] = [];
  for (let i = MIN_BARS - 1; i < sorted.length; i++) {
    const label = buildAnalysis(sorted.slice(0, i + 1), NO_NEWS).bias.label;
    const forward = horizons.map(horizon => {
      const future = closes[i + horizon];
      if (future === undefined || !closes[i]) return null;
      return (future / closes[i] - 1) * 100;
    });
    outcomes.push({ label, forward });
  }

  const rows: BiasBacktestRow[] = LABELS.map(label => {
    const days = outcomes.filter(outcome => outcome.label === label);
    const byHorizon: Record<number, HorizonStat> = {};
    horizons.forEach((horizon, k) => {
      const returns = days.map(day => day.forward[k]).filter((r): r is number => r !== null);
      const hits = returns.filter(r => isHit(label, r)).length;
      byHorizon[horizon] = {
        samples: returns.length,
        hitRate: isDirectional(label) ? share(hits, returns.length) : null,
        avgReturnPercent: average(returns),
      };
    });
    return { label, signals: days.length, byHorizon };
  });

  const baseline: Record<number, BaselineStat> = {};
  horizons.forEach((horizon, k) => {
    const returns = outcomes.map(day => day.forward[k]).filter((r): r is number => r !== null);
    baseline[horizon] = {
      samples: returns.length,
      upRate: share(returns.filter(r => r > 0).length, returns.length),
      downRate: share(returns.filter(r => r < 0).length, returns.length),
      avgReturnPercent: average(returns),
    };
  });

  return { days: outcomes.length, horizons, rows, baseline };
}
