import { StockData } from './stockTable';
import { NewsArticle, NewsResult } from './news';
import { atr, gapPercent, pivots, rangeHighLow, relativeVolume, rsi, sma, streak } from './indicators';

export const ANALYSIS_THRESHOLDS = {
  rsiOversold: 30,
  rsiOverbought: 70,
  relVolumeHigh: 1.5,
  newsPositive: 0.2,
  newsNegative: -0.2,
  biasLong: 2,
  biasShort: -2,
};

const MIN_BARS = 20;

type RsiLabel = 'Oversold' | 'Neutral' | 'Overbought';
type TrendLabel = 'Up' | 'Down' | 'Sideways';
type NewsTone = 'Positive' | 'Neutral' | 'Negative';
type BiasLabel = 'Leaning long' | 'Leaning short' | 'Stand aside';

export interface AnalysisResult {
  asOf: string;
  lastClose: number;
  dayChangePercent: number;
  rsi: { value: number; previous: number; label: RsiLabel } | null;
  trend: {
    sma20: number | null;
    sma50: number | null;
    vsSma20Pct: number | null;
    vsSma50Pct: number | null;
    label: TrendLabel;
    streak: number;
  };
  range: {
    atr: number | null;
    atrPercent: number | null;
    prevHigh: number;
    prevLow: number;
    prevClose: number;
    high20: number | null;
    low20: number | null;
    pivots: { p: number; r1: number; s1: number };
    gapPercent: number | null;
    relativeVolume: number | null;
  };
  news: { articles: NewsArticle[]; avgPolarity: number | null; tone: NewsTone | null; error: string | null };
  bias: { score: number; label: BiasLabel; reasons: string[] };
}

const percentFrom = (value: number, base: number | null): number | null =>
  base ? (value / base - 1) * 100 : null;

const rsiLabel = (value: number): RsiLabel => {
  if (value < ANALYSIS_THRESHOLDS.rsiOversold) return 'Oversold';
  if (value > ANALYSIS_THRESHOLDS.rsiOverbought) return 'Overbought';
  return 'Neutral';
};

const trendLabel = (close: number, sma20: number | null, sma50: number | null): TrendLabel => {
  if (sma20 === null) return 'Sideways';
  if (sma50 === null) {
    if (close > sma20) return 'Up';
    if (close < sma20) return 'Down';
    return 'Sideways';
  }
  if (close > sma20 && sma20 > sma50) return 'Up';
  if (close < sma20 && sma20 < sma50) return 'Down';
  return 'Sideways';
};

const newsTone = (avgPolarity: number | null): NewsTone | null => {
  if (avgPolarity === null) return null;
  if (avgPolarity > ANALYSIS_THRESHOLDS.newsPositive) return 'Positive';
  if (avgPolarity < ANALYSIS_THRESHOLDS.newsNegative) return 'Negative';
  return 'Neutral';
};

const headlines = (count: number, kind: string): string =>
  `${count} ${kind} headline${count === 1 ? '' : 's'} in 72 h`;

const biasLabel = (score: number): BiasLabel => {
  if (score >= ANALYSIS_THRESHOLDS.biasLong) return 'Leaning long';
  if (score <= ANALYSIS_THRESHOLDS.biasShort) return 'Leaning short';
  return 'Stand aside';
};

export function buildAnalysis(bars: StockData[], news: NewsResult): AnalysisResult {
  const sorted = [...bars].sort((a, b) => a.date.localeCompare(b.date));
  const closes = sorted.map(bar => bar.close);
  const last = sorted[sorted.length - 1];
  const prev = sorted.length > 1 ? sorted[sorted.length - 2] : last;

  const dayChangePercent = percentFrom(last.close, prev.close) ?? 0;

  const rsiValue = rsi(closes);
  const rsiResult = rsiValue && { ...rsiValue, label: rsiLabel(rsiValue.value) };

  const sma20 = sma(closes, 20);
  const sma50 = sma(closes, 50);
  const trend = {
    sma20,
    sma50,
    vsSma20Pct: percentFrom(last.close, sma20),
    vsSma50Pct: percentFrom(last.close, sma50),
    label: trendLabel(last.close, sma20, sma50),
    streak: streak(closes),
  };

  const atrResult = atr(sorted);
  const range20 = rangeHighLow(sorted, 20);
  const relVolume = relativeVolume(sorted.map(bar => bar.volume));
  const range = {
    atr: atrResult?.value ?? null,
    atrPercent: atrResult?.percent ?? null,
    prevHigh: last.high,
    prevLow: last.low,
    prevClose: last.close,
    high20: range20?.high ?? null,
    low20: range20?.low ?? null,
    pivots: pivots(last),
    gapPercent: gapPercent(sorted),
    relativeVolume: relVolume,
  };

  const polarities = news.data
    .map(article => article.sentiment?.polarity)
    .filter((polarity): polarity is number => typeof polarity === 'number');
  const avgPolarity = polarities.length
    ? polarities.reduce((sum, polarity) => sum + polarity, 0) / polarities.length
    : null;
  const tone = newsTone(avgPolarity);

  const analysis: Omit<AnalysisResult, 'bias'> = {
    asOf: last.date,
    lastClose: last.close,
    dayChangePercent,
    rsi: rsiResult,
    trend,
    range,
    news: { articles: news.data, avgPolarity, tone, error: news.error },
  };

  if (sorted.length < MIN_BARS) {
    return { ...analysis, bias: { score: 0, label: 'Stand aside', reasons: ['Not enough history'] } };
  }

  let score = 0;
  const reasons: string[] = [];
  const vote = (direction: number, reason: string) => {
    score += direction;
    reasons.push(reason);
  };

  if (rsiResult?.label === 'Oversold') vote(1, `RSI ${Math.round(rsiResult.value)}, oversold`);
  if (rsiResult?.label === 'Overbought') vote(-1, `RSI ${Math.round(rsiResult.value)}, overbought`);

  const averages = sma50 === null ? '20-day average' : '20- and 50-day averages';
  if (trend.label === 'Up') vote(1, `Above ${averages}`);
  if (trend.label === 'Down') vote(-1, `Below ${averages}`);

  if (relVolume !== null && relVolume >= ANALYSIS_THRESHOLDS.relVolumeHigh) {
    const times = `${relVolume.toFixed(1)}× volume`;
    if (dayChangePercent > 0) vote(1, `Up day on ${times}`);
    if (dayChangePercent < 0) vote(-1, `Down day on ${times}`);
  }

  if (tone === 'Positive') {
    vote(1, headlines(polarities.filter(p => p > ANALYSIS_THRESHOLDS.newsPositive).length, 'positive'));
  }
  if (tone === 'Negative') {
    vote(-1, headlines(polarities.filter(p => p < ANALYSIS_THRESHOLDS.newsNegative).length, 'negative'));
  }

  return { ...analysis, bias: { score, label: biasLabel(score), reasons } };
}
