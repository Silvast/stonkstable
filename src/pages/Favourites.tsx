import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  IconButton,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import dayjs from 'dayjs';
import { ExchangeCode, useStockSelection } from '../context/StockSelectionContext';
import { useFavourites } from '../context/FavouritesContext';
import { FavouriteStock, favouriteId } from '../utils/favouritesStorage';
import { readCache } from '../utils/analysisCache';
import { buildAnalysis } from '../utils/analysis';
import { Order, stableSort } from '../utils/stockTable';
import { changeColor, formatPercent, formatPrice } from '../components/Analysis/format';

type Page = 'stock-table' | 'analysis';
type SortKey = 'name' | 'exchange' | 'addedAt';
type ExchangeFilter = 'All' | ExchangeCode;

interface FavouritesProps {
  onOpen: (page: Page) => void;
}

interface LastClose {
  close: number;
  changePercent: number;
  date: string;
}

const EXCHANGES: ExchangeCode[] = ['US', 'HE', 'LSE'];

const SORTABLE: { id: SortKey; label: string }[] = [
  { id: 'name', label: 'Name' },
  { id: 'exchange', label: 'Exchange' },
  { id: 'addedAt', label: 'Added' },
];

const lastCloseFromCache = (fav: FavouriteStock): LastClose | null => {
  const cached = readCache(fav.code, fav.exchange);
  if (!cached || cached.eod.length === 0) return null;
  const { lastClose, dayChangePercent, asOf } = buildAnalysis(cached.eod, cached.news);
  return { close: lastClose, changePercent: dayChangePercent, date: asOf };
};

const compareBy = (order: Order, orderBy: SortKey) => (a: FavouriteStock, b: FavouriteStock) => {
  const result = a[orderBy].localeCompare(b[orderBy]);
  return order === 'asc' ? result : -result;
};

