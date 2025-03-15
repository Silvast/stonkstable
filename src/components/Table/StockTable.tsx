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
  useTheme,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import { visuallyHidden } from '@mui/utils';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { Dayjs } from 'dayjs';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SearchIcon from '@mui/icons-material/Search';

// Define the Order type
type Order = 'asc' | 'desc';

interface Column {
  id: 'date' | 'open' | 'close' | 'high' | 'low' | 'volume' | 'changePercent';
  label: string;
  numeric: boolean;
  calculate?: (row: StockData) => number;
  responsiveVisibility?: {
    xs?: boolean;
    sm?: boolean;
    md?: boolean;
    lg?: boolean;
    xl?: boolean;
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

function calculatePercentChange(row: StockData): number {
  return 100 * (row.close / row.open - 1);
}

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

const COLUMNS: Column[] = [
  { 
    id: 'date', 
    label: 'Date', 
    numeric: false, 
    responsiveVisibility: { xs: true, sm: true, md: true, lg: true, xl: true } 
  },
  { 
    id: 'open', 
    label: 'Open', 
    numeric: true,
    responsiveVisibility: { xs: true, sm: true, md: true, lg: true, xl: true } 
  },
  { 
    id: 'close', 
    label: 'Close', 
    numeric: true,
    responsiveVisibility: { xs: true, sm: true, md: true, lg: true, xl: true } 
  },
  { 
    id: 'high', 
    label: 'High', 
    numeric: true,
    responsiveVisibility: { xs: false, sm: false, md: true, lg: true, xl: true } 
  },
  { 
    id: 'low', 
    label: 'Low', 
    numeric: true,
    responsiveVisibility: { xs: false, sm: false, md: true, lg: true, xl: true } 
  },
  { 
    id: 'changePercent', 
    label: 'Change %', 
    numeric: true,
    calculate: calculatePercentChange,
    responsiveVisibility: { xs: true, sm: true, md: true, lg: true, xl: true } 
  },
  { 
    id: 'volume', 
    label: 'Volume', 
    numeric: true,
    responsiveVisibility: { xs: false, sm: false, md: true, lg: true, xl: true } 
  },
];

const StockTable = () => {
  const theme = useTheme();
  const isXsScreen = useMediaQuery(theme.breakpoints.down('sm')); // <600px (iPhone)
  const isSmScreen = useMediaQuery(theme.breakpoints.between('sm', 'md')); // 600-900px
  const isMdScreen = useMediaQuery(theme.breakpoints.between('md', 'lg')); // 900-1200px

  // Control for Accordion expanded state
  const [formExpanded, setFormExpanded] = useState(!isXsScreen); // Collapsed by default on small screens

  const getVisibleColumns = useCallback(() => {
    if (isXsScreen) {
      return COLUMNS
        .filter(col => col.responsiveVisibility?.xs)
        .map(col => col.id);
    } else if (isSmScreen) {
      return COLUMNS
        .filter(col => col.responsiveVisibility?.sm)
        .map(col => col.id);
    } else if (isMdScreen) {
      return COLUMNS
        .filter(col => col.responsiveVisibility?.md)
        .map(col => col.id);
    } else {
      return COLUMNS.map(col => col.id); 
    }
  }, [isXsScreen, isSmScreen, isMdScreen]); 

  const [visibleColumns, setVisibleColumns] = useState<string[]>(getVisibleColumns());

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
  const [startDate, setStartDate] = useState<Dayjs | null>(dayjs().subtract(20, 'day'));
  const [endDate, setEndDate] = useState<Dayjs | null>(dayjs().subtract(1, 'day'));

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const apiKeyParam = urlParams.get('apikey');
    
    if (apiKeyParam) {
      setApiKey(apiKeyParam);
    }
  }, []);

