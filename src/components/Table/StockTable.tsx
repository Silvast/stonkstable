import React, { useState, useEffect, useCallback } from 'react';
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
  SelectChangeEvent,
  useMediaQuery,
  useTheme
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
  minWidth?: number;
  // Define which screen sizes this column should be visible on
  responsiveVisibility?: {
    xs?: boolean; // extra small screens (0px+)
    sm?: boolean; // small screens (600px+)
    md?: boolean; // medium screens (900px+)
    lg?: boolean; // large screens (1200px+)
    xl?: boolean; // extra large screens (1536px+)
  };
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
  { 
    id: 'date', 
    label: 'Date', 
    numeric: false, 
    minWidth: 100,
    responsiveVisibility: { xs: true, sm: true, md: true, lg: true, xl: true } 
  },
  { 
    id: 'open', 
    label: 'Open', 
    numeric: true,
    minWidth: 80,
    responsiveVisibility: { xs: true, sm: true, md: true, lg: true, xl: true } 
  },
  { 
    id: 'close', 
    label: 'Close', 
    numeric: true,
    minWidth: 80,
    responsiveVisibility: { xs: true, sm: true, md: true, lg: true, xl: true } 
  },
  { 
    id: 'high', 
    label: 'High', 
    numeric: true,
    minWidth: 80,
    responsiveVisibility: { xs: false, sm: false, md: true, lg: true, xl: true } 
  },
  { 
    id: 'low', 
    label: 'Low', 
    numeric: true,
    minWidth: 80,
    responsiveVisibility: { xs: false, sm: false, md: true, lg: true, xl: true } 
  },
  { 
    id: 'changePercent', 
    label: 'Change %', 
    numeric: true,
    calculate: calculatePercentChange,
    minWidth: 90,
    responsiveVisibility: { xs: true, sm: true, md: true, lg: true, xl: true } 
  },
  { 
    id: 'volume', 
    label: 'Volume', 
    numeric: true,
    minWidth: 100,
    responsiveVisibility: { xs: false, sm: true, md: true, lg: true, xl: true } 
  },
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
  visibleColumns: string[];
}

function EnhancedTableHead(props: EnhancedTableHeadProps) {
  const { order, orderBy, onRequestSort, visibleColumns } = props;
  const createSortHandler = (property: keyof StockData | 'changePercent') => (event: React.MouseEvent<unknown>) => {
    onRequestSort(event, property);
  };

  return (
    <TableHead>
      <TableRow>
        {columns.map((column) => (
          visibleColumns.includes(column.id) && (
            <TableCell
              key={column.id}
              align={column.numeric ? 'right' : 'left'}
              sortDirection={orderBy === column.id ? order : false}
              sx={{ 
                minWidth: column.minWidth,
                whiteSpace: 'nowrap',
                paddingLeft: 1,
                paddingRight: 1,
              }}
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
          )
        ))}
      </TableRow>
    </TableHead>
  );
}


