import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  TableSortLabel,
  CircularProgress,
  TextField,
  Button,
  Typography,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent
} from '@mui/material';
import { visuallyHidden } from '@mui/utils';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateRangePicker } from '@mui/x-date-pickers-pro/DateRangePicker';
import { DemoContainer } from '@mui/x-date-pickers/internals/demo';
import dayjs, { Dayjs } from 'dayjs';


interface Column {
  id: 'date' | 'open' | 'close' | 'high' | 'low' | 'volume' | 'changePercent';
  label: string;
  numeric: boolean;
  calculate?: (row: StockData) => number;
}

interface StockData {
  date: string;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
  [key: string]: string | number; 
}


const calculatePercentChange = (row: StockData): number => {
  return 100 * (row.close / row.open - 1);
};


const columns: Column[] = [
  { id: 'date', label: 'Date', numeric: false },
  { id: 'open', label: 'Open', numeric: true },
  { id: 'close', label: 'Close', numeric: true },
  { id: 'high', label: 'High', numeric: true },
  { id: 'low', label: 'Low', numeric: true },
  { 
    id: 'changePercent', 
    label: 'Change %', 
    numeric: true,
    calculate: calculatePercentChange 
  },
  { id: 'volume', label: 'Volume', numeric: true },
];


type Order = 'asc' | 'desc';


function descendingComparator<T>(a: T, b: T, orderBy: keyof T) {
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


function getComparator<Key extends keyof any>(
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


function stableSort<T>(array: readonly T[], comparator: (a: T, b: T) => number) {
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


interface EnhancedTableHeadProps {
  onRequestSort: (event: React.MouseEvent<unknown>, property: keyof StockData | 'changePercent') => void;
  order: Order;
  orderBy: keyof StockData | 'changePercent';
}

function EnhancedTableHead(props: EnhancedTableHeadProps) {
  const { order, orderBy, onRequestSort } = props;
  const createSortHandler = (property: keyof StockData | 'changePercent') => (event: React.MouseEvent<unknown>) => {
    onRequestSort(event, property);
  };

  return (
    <TableHead>
      <TableRow>
        {columns.map((column) => (
          <TableCell
            key={column.id}
            align={column.numeric ? 'right' : 'left'}
            sortDirection={orderBy === column.id ? order : false}
          >
            <TableSortLabel
              active={orderBy === column.id}
              direction={orderBy === column.id ? order : 'asc'}
              onClick={createSortHandler(column.id)}
            >
              {column.label}
              {orderBy === column.id ? (
                <Box component="span" sx={visuallyHidden}>
                  {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                </Box>
              ) : null}
            </TableSortLabel>
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
  );
}


const StockTable: React.FC = () => {
  const [data, setData] = useState<StockData[]>([]);
  const [order, setOrder] = useState<Order>('desc');
  const [orderBy, setOrderBy] = useState<keyof StockData | 'changePercent'>('date');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  

  const [symbol, setSymbol] = useState<string>('AAPL');
  const [stockExchange, setStockExchange] = useState<string>('US');
  const [apiKey, setApiKey] = useState<string>('');
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([
    dayjs().subtract(20, 'day'), 
    dayjs().subtract(1, 'day') 
  ]);

  // Read API key from URL query parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const apiKeyParam = urlParams.get('apikey');
    
    if (apiKeyParam) {
      setApiKey(apiKeyParam);
    }
  }, []);

  const fetchStockData = async () => {
    if (!dateRange[0] || !dateRange[1]) {
      setError('Please select a valid date range');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Format dates for API request (YYYY-MM-DD)
      const formattedFromDate = dateRange[0].format('YYYY-MM-DD');
      const formattedToDate = dateRange[1].format('YYYY-MM-DD');
      
      // Use the provided API key or fall back to "demo"
      const tokenValue = apiKey.trim() || 'demo';
      
      // Construct the full symbol with exchange
      const fullSymbol = `${symbol}.${stockExchange}`;
      
      // Construct dynamic API URL with the API key
      const apiUrl = `https://eodhd.com/api/eod/${fullSymbol}?from=${formattedFromDate}&to=${formattedToDate}&period=d&api_token=${tokenValue}&fmt=json`;
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      const apiData = await response.json();
      
      if (Array.isArray(apiData) && apiData.length === 0) {
        setError('No data available for the selected parameters');
        setData([]);
      } else {
        setData(apiData);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching stock data:', err);
      setError('Failed to load stock data. Please try again later.');
      setData([]);
      setLoading(false);
    }
  };

  // Fetch data on initial component load
  useEffect(() => {
    fetchStockData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRequestSort = (
    _event: React.MouseEvent<unknown>,
    property: keyof StockData | 'changePercent',
  ) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleSymbolChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSymbol(event.target.value);
  };

  const handleStockExchangeChange = (event: SelectChangeEvent) => {
    setStockExchange(event.target.value as string);
  };

  const handleApiKeyChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setApiKey(event.target.value);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    fetchStockData();
  };

  const visibleRows = React.useMemo(
    () => stableSort(data, getComparator(order, orderBy)),
    [data, order, orderBy],
  );

  const renderCellContent = (row: StockData, column: Column) => {
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

  return (
    <Box sx={{ width: '100%' }}>
      {/* Input controls for symbol, stock exchange, API key, and date range */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <form onSubmit={handleSubmit}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" mb={2}>
            <TextField
              label="Stock Symbol"
              value={symbol}
              onChange={handleSymbolChange}
              variant="outlined"
              size="small"
              fullWidth
              sx={{ maxWidth: 150 }}
            />
            
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel id="stock-exchange-label">Exchange</InputLabel>
              <Select
                labelId="stock-exchange-label"
                value={stockExchange}
                label="Exchange"
                onChange={handleStockExchangeChange}
              >
                <MenuItem value="US">US</MenuItem>
                <MenuItem value="HE">HE</MenuItem>
                <MenuItem value="LSE">LSE</MenuItem>
              </Select>
            </FormControl>
            
            <TextField
              label="API Key"
              value={apiKey}
              onChange={handleApiKeyChange}
              placeholder="Optional (defaults to 'demo')"
              variant="outlined"
              size="small"
              fullWidth
              sx={{ maxWidth: 250 }}
            />
            
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DemoContainer components={['DateRangePicker']}>
                <DateRangePicker
                  value={dateRange}
                  onChange={(newValue) => {
                    if (newValue) {
                      setDateRange(newValue);
                    }
                  }}
                  localeText={{ start: 'From date', end: 'To date' }}
                />
              </DemoContainer>
            </LocalizationProvider>
            
            <Button 
              type="submit" 
              variant="contained" 
              color="primary"
              disabled={loading}
            >
              Fetch Data
            </Button>
          </Stack>
        </form>
      </Paper>

      {/* Stock data table */}
      <Paper sx={{ width: '100%', mb: 2 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Box sx={{ color: 'error.main', p: 3, textAlign: 'center' }}>
            {error}
          </Box>
        ) : data.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography>No data available</Typography>
          </Box>
        ) : (
          <TableContainer sx={{ maxHeight: 800 }}>
            <Table stickyHeader aria-label="sticky table">
              <EnhancedTableHead
                order={order}
                orderBy={orderBy}
                onRequestSort={handleRequestSort}
              />
              <TableBody>
                {visibleRows.map((row, index) => (
                  <TableRow
                    hover
                    key={index}
                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                  >
                    {columns.map((column) => (
                      <TableCell 
                        key={column.id} 
                        align={column.numeric ? 'right' : 'left'}
                      >
                        {renderCellContent(row, column)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
};

export default StockTable; 