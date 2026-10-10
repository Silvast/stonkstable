import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
  Typography,
  useTheme
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import SearchIcon from '@mui/icons-material/Search';
import dayjs from 'dayjs';
import StockSelector from '../components/StockSelector/StockSelector';
import { BiasCard, NewsCard, RangeCard, RsiCard, TrendCard } from '../components/Analysis';
import { changeColor, formatPercent, formatPrice } from '../components/Analysis/format';
import { useStockSelection } from '../context/StockSelectionContext';
import { AnalysisResult, buildAnalysis } from '../utils/analysis';
import { readCache, writeCache } from '../utils/analysisCache';
import { fetchNewsFromApi } from '../utils/news';
import { fetchStockDataFromApi } from '../utils/stockTable';
import { tradingViewUrl } from '../utils/tradingView';

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
  const theme = useTheme();
  const { symbol, exchange, apiKey, selectedStock } = useStockSelection();
  const [formExpanded, setFormExpanded] = useState(true);
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

  return (
    <Box sx={{ width: '100%', mx: 'auto' }}>
      <Accordion
        expanded={formExpanded}
        onChange={() => setFormExpanded(!formExpanded)}
        sx={{ mb: 2, boxShadow: theme.shadows[1], '&:before': { display: 'none' } }}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="analysis-panel-content"
          id="analysis-panel-header"
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <SearchIcon fontSize="small" />
            <Typography variant="body1">{`Stock selection (${symbol}.${exchange})`}</Typography>
          </Stack>
        </AccordionSummary>
        <AccordionDetails sx={{ p: { xs: 1, sm: 2 } }}>
          <form onSubmit={handleSubmit}>
            <Stack spacing={2}>
              <StockSelector loading={loading} />
              <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
                <Button type="submit" variant="contained" disabled={loading} sx={{ width: { xs: '100%', sm: 150 } }}>
                  Analyze
                </Button>
                <Button type="button" variant="outlined" disabled={loading || !loaded} onClick={() => analyze(true)}>
                  Refresh
                </Button>
                {loaded?.cachedAt && (
                  <Typography variant="body2" color="text.secondary">
                    {`Cached from ${dayjs(loaded.cachedAt).format('HH:mm')}`}
                  </Typography>
                )}
              </Stack>
            </Stack>
          </form>
        </AccordionDetails>
      </Accordion>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
        sx={{ mb: 1 }}
      >
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 0, md: 1 }} alignItems={{ md: 'baseline' }}>
          <Typography variant="h6" component="h2">
            {`${symbol}.${exchange}${selectedStock ? ` · ${selectedStock.Name}` : ''}`}
          </Typography>
          {result && (
            <Typography variant="body1" sx={{ color: changeColor(result.dayChangePercent) }}>
              {`Last close ${result.asOf}: ${formatPrice(result.lastClose)} (${formatPercent(result.dayChangePercent)})`}
            </Typography>
          )}
        </Stack>
        <Button
          component="a"
          href={tradingViewUrl(symbol, exchange)}
          target="_blank"
          rel="noopener noreferrer"
          variant="outlined"
          size="small"
          endIcon={<OpenInNewIcon />}
          sx={{ textTransform: 'none', flexShrink: 0 }}
        >
          Open in TradingView
        </Button>
      </Stack>
      <Typography variant="caption" color="text.secondary" component="p" sx={{ mb: 2 }}>
        Based on daily data up to the last close. Not investment advice.
      </Typography>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && error && <Alert severity="error">{error}</Alert>}

      {!loading && !error && !result && (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
          Press Analyze to load (uses about 6 of your daily API calls)
        </Typography>
      )}

      {!loading && !error && result && (
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }}>
          <Box sx={{ gridColumn: '1 / -1' }}>
            <BiasCard bias={result.bias} />
          </Box>
          <RsiCard rsi={result.rsi} />
          <TrendCard trend={result.trend} />
          <RangeCard range={result.range} />
          <Box sx={{ gridColumn: '1 / -1' }}>
            <NewsCard news={result.news} />
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default Analysis;
