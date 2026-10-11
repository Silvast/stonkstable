import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  IconButton,
  LinearProgress,
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
import DesktopWindowsOutlinedIcon from '@mui/icons-material/DesktopWindowsOutlined';
import CheckIcon from '@mui/icons-material/Check';
import dayjs from 'dayjs';
import { ExchangeCode, useStockSelection } from '../context/StockSelectionContext';
import { useFavourites } from '../context/FavouritesContext';
import { useAuth } from '../context/AuthContext';
import { FavouriteStock, favouriteId } from '../utils/favouritesStorage';
import { BiasShortLabel, FavouriteSnapshot, favouriteSnapshot } from '../utils/favouriteSnapshot';
import { Order, stableSort } from '../utils/stockTable';
import Panel from '../components/common/Panel';
import SegmentedControl from '../components/common/SegmentedControl';
import { CodeChip, ToneChip, Tone } from '../components/common/Chips';
import { mono, tokens } from '../theme';

type Page = 'stock-table' | 'analysis';
type SortKey = 'name' | 'exchange' | 'addedAt';
type ExchangeFilter = 'All' | ExchangeCode;

interface FavouritesProps {
  onOpen: (page: Page) => void;
}

const EXCHANGES: ExchangeCode[] = ['US', 'HE', 'LSE'];
const BIAS_TONES: Record<BiasShortLabel, Tone> = { Long: 'up', Short: 'down', Aside: 'neutral' };
const FLAT = '#7A8494';

const compareBy = (order: Order, orderBy: SortKey) => (a: FavouriteStock, b: FavouriteStock) => {
  const result = a[orderBy].localeCompare(b[orderBy]);
  return order === 'asc' ? result : -result;
};

const changeColour = (value: number) => (value > 0 ? tokens.up : value < 0 ? tokens.down : FLAT);

const Dash = () => <Box component="span" sx={{ color: tokens.textSecondary }}>—</Box>;

const Sparkline = ({ code, snapshot }: { code: string; snapshot: FavouriteSnapshot | null }) => {
  const closes = snapshot?.closes ?? [];
  if (!snapshot || closes.length < 2) {
    return (
      <svg viewBox="0 0 120 32" width="120" height="32" role="img" aria-label="Not loaded yet">
        <path d="M2 16 L118 16" fill="none" stroke={FLAT} strokeWidth="1.75" />
      </svg>
    );
  }
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const path = closes
    .map((close, i) => `${i ? 'L' : 'M'}${(2 + (i * 116) / (closes.length - 1)).toFixed(1)} ${(3 + ((max - close) / (max - min || 1)) * 26).toFixed(1)}`)
    .join(' ');
  return (
    <svg viewBox="0 0 120 32" width="120" height="32" role="img" aria-label={`20-day closing prices for ${code}`}>
      <path d={path} fill="none" stroke={changeColour(snapshot.changePercent)} strokeWidth="1.75" strokeLinejoin="round" />
    </svg>
  );
};

const StatusChip = ({ synced }: { synced: boolean }) => (
  <Box
    component="span"
    sx={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 0.75,
      px: 1.25,
      py: '3px',
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 500,
      bgcolor: synced ? tokens.upTint : tokens.warningTint,
      color: synced ? tokens.upOnTint : tokens.warningOnTint,
    }}
  >
    {synced ? <CheckIcon sx={{ fontSize: 13 }} /> : <DesktopWindowsOutlinedIcon sx={{ fontSize: 13 }} />}
    {synced ? 'Synced to your account' : 'Saved in this browser only'}
  </Box>
);

const OpenButton = ({ label, icon, onClick }: { label: string; icon: React.ReactNode; onClick: () => void }) => (
  <Tooltip title={label}>
    <IconButton aria-label={label} onClick={onClick} sx={{ width: 40, height: 40, border: `1px solid ${tokens.border}`, color: tokens.textIdle }}>
      {icon}
    </IconButton>
  </Tooltip>
);