const Favourites = ({ onOpen }: FavouritesProps): React.ReactElement => {
  const theme = useTheme();
  const isXsScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const { setExchange, setSymbol } = useStockSelection();
  const { favourites, removeFavourite, restoreFavourite } = useFavourites();
  const [order, setOrder] = useState<Order>('desc');
  const [orderBy, setOrderBy] = useState<SortKey>('addedAt');
  const [filter, setFilter] = useState<ExchangeFilter>('All');
  const [removed, setRemoved] = useState<FavouriteStock | null>(null);

  const exchanges = EXCHANGES.filter(code => favourites.some(fav => fav.exchange === code));
  const activeFilter: ExchangeFilter = filter !== 'All' && exchanges.includes(filter) ? filter : 'All';

  const lastCloses = useMemo(
    () => new Map(favourites.map(fav => [favouriteId(fav.code, fav.exchange), lastCloseFromCache(fav)])),
    [favourites]
  );

  const rows = useMemo(() => {
    const visible = favourites.filter(fav => activeFilter === 'All' || fav.exchange === activeFilter);
    return stableSort(visible, compareBy(order, orderBy));
  }, [favourites, activeFilter, order, orderBy]);

  const handleSort = (key: SortKey) => {
    const isAsc = orderBy === key && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(key);
  };

  const open = (fav: FavouriteStock, page: Page) => {
    setExchange(fav.exchange);
    setSymbol(fav.code);
    onOpen(page);
  };

  const remove = (fav: FavouriteStock) => {
    removeFavourite(fav.code, fav.exchange);
    setRemoved(fav);
  };

  const undo = () => {
    if (removed) restoreFavourite(removed);
    setRemoved(null);
  };

  const handleSnackbarClose = (_event: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') return;
    setRemoved(null);
  };

  const renderActions = (fav: FavouriteStock) => {
    const tableLabel = `Show ${fav.code} in Stock Table`;
    const analyzeLabel = `Analyze ${fav.code}`;

    if (isXsScreen) {
      return (
        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
          <Tooltip title="Stock Table">
            <IconButton size="small" aria-label={tableLabel} onClick={() => open(fav, 'stock-table')}>
              <TableChartOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Analyze">
            <IconButton size="small" aria-label={analyzeLabel} onClick={() => open(fav, 'analysis')}>
              <InsightsOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      );
    }

    return (
      <Stack direction="row" spacing={1}>
        <Button
          variant="outlined"
          size="small"
          startIcon={<TableChartOutlinedIcon />}
          aria-label={tableLabel}
          onClick={() => open(fav, 'stock-table')}
          sx={{ textTransform: 'none' }}
        >
          Table
        </Button>
        <Button
          variant="outlined"
          size="small"
          startIcon={<InsightsOutlinedIcon />}
          aria-label={analyzeLabel}
          onClick={() => open(fav, 'analysis')}
          sx={{ textTransform: 'none' }}
        >
          Analyze
        </Button>
      </Stack>
    );
  };

  const renderLastClose = (fav: FavouriteStock) => {
    const last = lastCloses.get(favouriteId(fav.code, fav.exchange));
    if (!last) return <Typography variant="body2" color="text.secondary">—</Typography>;
    return (
      <Stack>
        <Typography variant="body2">{formatPrice(last.close)}</Typography>
        <Typography variant="caption" sx={{ color: changeColor(last.changePercent) }}>
          {formatPercent(last.changePercent)}
        </Typography>
        <Typography variant="caption" color="text.secondary">{dayjs(last.date).format('D MMM')}</Typography>
      </Stack>
    );
  };

  const sortHeader = (id: SortKey, label: string) => (
    <TableCell key={id} sortDirection={orderBy === id ? order : false}>
      <TableSortLabel
        active={orderBy === id}
        direction={orderBy === id ? order : 'asc'}
        onClick={() => handleSort(id)}
      >
        {label}
      </TableSortLabel>
    </TableCell>
  );

  const [nameHeader, exchangeHeader, addedHeader] = SORTABLE.map(({ id, label }) => sortHeader(id, label));

  return (
    <Box sx={{ py: { xs: 2, sm: 3 }, textAlign: 'left' }}>
      <Typography variant="h6" component="h2" sx={{ color: 'text.primary' }}>
        Favourites
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
        {`${favourites.length} ${favourites.length === 1 ? 'stock' : 'stocks'} · saved in this browser`}
      </Typography>

      {exchanges.length >= 2 && (
        <Stack direction="row" spacing={1} alignItems="center" role="group" aria-label="Exchange" sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" aria-hidden>Exchange</Typography>
          {(['All', ...exchanges] as ExchangeFilter[]).map(code => (
            <Chip
              key={code}
              label={code}
              size="small"
              color={activeFilter === code ? 'primary' : 'default'}
              variant={activeFilter === code ? 'filled' : 'outlined'}
              onClick={() => setFilter(code)}
            />
          ))}
        </Stack>
      )}

      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        {favourites.length === 0 ? (
          <Stack alignItems="center" spacing={1} sx={{ py: 6, px: 2, textAlign: 'center' }}>
            <StarBorderIcon sx={{ fontSize: 40, color: 'text.secondary' }} />
            <Typography variant="body1">No favourites yet</Typography>
            <Typography variant="body2" color="text.secondary">
              Tap the ☆ next to any stock to keep it here.
            </Typography>
            <Button variant="contained" onClick={() => onOpen('stock-table')} sx={{ mt: 1 }}>
              Go to Stock Table
            </Button>
          </Stack>
        ) : (
          <TableContainer>
            <Table
              stickyHeader
              size="small"
              aria-label="Favourite stocks"
              sx={{
                '& .MuiTableCell-head': { fontWeight: 'bold' },
                '& .MuiTableCell-root': {
                  padding: { xs: '4px 8px', sm: '10px 20px' },
                  fontSize: { xs: '0.8rem', sm: '1rem' },
                  borderBottom: '1px solid rgba(224, 224, 224, 0.3)'
                }
              }}
            >
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox" />
                  {nameHeader}
                  {!isXsScreen && <TableCell>Code</TableCell>}
                  {!isXsScreen && exchangeHeader}
                  {!isXsScreen && <TableCell>Currency</TableCell>}
                  {!isXsScreen && <TableCell>Last close</TableCell>}
                  {!isXsScreen && addedHeader}
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map(fav => (
                  <TableRow hover key={favouriteId(fav.code, fav.exchange)}>
                    <TableCell padding="checkbox">
                      <Tooltip title="Remove from favourites">
                        <IconButton
                          size="small"
                          aria-label={`Remove ${fav.code} from favourites`}
                          aria-pressed
                          onClick={() => remove(fav)}
                        >
                          <StarIcon fontSize="small" sx={{ color: 'primary.main' }} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      {isXsScreen ? (
                        <>
                          <Typography variant="body2">{fav.name}</Typography>
                          <Typography variant="caption" color="text.secondary">{`${fav.code} · ${fav.exchange}`}</Typography>
                        </>
                      ) : fav.name}
                    </TableCell>
                    {!isXsScreen && <TableCell>{fav.code}</TableCell>}
                    {!isXsScreen && <TableCell>{fav.exchange}</TableCell>}
                    {!isXsScreen && <TableCell>{fav.currency}</TableCell>}
                    {!isXsScreen && <TableCell>{renderLastClose(fav)}</TableCell>}
                    {!isXsScreen && <TableCell>{dayjs(fav.addedAt).format('D MMM YYYY')}</TableCell>}
                    <TableCell>{renderActions(fav)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Snackbar
        open={removed !== null}
        autoHideDuration={5000}
        onClose={handleSnackbarClose}
        message={removed ? `Removed ${removed.name}` : ''}
        action={<Button color="primary" size="small" onClick={undo}>Undo</Button>}
      />
    </Box>
  );
};

export default Favourites;
