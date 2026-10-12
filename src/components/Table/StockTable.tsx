import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Popover, Stack, Typography } from '@mui/material';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { Dayjs } from 'dayjs';
import { StockData, fetchStockDataFromApi } from '../../utils/stockTable';
import { formatDateRange, summarisePrices } from '../../utils/priceStats';
import { useStockSelection } from '../../context/StockSelectionContext';
import StockSearchField from '../StockSelector/StockSearchField';
import ExchangeToggle from '../StockSelector/ExchangeToggle';
import Panel from '../common/Panel';
import StockHeader, { FetchedStock } from './StockHeader';
import KpiTiles from './KpiTiles';
import PriceChartPanel from './PriceChartPanel';
import PricesTable from './PricesTable';

const StockTable = () => {
  const { symbol, exchange, apiKey, selectedStock } = useStockSelection();
  const [data, setData] = useState<StockData[]>([]);
  const [fetched, setFetched] = useState<FetchedStock | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Dayjs | null>(dayjs().subtract(20, 'day'));
  const [endDate, setEndDate] = useState<Dayjs | null>(dayjs().subtract(1, 'day'));
  const [datesAnchor, setDatesAnchor] = useState<HTMLElement | null>(null);

  const summary = useMemo(() => summarisePrices(data), [data]);

  const fetchStockData = async () => {
    if (!startDate || !endDate) {
      setError('Please select a valid date range');
      return;
    }

    const request: FetchedStock = { symbol, exchange, stock: selectedStock };
    try {
      setLoading(true);
      setError(null);

      const result = await fetchStockDataFromApi(symbol, exchange, startDate, endDate, apiKey);

      setData(result.data);
      setError(result.error);
      setFetched(request);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching stock data:', err);
      setError('Failed to load stock data. Please try again later.');
      setData([]);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStockData();
  }, []);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    fetchStockData();
  };

  const rangeLabel = startDate && endDate ? formatDateRange(startDate, endDate) : 'Choose dates';

  return (
    <Stack spacing={2}>
      <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.25, alignItems: 'center' }}>
        <StockSearchField loading={loading} sx={{ flex: '1 1 320px' }} />
        <ExchangeToggle />
        <Button
          variant="outlined"
          startIcon={<CalendarMonthOutlinedIcon fontSize="small" />}
          aria-label={`Date range ${rangeLabel}`}
          onClick={(event) => setDatesAnchor(event.currentTarget)}
          sx={{ minHeight: 44, fontWeight: 400 }}
        >
          {rangeLabel}
        </Button>
        <Popover
          open={datesAnchor !== null}
          anchorEl={datesAnchor}
          onClose={() => setDatesAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        >
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ p: 2 }}>
              <DatePicker label="From Date" value={startDate} onChange={setStartDate} slotProps={{ textField: { size: 'small' } }} />
              <DatePicker label="To Date" value={endDate} onChange={setEndDate} slotProps={{ textField: { size: 'small' } }} />
            </Stack>
          </LocalizationProvider>
        </Popover>
        <Button type="submit" variant="contained" disabled={loading} sx={{ minHeight: 44, px: 2.5, fontWeight: 600 }}>
          Fetch
        </Button>
      </Box>

      {loading && (
        <Panel sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Panel>
      )}

      {!loading && error && <Alert severity="error">{error}</Alert>}

      {!loading && !error && fetched && summary && (
        <>
          <StockHeader fetched={fetched} summary={summary} />
          <KpiTiles summary={summary} />
          <PricesTable rows={data} code={`${fetched.symbol}.${fetched.exchange}`} />
          <PriceChartPanel rows={data} />
        </>
      )}

      <Typography variant="caption" component="p" color="text.secondary">
        End-of-day data from EODHD. Not investment advice.
      </Typography>
    </Stack>
  );
};

export default StockTable;
