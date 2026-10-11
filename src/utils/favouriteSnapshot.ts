import { readCache } from './analysisCache';
import { AnalysisResult, buildAnalysis } from './analysis';
import { FavouriteStock } from './favouritesStorage';

export type BiasShortLabel = 'Long' | 'Short' | 'Aside';

export const BIAS_SHORT_LABELS: Record<AnalysisResult['bias']['label'], BiasShortLabel> = {
  'Leaning long': 'Long',
  'Leaning short': 'Short',
  'Stand aside': 'Aside',
};

export interface FavouriteSnapshot {
  close: number;
  changePercent: number;
  closes: number[];
  bias: BiasShortLabel;
}

export function favouriteSnapshot(fav: FavouriteStock): FavouriteSnapshot | null {
  const cached = readCache(fav.code, fav.exchange);
  if (!cached || cached.eod.length === 0) return null;

  const analysis = buildAnalysis(cached.eod, cached.news);
  return {
    close: analysis.lastClose,
    changePercent: analysis.dayChangePercent,
    closes: analysis.trend.recentCloses,
    bias: BIAS_SHORT_LABELS[analysis.bias.label],
  };
}
