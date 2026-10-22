import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Link, Stack, Typography } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ScheduleIcon from '@mui/icons-material/Schedule';
import dayjs from 'dayjs';
import StockSearchField from '../components/StockSelector/StockSearchField';
import ExchangeToggle from '../components/StockSelector/ExchangeToggle';
import FavouriteToggle from '../components/Favourites/FavouriteToggle';
import Panel from '../components/common/Panel';
import { CodeChip } from '../components/common/Chips';
import { BiasPanel, LevelsCard, NewsCard, RsiCard, TrendCard, TypicalDayCard } from '../components/Analysis';
import { useStockSelection } from '../context/StockSelectionContext';
import { AnalysisResult, buildAnalysis } from '../utils/analysis';
import { readCache, writeCache } from '../utils/analysisCache';
import { fetchNewsFromApi } from '../utils/news';
import { fetchStockDataFromApi } from '../utils/stockTable';
import { nordnetUrl } from '../utils/nordnet';
import { tradingViewUrl } from '../utils/tradingView';
import { tokens } from '../theme';

const EOD_DAYS = 180;
const NEWS_DAYS = 3;

interface LoadedAnalysis {
  result: AnalysisResult;
  cachedAt: string | null;
}

const fromCache = (symbol: string, exchange: string): LoadedAnalysis | null => {
  const cached = readCache(symbol, exchange);
  return cached ? { result: buildAnalysis(cached.eod, cached.news), cachedAt: cached.fetchedAt } : null;
};

const Analysis = (): React.ReactElement => {
  const { symbol, exchange, apiKey, selectedStock } = useStockSelection();
  const [loaded, setLoaded] = useState<LoadedAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    requestId.current += 1;
    setLoading(false);
    setError(null);
    setLoaded(fromCache(symbol, exchange));
  }, [symbol, exchange]);

  const analyze = useCallback(async (bypassCache: boolean) => {
    if (!bypassCache) {
      const cached = fromCache(symbol, exchange);
      if (cached) {
        setLoaded(cached);
        return;
      }
    }

    const id = ++requestId.current;
    setLoading(true);
    setError(null);

    const today = dayjs();
    const [eod, news] = await Promise.all([
      fetchStockDataFromApi(symbol, exchange, today.subtract(EOD_DAYS, 'day'), today, apiKey),
      fetchNewsFromApi(symbol, exchange, apiKey, today.subtract(NEWS_DAYS, 'day')),
    ]);

    if (id !== requestId.current) return;
    setLoading(false);

    if (eod.error || !Array.isArray(eod.data) || eod.data.length === 0) {
      setError(eod.error ?? 'No data available for the selected parameters');
      setLoaded(null);
      return;
    }

    writeCache(symbol, exchange, eod, news);
    setLoaded({ result: buildAnalysis(eod.data, news), cachedAt: null });
  }, [symbol, exchange, apiKey]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    analyze(false);
  };

  const result = loaded?.result;
  const name = selectedStock?.Name ?? symbol;
  const code = `${symbol}.${exchange}`;
  const tvHref = tradingViewUrl(symbol, exchange);
  const nordnetHref = nordnetUrl(symbol, exchange, selectedStock?.Name);

  return (
    <Stack spacing={2}>
      <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.25, alignItems: 'center' }}>
        <StockSearchField loading={loading} sx={{ flex: '1 1 320px' }} />
        <ExchangeToggle />
        <FavouriteToggle stock={selectedStock} exchange={exchange} bordered />
        {loaded?.cachedAt && (
          <Box
            component="span"
            sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, minHeight: 32, px: 1.25, borderRadius: '8px', bgcolor: tokens.neutralChip, fontSize: 12, color: tokens.textIdle }}
          >
            <ScheduleIcon sx={{ fontSize: 14 }} />
            <span>{`Cached ${dayjs(loaded.cachedAt).format('HH:mm')}`}</span>
          </Box>
        )}
        <Button type="button" variant="outlined" disabled={loading || !loaded} onClick={() => analyze(true)} sx={{ minHeight: 44 }}>
          Refresh · 6 calls
        </Button>
        <Button type="submit" variant="contained" disabled={loading} sx={{ minHeight: 44, px: 2.5, fontWeight: 600 }}>
          Analyse
        </Button>
      </Box>

      {loading && (
        <Panel sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Panel>
      )}

      {!loading && error && <Alert severity="error">{error}</Alert>}

      {!loading && !error && !result && (
        <Panel sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.25 }}>
            <Typography variant="h1" sx={{ fontSize: 22 }}>{name}</Typography>
            <CodeChip>{code}</CodeChip>
          </Box>
          <Typography variant="body1" color="text.secondary">
            Press Analyse to load (uses about 6 of your daily API calls)
          </Typography>
          <Link
            href={tvHref}
            target="_blank"
            rel="noopener noreferrer"
            underline="none"
            sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, minHeight: 40, fontWeight: 600, alignSelf: 'flex-start' }}
          >
            Open in TradingView
            <OpenInNewIcon sx={{ fontSize: 14 }} />
          </Link>
          <Link
            href={nordnetHref}
            target="_blank"
            rel="noopener noreferrer"
            underline="none"
            sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, minHeight: 40, fontWeight: 600, alignSelf: 'flex-start' }}
          >
            Open in Nordnet
            <OpenInNewIcon sx={{ fontSize: 14 }} />
          </Link>
        </Panel>
      )}

      {!loading && !error && result && (
        <>
          <BiasPanel
            name={name}
            code={code}
            lastClose={result.lastClose}
            dayChangePercent={result.dayChangePercent}
            asOf={result.asOf}
            bias={result.bias}
            signals={result.signals}
            tradingViewHref={tvHref}
            nordnetHref={nordnetHref}
          />
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
            <RsiCard rsi={result.rsi} />
            <TrendCard trend={result.trend} />
            <TypicalDayCard range={result.range} />
          </Box>
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
            <LevelsCard range={result.range} lastClose={result.lastClose} />
            <NewsCard news={result.news} />
          </Box>
        </>
      )}
    </Stack>
  );
};

export default Analysis;