  const fetchStockData = async () => {
    if (!startDate || !endDate) {
      setError('Please select a valid date range');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const formattedFromDate = startDate.format('YYYY-MM-DD');
      const formattedToDate = endDate.format('YYYY-MM-DD');
      
      const tokenValue = apiKey.trim() || 'demo';
      
      const fullSymbol = `${symbol}.${stockExchange}`;
      
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

  useEffect(() => {
    fetchStockData();
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


  const EnhancedTableHead = (props: {
    onRequestSort: (event: React.MouseEvent<unknown>, property: keyof StockData | 'changePercent') => void;
    order: Order;
    orderBy: keyof StockData | 'changePercent';
    visibleColumns: string[];
  }) => {
    const { order, orderBy, onRequestSort, visibleColumns } = props;
    const createSortHandler = (property: keyof StockData | 'changePercent') => (event: React.MouseEvent<unknown>) => {
      onRequestSort(event, property);
    };

    return (
      <TableHead>
        <TableRow>
          {COLUMNS.map((column) => (
            visibleColumns.includes(column.id) && (
              <TableCell
                key={column.id}
                align={column.numeric ? 'right' : 'left'}
                sortDirection={orderBy === column.id ? order : false}
                sx={{ 
                  padding: { xs: '2px 2px', sm: '10px 20px' }, // Match table cell padding
                  fontSize: { xs: '0.65rem', sm: '1rem' }, // Match table cell font size
                  fontWeight: 'bold',
                  whiteSpace: { xs: 'normal', sm: 'nowrap' },
                  width: { 
                    xs: column.id === 'date' ? '25%' : 
                        column.id === 'open' ? '25%' : 
                        column.id === 'close' ? '25%' : 
                        column.id === 'changePercent' ? '25%' : 'auto',
                    sm: 'auto' 
                  }
                }}
              >
                <TableSortLabel
                  active={orderBy === column.id}
                  direction={orderBy === column.id ? order : 'asc'}
                  onClick={createSortHandler(column.id)}
                  sx={{
                    '& .MuiTableSortLabel-icon': {
                      fontSize: { xs: '0.8rem', sm: '1rem' }  // Adjust the sort icon size
                    }
                  }}
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
  };

  return (
    <Box sx={{ 
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      mx: 'auto' // Center the content
    }}>
      {/* Input controls for symbol, stock exchange, API key, and date range */}
      <Accordion 
        expanded={formExpanded}
        onChange={() => setFormExpanded(!formExpanded)}
        sx={{ 
          mb: { xs: formExpanded ? 2 : 0.5, sm: formExpanded ? 2 : 1 }, 
          boxShadow: theme.shadows[1],
          '&:before': {
            display: 'none',
          }
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="search-panel-content"
          id="search-panel-header"
          sx={{
            minHeight: { xs: 40, sm: 48 }, 
            py: { xs: 0, sm: 0.5 }, 
            '& .MuiAccordionSummary-content': {
              margin: { xs: '6px 0', sm: '10px 0' }, 
            },
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <SearchIcon fontSize={isXsScreen ? "small" : "small"} />
            <Typography
              variant={isXsScreen ? "body2" : "body1"}
              sx={{ 
                fontSize: { xs: '0.8rem', sm: 'inherit' }
              }}
            >
              {isXsScreen ? 'Search' : 'Stock Search Options'} {symbol && `(${symbol}.${stockExchange})`}
            </Typography>
          </Stack>
        </AccordionSummary>
        <AccordionDetails sx={{ p: { xs: 1, sm: 2 } }}>
          <form onSubmit={handleSubmit}>
            <Stack 
              direction="column"
              spacing={2} 
              alignItems="stretch" 
              mb={1}
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
                    sx={{ 
                      flexGrow: 1, 
                      minWidth: 80,
                      '& .MuiInputLabel-root': {
                        fontSize: { xs: '0.8rem', sm: 'inherit' }
                      },
                      '& .MuiInputBase-input': {
                        fontSize: { xs: '0.8rem', sm: 'inherit' }
                      }
                    }}
                  />
                  
                  <FormControl 
                    size="small" 
                    sx={{ 
                      width: { xs: 110, sm: 120 },
                      '& .MuiInputLabel-root': {
                        fontSize: { xs: '0.8rem', sm: 'inherit' }
                      },
                      '& .MuiSelect-select': {
                        fontSize: { xs: '0.8rem', sm: 'inherit' }
                      }
                    }}
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
                    width: { xs: '100%', sm: '40%', md: '60%' },
                    '& .MuiInputLabel-root': {
                      fontSize: { xs: '0.8rem', sm: 'inherit' }
                    },
                    '& .MuiInputBase-input': {
                      fontSize: { xs: '0.8rem', sm: 'inherit' }
                    }
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
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }} 
                    spacing={2}
                    width="100%"
                  >
                    <DatePicker
                      label="From Date"
                      value={startDate}
                      onChange={(newValue) => {
                        setStartDate(newValue);
                      }}
                      slotProps={{ 
                        textField: { 
                          size: 'small',
                          fullWidth: true,
                          sx: {
                            '& .MuiInputLabel-root': {
                              fontSize: { xs: '0.8rem', sm: 'inherit' }
                            },
                            '& .MuiInputBase-input': {
                              fontSize: { xs: '0.8rem', sm: 'inherit' }
                            }
                          }
                        } 
                      }}
                      sx={{ flexGrow: 1 }}
                    />
                    <DatePicker
                      label="To Date"
                      value={endDate}
                      onChange={(newValue) => {
                        setEndDate(newValue);
                      }}
                      slotProps={{ 
                        textField: { 
                          size: 'small',
                          fullWidth: true,
                          sx: {
                            '& .MuiInputLabel-root': {
                              fontSize: { xs: '0.8rem', sm: 'inherit' }
                            },
                            '& .MuiInputBase-input': {
                              fontSize: { xs: '0.8rem', sm: 'inherit' }
                            }
                          }
                        } 
                      }}
                      sx={{ flexGrow: 1 }}
                    />
                  </Stack>
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
                    width: { xs: '100%', md: 150 },
                    fontSize: { xs: '0.8rem', sm: 'inherit' }
                  }}
                >
                  Fetch Data
                </Button>
              </Stack>
            </Stack>
          </form>
        </AccordionDetails>
      </Accordion>

      {/* Stock data table */}
      <Paper 
        sx={{ 
          width: '100%', 
          mb: 2, 
          overflow: 'hidden',
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          height: formExpanded ? 'auto' : { xs: 'calc(100vh - 150px)', sm: 'calc(100vh - 180px)' },
        }}
      >
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
          <TableContainer sx={{ 
            maxHeight: formExpanded ? 800 : { xs: 'calc(100vh - 160px)', sm: 'calc(100vh - 190px)' },
            overflowX: 'hidden',
            flexGrow: 1 
          }}>
            <Table 
              stickyHeader 
              aria-label="sticky table" 
              size="small"
              sx={{ 
                tableLayout: { xs: 'fixed', sm: 'auto' },
                borderSpacing: 0,
                borderCollapse: 'collapse',
                width: '100%',
                '& .MuiTableCell-root': {
                  padding: { xs: '2px 2px', sm: '10px 20px' }, // Increased padding for better spacing
                  fontSize: { xs: '0.65rem', sm: '1rem' }, // Larger font size for normal screens
                  borderBottom: '1px solid rgba(224, 224, 224, 0.3)'
                }
              }}
            >
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
                    {COLUMNS.map((column) => (
                      visibleColumns.includes(column.id) && (
                        <TableCell 
                          key={column.id} 
                          align={column.numeric ? 'right' : 'left'}
                          sx={{ 
                            padding: { xs: '2px 2px', sm: '10px 20px' }, // Match table head padding
                            fontSize: { xs: '0.65rem', sm: '1rem' }, // Match table head font size
                            whiteSpace: { xs: 'normal', sm: 'nowrap' },
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            width: { 
                              xs: column.id === 'date' ? '25%' : 
                                  column.id === 'open' ? '25%' : 
                                  column.id === 'close' ? '25%' : 
                                  column.id === 'changePercent' ? '25%' : 'auto',
                              sm: 'auto' 
                            }
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
    </Box>
  );
};

export default StockTable; 