const Favourites = ({ onOpen }: FavouritesProps): React.ReactElement => {
  const theme = useTheme();
  const isXsScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const { setExchange, setSymbol } = useStockSelection();
  const { favourites, removeFavourite, restoreFavourite, syncing, syncError, clearSyncError } = useFavourites();
  const { status, openSignIn } = useAuth();
  const [order, setOrder] = useState<Order>('desc');
  const [orderBy, setOrderBy] = useState<SortKey>('addedAt');
  const [filter, setFilter] = useState<ExchangeFilter>('All');
  const [removed, setRemoved] = useState<FavouriteStock | null>(null);

  const exchanges = EXCHANGES.filter(code => favourites.some(fav => fav.exchange === code));
  const activeFilter: ExchangeFilter = filter !== 'All' && exchanges.includes(filter) ? filter : 'All';

  const snapshots = useMemo(
    () => new Map(favourites.map(fav => [favouriteId(fav.code, fav.exchange), favouriteSnapshot(fav)])),
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

  const sortHeader = (id: SortKey, label: string) => (
    <TableCell sortDirection={orderBy === id ? order : false}>
      <TableSortLabel active={orderBy === id} direction={orderBy === id ? order : 'asc'} onClick={() => handleSort(id)}>
        {label}
      </TableSortLabel>
    </TableCell>
  );

  return (
    <Stack spacing={2}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <Typography variant="h1">Favourites</Typography>
          <StatusChip synced={status === 'signedIn'} />
        </Box>
        {exchanges.length >= 2 && (
          <SegmentedControl label="Exchange" options={['All', ...exchanges] as ExchangeFilter[]} value={activeFilter} onChange={setFilter} />
        )}
      </Box>

      {syncing && <LinearProgress aria-label="Syncing favourites" />}

      <Panel sx={{ overflow: 'hidden' }}>
        {favourites.length === 0 ? (
          <Stack alignItems="center" spacing={1} sx={{ py: 6, px: 2, textAlign: 'center' }}>
            <StarBorderIcon sx={{ fontSize: 40, color: 'text.secondary' }} />
            <Typography variant="body1" sx={{ fontWeight: 500 }}>No favourites yet</Typography>
            <Typography variant="body2" color="text.secondary">
              Tap the ☆ next to any stock to keep it here.
            </Typography>
            <Button variant="contained" onClick={() => onOpen('stock-table')} sx={{ mt: 1 }}>
              Go to Stock Table
            </Button>
          </Stack>
        ) : (
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table
              size="small"
              aria-label="Favourite stocks"
              sx={{
                '& .MuiTableCell-root': { borderBottom: `1px solid ${tokens.rowLine}`, px: 1.25, py: 0.75 },
                '& .MuiTableCell-head': {
                  bgcolor: tokens.tableHeader,
                  borderBottom: `1px solid ${tokens.border}`,
                  fontSize: 12,
                  fontWeight: 600,
                  color: tokens.textSecondary,
                  whiteSpace: 'nowrap',
                },
              }}
            >
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox"><Box component="span" sx={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Favourite</Box></TableCell>
                  {sortHeader('name', 'Stock')}
                  {!isXsScreen && sortHeader('exchange', 'Exch.')}
                  {!isXsScreen && <TableCell>20 days</TableCell>}
                  {!isXsScreen && <TableCell align="right">Last close</TableCell>}
                  <TableCell align="right">Day</TableCell>
                  {!isXsScreen && <TableCell>Bias</TableCell>}
                  {!isXsScreen && sortHeader('addedAt', 'Added')}
                  <TableCell align="right">Open</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map(fav => {
                  const snapshot = snapshots.get(favouriteId(fav.code, fav.exchange)) ?? null;
                  return (
                    <TableRow key={favouriteId(fav.code, fav.exchange)}>
                      <TableCell padding="checkbox">
                        <Tooltip title="Remove from favourites">
                          <IconButton
                            aria-label={`Remove ${fav.code} from favourites`}
                            aria-pressed
                            onClick={() => remove(fav)}
                            sx={{ width: 40, height: 40 }}
                          >
                            <StarIcon fontSize="small" sx={{ color: tokens.star }} />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                      <TableCell sx={{ lineHeight: 1.25 }}>
                        <Box sx={{ ...mono, fontWeight: 500 }}>{fav.code}</Box>
                        <Box sx={{ fontSize: 12, color: tokens.textSecondary }}>
                          {isXsScreen ? `${fav.name} · ${fav.exchange}` : `${fav.name} · ${fav.currency}`}
                        </Box>
                      </TableCell>
                      {!isXsScreen && <TableCell><CodeChip>{fav.exchange}</CodeChip></TableCell>}
                      {!isXsScreen && <TableCell><Sparkline code={fav.code} snapshot={snapshot} /></TableCell>}
                      {!isXsScreen && (
                        <TableCell align="right" sx={{ ...mono, fontSize: 13, fontWeight: 500 }}>
                          {snapshot ? snapshot.close.toFixed(2) : <Dash />}
                        </TableCell>
                      )}
                      <TableCell align="right" sx={{ ...mono, fontSize: 13, fontWeight: 500, color: snapshot ? changeColour(snapshot.changePercent) : undefined }}>
                        {snapshot ? `${snapshot.changePercent > 0 ? '+' : ''}${snapshot.changePercent.toFixed(2)}%` : <Dash />}
                      </TableCell>
                      {!isXsScreen && (
                        <TableCell>
                          {snapshot ? <ToneChip tone={BIAS_TONES[snapshot.bias]} sx={{ fontSize: 11, px: 0.75, py: '1px', borderRadius: '5px' }}>{snapshot.bias}</ToneChip> : <Dash />}
                        </TableCell>
                      )}
                      {!isXsScreen && (
                        <TableCell sx={{ fontSize: 13, color: tokens.textSecondary, whiteSpace: 'nowrap' }}>
                          {dayjs(fav.addedAt).format('D MMM YYYY')}
                        </TableCell>
                      )}
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          <OpenButton label={`Show ${fav.code} in Stock Table`} icon={<TableChartOutlinedIcon fontSize="small" />} onClick={() => open(fav, 'stock-table')} />
                          <OpenButton label={`Analyse ${fav.code}`} icon={<InsightsOutlinedIcon fontSize="small" />} onClick={() => open(fav, 'analysis')} />
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Panel>

      {status === 'signedOut' && (
        <Panel sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 1.5, px: 2.5, py: 2, borderStyle: 'dashed', borderColor: '#C9D1DB' }}>
          <Box>
            <Typography sx={{ fontWeight: 600 }}>Keep your favourites on every device</Typography>
            <Typography variant="body2" color="text.secondary">
              Sign in with email and your list syncs. Signed out, everything keeps working in this browser.
            </Typography>
          </Box>
          <Button
            variant="contained"
            onClick={openSignIn}
            sx={{ minHeight: 44, px: 2.25, fontWeight: 600, bgcolor: tokens.ink, '&:hover': { bgcolor: '#000000' } }}
          >
            Sign in
          </Button>
        </Panel>
      )}

      <Snackbar
        open={removed !== null}
        autoHideDuration={5000}
        onClose={handleSnackbarClose}
        message={removed ? `Removed ${removed.name}` : ''}
        action={<Button color="primary" size="small" onClick={undo}>Undo</Button>}
      />
      <Snackbar
        open={syncError !== null}
        autoHideDuration={6000}
        onClose={(_event, reason) => {
          if (reason !== 'clickaway') clearSyncError();
        }}
        message={syncError ?? ''}
        action={<Button color="primary" size="small" onClick={clearSyncError}>Dismiss</Button>}
      />
    </Stack>
  );
};

export default Favourites;