const StockTable: React.FC = () => {
  const theme = useTheme();
  const isXsScreen = useMediaQuery(theme.breakpoints.down('sm')); // <600px (iPhone)
  const isSmScreen = useMediaQuery(theme.breakpoints.between('sm', 'md')); // 600-900px
  const isMdScreen = useMediaQuery(theme.breakpoints.between('md', 'lg')); // 900-1200px

  // Determine which columns should be visible based on screen size
  const getVisibleColumns = useCallback(() => {
    if (isXsScreen) {
      return columns
        .filter(col => col.responsiveVisibility?.xs)
        .map(col => col.id);
    } else if (isSmScreen) {
      return columns
        .filter(col => col.responsiveVisibility?.sm)
        .map(col => col.id);
    } else if (isMdScreen) {
      return columns
        .filter(col => col.responsiveVisibility?.md)
        .map(col => col.id);
    } else {
      return columns.map(col => col.id); // Show all columns on large screens
    }
  }, [isXsScreen, isSmScreen, isMdScreen]);

  const [visibleColumns, setVisibleColumns] = useState<string[]>(getVisibleColumns());

  // Update visible columns when screen size changes
  useEffect(() => {
    setVisibleColumns(getVisibleColumns());
  }, [isXsScreen, isSmScreen, isMdScreen, getVisibleColumns]);

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
      <Paper sx={{ p: { xs: 1.5, sm: 2 }, mb: 2 }}>
        <form onSubmit={handleSubmit}>
          <Stack 
            direction="column"
            spacing={2} 
            alignItems="stretch" 
            mb={2}
          >
            {/* First group: Stock details and API Key */}
            <Stack 
              direction={{ xs: 'column', sm: 'row' }}
              spacing={{ xs: 2, sm: 2 }}
              alignItems="flex-start"
            >
              {/* Symbol and Exchange always stay together in one row */}
              <Stack 
                direction="row" 
                spacing={1} 
                alignItems="center"
                sx={{ width: { xs: '100%', sm: '60%', md: '40%' } }}
              >
                <TextField
                  label="Stock Symbol"
                  value={symbol}
                  onChange={handleSymbolChange}
                  variant="outlined"
                  size="small"
                  sx={{ flexGrow: 1, minWidth: 80 }}
                />
                
                <FormControl 
                  size="small" 
                  sx={{ width: { xs: 110, sm: 120 } }}
                >
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
              </Stack>
              
              {/* API Key moves to the right on tablet+ screens */}
              <TextField
                label="API Key"
                value={apiKey}
                onChange={handleApiKeyChange}
                placeholder="Optional (defaults to 'demo')"
                variant="outlined"
                size="small"
                fullWidth
                sx={{ 
                  flexGrow: 1,
                  width: { xs: '100%', sm: '40%', md: '60%' }
                }}
              />
            </Stack>
            
            {/* Second group: Date picker and Submit button */}
            <Stack 
              direction={{ xs: 'column', md: 'row' }} 
              spacing={2}
              alignItems={{ xs: 'stretch', md: 'flex-start' }}
            >
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <Box sx={{ width: '100%' }}>
                  <DemoContainer 
                    components={['DateRangePicker']}
                    sx={{ 
                      width: '100%',
                      mt: 0.5,
                      '& .MuiStack-root': {
                        width: '100%'
                      },
                      '& .MuiDateRangePickerDay-root': {
                        width: '100%'
                      },
                      // Fix for mobile view
                      '& .MuiFormControl-root': {
                        width: '100%'
                      },
                      '& .MuiInputBase-root': {
                        fontSize: { xs: '0.875rem', sm: 'inherit' }
                      }
                    }}
                  >
                    <DateRangePicker
                      value={dateRange}
                      onChange={(newValue) => {
                        if (newValue) {
                          setDateRange(newValue);
                        }
                      }}
                      localeText={{ start: 'From', end: 'To' }}
                    />
                  </DemoContainer>
                </Box>
              </LocalizationProvider>
              
              <Button 
                type="submit" 
                variant="contained" 
                color="primary"
                disabled={loading}
                sx={{ 
                  height: { md: 40 },
                  alignSelf: { md: 'center' },
                  mt: { xs: 0, md: 2 },
                  width: { xs: '100%', md: 150 }
                }}
              >
                Fetch Data
              </Button>
            </Stack>
          </Stack>
        </form>
      </Paper>

      {/* Stock data table */}
      <Paper sx={{ width: '100%', mb: 2, overflow: 'hidden' }}>
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
          <TableContainer sx={{ maxHeight: 800, overflow: 'auto' }}>
            <Table stickyHeader aria-label="sticky table" size={isXsScreen ? "small" : "medium"}>
              <EnhancedTableHead
                order={order}
                orderBy={orderBy}
                onRequestSort={handleRequestSort}
                visibleColumns={visibleColumns}
              />
              <TableBody>
                {visibleRows.map((row, index) => (
                  <TableRow
                    hover
                    key={index}
                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                  >
                    {columns.map((column) => (
                      visibleColumns.includes(column.id) && (
                        <TableCell 
                          key={column.id} 
                          align={column.numeric ? 'right' : 'left'}
                          sx={{ 
                            whiteSpace: 'nowrap',
                            paddingLeft: 1,
                            paddingRight: 1,
                            fontSize: isXsScreen ? '0.8rem' : 'inherit'
                          }}
                        >
                          {renderCellContent(row, column)}
                        </TableCell>
                      )
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
      
      {/* Responsive notice */}
      {isXsScreen && (
        <Typography variant="caption" color="text.secondary" align="center" sx={{ display: 'block', mb: 2 }}>
          Some columns are hidden on small screens. Rotate your device for full view.
        </Typography>
      )}
    </Box>
  );
};

export default StockTable; 