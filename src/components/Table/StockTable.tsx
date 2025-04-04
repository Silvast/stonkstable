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
  AccordionDetails,
  Autocomplete
} from '@mui/material';
import { visuallyHidden } from '@mui/utils';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { Dayjs } from 'dayjs';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SearchIcon from '@mui/icons-material/Search';


import { 
  Order, 
  StockData, 
  COLUMNS, 
  getComparator, 
  stableSort, 
  renderCellContent,
  fetchStockDataFromApi
} from '../../utils/stockTable';

// Import stock lists
import heStocks from '../../assets/he.json';
import usStocks from '../../assets/us.json';
import lseStocks from '../../assets/lse.json';

// Define a type for the stock entries
interface StockEntry {
  Code: string;
  Name: string;
  Country: string;
  Exchange: string;
  Currency: string;
  Type: string;
  Isin: string | null;
}

type ColumnId = keyof StockData | 'changePercent' | 'prevDayChangePercent';

const StockTable = () => {
  const theme = useTheme();
  const isXsScreen = useMediaQuery(theme.breakpoints.down('sm')); 
  const isSmScreen = useMediaQuery(theme.breakpoints.between('sm', 'md')); 
  const isMdScreen = useMediaQuery(theme.breakpoints.between('md', 'lg')); 

  
  const [formExpanded, setFormExpanded] = useState(!isXsScreen); 

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
  const [orderBy, setOrderBy] = useState<ColumnId>('date');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const [symbol, setSymbol] = useState<string>('AAPL');
  const [stockExchange, setStockExchange] = useState<string>('US');
  const [apiKey, setApiKey] = useState<string>('');
  const [startDate, setStartDate] = useState<Dayjs | null>(dayjs().subtract(20, 'day'));
  const [endDate, setEndDate] = useState<Dayjs | null>(dayjs().subtract(1, 'day'));
  const [stockOptions, setStockOptions] = useState<StockEntry[]>(usStocks as StockEntry[]);
  const [selectedStock, setSelectedStock] = useState<StockEntry | null>(() => {
    const defaultStock = (usStocks as StockEntry[]).find(stock => stock.Code === 'AAPL');
    return defaultStock || null;
  });

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const apiKeyParam = urlParams.get('apikey');
    
    if (apiKeyParam) {
      setApiKey(apiKeyParam);
    }
  }, []);

  // Update stock options when exchange changes
  useEffect(() => {
    let stockList: StockEntry[] = [];
    
    if (stockExchange === 'US') {
      stockList = usStocks as StockEntry[];
    } else if (stockExchange === 'HE') {
      stockList = heStocks as StockEntry[];
    } else if (stockExchange === 'LSE') {
      stockList = lseStocks as StockEntry[];
    }
    
    setStockOptions(stockList);
    
    // Find the currently selected stock in the new list if possible
    const found = stockList.find(stock => stock.Code === symbol);
    setSelectedStock(found || null);
    
  }, [stockExchange, symbol]);

  const fetchStockData = async () => {
    if (!startDate || !endDate) {
      setError('Please select a valid date range');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const result = await fetchStockDataFromApi(
        symbol,
        stockExchange,
        startDate,
        endDate,
        apiKey
      );
      
      setData(result.data);
      setError(result.error);
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
    property: ColumnId
  ) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleStockChange = (_event: React.SyntheticEvent, newValue: StockEntry | null) => {
    setSelectedStock(newValue);
    if (newValue) {
      setSymbol(newValue.Code);
    }
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
    () => stableSort(data, getComparator(order, orderBy, data)),
    [data, order, orderBy],
  );

  const EnhancedTableHead: React.FC<{
    onRequestSort: (event: React.MouseEvent<unknown>, property: ColumnId) => void;
    order: Order;
    orderBy: ColumnId;
    visibleColumns: string[];
  }> = ({ order, orderBy, onRequestSort, visibleColumns }) => {
    const createSortHandler = (property: ColumnId) => (event: React.MouseEvent<unknown>) => {
      onRequestSort(event, property);
    };

    return (
      <TableHead>
        <TableRow>
          {COLUMNS.map((column) => (
            visibleColumns.includes(column.id) && (
              <TableCell
                key={column.id}
                align='left'
                sortDirection={orderBy === column.id ? order : false}
                sx={{ 
                  padding: { xs: '4px 4px', sm: '10px 20px' }, 
                  fontSize: { xs: '0.8rem', sm: '1rem' }, 
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
                      fontSize: { xs: '0.9rem', sm: '1rem' }  
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
      mx: 'auto' 
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
                fontSize: { xs: '0.9rem', sm: 'inherit' }
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
                  <Autocomplete
                    id="stock-symbol-autocomplete"
                    options={stockOptions}
                    getOptionLabel={(option) => `${option.Name} (${option.Code})`}
                    value={selectedStock}
                    onChange={handleStockChange}
                    isOptionEqualToValue={(option, value) => option.Code === value.Code}
                    filterOptions={(options, state) => {
                      const inputValue = state.inputValue.toLowerCase();
                      return options.filter(option => 
                        option.Name.toLowerCase().includes(inputValue) || 
                        option.Code.toLowerCase().includes(inputValue)
                      );
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Stock Symbol"
                        variant="outlined"
                        size="small"
                        aria-label="Search for a stock by name or symbol"
                        sx={{ 
                          flexGrow: 1, 
                          minWidth: 80,
                          '& .MuiInputLabel-root': {
                            fontSize: { xs: '0.9rem', sm: 'inherit' }
                          },
                          '& .MuiInputBase-input': {
                            fontSize: { xs: '0.9rem', sm: 'inherit' }
                          }
                        }}
                      />
                    )}
                    sx={{ flexGrow: 1 }}
                    loading={loading}
                    loadingText="Loading stocks..."
                    noOptionsText="No stocks found"
                  />
                  
                  <FormControl 
                    size="small" 
                    sx={{ 
                      width: { xs: 110, sm: 120 },
                      '& .MuiInputLabel-root': {
                        fontSize: { xs: '0.9rem', sm: 'inherit' }
                      },
                      '& .MuiSelect-select': {
                        fontSize: { xs: '0.9rem', sm: 'inherit' }
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
                      fontSize: { xs: '0.9rem', sm: 'inherit' }
                    },
                    '& .MuiInputBase-input': {
                      fontSize: { xs: '0.9rem', sm: 'inherit' }
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
                              fontSize: { xs: '0.9rem', sm: 'inherit' }
                            },
                            '& .MuiInputBase-input': {
                              fontSize: { xs: '0.9rem', sm: 'inherit' }
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
                              fontSize: { xs: '0.9rem', sm: 'inherit' }
                            },
                            '& .MuiInputBase-input': {
                              fontSize: { xs: '0.9rem', sm: 'inherit' }
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
                    fontSize: { xs: '0.9rem', sm: 'inherit' }
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
                  padding: { xs: '4px 4px', sm: '10px 20px' }, 
                  fontSize: { xs: '0.8rem', sm: '1rem' }, 
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
                          align='left'
                          sx={{ 
                            padding: { xs: '4px 4px', sm: '10px 20px' }, 
                            fontSize: { xs: '0.8rem', sm: '1rem' }, 
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
                          {renderCellContent(row, column, data)}
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