import React, { useId, useState } from 'react';
import { Avatar, Box, Button, ButtonBase, IconButton, LinearProgress, Tooltip, Typography } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import KeyboardDoubleArrowLeftIcon from '@mui/icons-material/KeyboardDoubleArrowLeft';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import { useAuth } from '../../context/AuthContext';
import { useFavourites } from '../../context/FavouritesContext';
import { useStockSelection } from '../../context/StockSelectionContext';
import { ToneChip, Tone } from '../common/Chips';
import { BiasShortLabel, FavouriteSnapshot, favouriteSnapshot } from '../../utils/favouriteSnapshot';
import { DAILY_CALL_BUDGET } from '../../utils/apiUsage';
import { useApiCallsToday } from '../../hooks/useApiCallsToday';
import ApiKeyDialog from '../Account/ApiKeyDialog';
import { mono, tokens } from '../../theme';

export type Page = 'stock-table' | 'analysis' | 'favourites' | 'settings';

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  onHide?: () => void;
  hideButtonRef?: React.Ref<HTMLButtonElement>;
}

export const SIDEBAR_ID = 'app-sidebar';

export const Logo = () => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, px: 0.75 }}>
    <Box
      sx={{
        width: 32,
        height: 32,
        borderRadius: '8px',
        bgcolor: tokens.primary,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#FFFFFF',
      }}
    >
      <TrendingUpIcon fontSize="small" />
    </Box>
    <Typography component="span" sx={{ fontWeight: 600, fontSize: 17 }}>Stonkstable</Typography>
  </Box>
);

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: number;
}

const NavItem = ({ icon, label, active, onClick, badge }: NavItemProps) => (
  <ButtonBase
    onClick={onClick}
    aria-current={active ? 'page' : undefined}
    sx={{
      display: 'flex',
      justifyContent: 'flex-start',
      gap: 1.25,
      minHeight: 40,
      px: 1.25,
      borderRadius: '8px',
      fontFamily: tokens.fontSans,
      fontSize: 14,
      fontWeight: active ? 600 : 400,
      color: active ? tokens.primaryDark : tokens.textIdle,
      bgcolor: active ? tokens.primaryTint : 'transparent',
      '&:hover': { bgcolor: active ? tokens.primaryTint : tokens.ground },
      '& svg': { fontSize: 18 },
    }}
  >
    {icon}
    {label}
    {badge !== undefined && badge > 0 && (
      <Box
        component="span"
        sx={{
          ml: 'auto',
          px: '7px',
          borderRadius: '10px',
          bgcolor: active ? tokens.panel : tokens.neutralChip,
          fontSize: 12,
          color: active ? tokens.primaryDark : tokens.textIdle,
        }}
      >
        {badge}
      </Box>
    )}
  </ButtonBase>
);

const UsageMeter = () => {
  const calls = useApiCallsToday();

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
        <Box component="span" sx={{ color: tokens.textSecondary }}>API calls today</Box>
        <Box component="span" sx={mono}>{`${calls} / ${DAILY_CALL_BUDGET}`}</Box>
      </Box>
      <LinearProgress
        variant="determinate"
        value={Math.min(100, (calls / DAILY_CALL_BUDGET) * 100)}
        aria-label="API calls today"
        sx={{ height: 6, borderRadius: 3, bgcolor: tokens.neutralChip }}
      />
    </>
  );
};

const AccountCard = ({ currentPage, onNavigate }: SidebarProps) => {
  const { status, email, openSignIn } = useAuth();
  const [keyDialogOpen, setKeyDialogOpen] = useState(false);
  const onSettings = currentPage === 'settings';

  return (
    <Box
      sx={{
        mt: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 1.25,
        p: 1.5,
        border: `1px solid ${tokens.border}`,
        borderRadius: '10px',
      }}
    >
      <UsageMeter />
      {status !== 'signedIn' && (
        <>
          <Button variant="outlined" onClick={() => setKeyDialogOpen(true)} sx={{ borderRadius: '8px', fontSize: 13 }}>
            API key settings
          </Button>
          <ApiKeyDialog open={keyDialogOpen} onClose={() => setKeyDialogOpen(false)} />
        </>
      )}
      {status === 'signedOut' && (
        <Button
          variant="contained"
          onClick={openSignIn}
          sx={{ bgcolor: tokens.ink, borderRadius: '8px', fontSize: 13, '&:hover': { bgcolor: '#000000' } }}
        >
          Sign in to sync
        </Button>
      )}
      {status === 'signedIn' && (
        <ButtonBase
          onClick={() => onNavigate('settings')}
          aria-current={onSettings ? 'page' : undefined}
          sx={{
            display: 'flex',
            justifyContent: 'flex-start',
            gap: 1.25,
            minHeight: 44,
            px: 1,
            borderRadius: '8px',
            textAlign: 'left',
            color: onSettings ? tokens.primaryDark : tokens.text,
            bgcolor: onSettings ? tokens.primaryTint : 'transparent',
            '&:hover': { bgcolor: onSettings ? tokens.primaryTint : tokens.ground },
          }}
        >
          <Avatar sx={{ width: 30, height: 30, bgcolor: tokens.primary, fontSize: 13, fontWeight: 600 }}>
            {(email ?? '?').charAt(0).toUpperCase()}
          </Avatar>
          <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, lineHeight: 1.2 }}>
            <Typography
              component="span"
              sx={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              {email ?? 'Signed in'}
            </Typography>
            <Typography component="span" sx={{ fontSize: 12, color: tokens.textIdle }}>Settings</Typography>
          </Box>
        </ButtonBase>
      )}
    </Box>
  );
};

const BIAS_TONES: Record<BiasShortLabel, Tone> = { Long: 'up', Short: 'down', Aside: 'neutral' };

const Dash = () => <Box component="span" sx={{ color: tokens.textSecondary, fontSize: 12 }}>—</Box>;

const WatchlistValue = ({ page, snapshot }: { page: Page; snapshot: FavouriteSnapshot | null }) => {
  if (!snapshot) return <Dash />;
  if (page === 'analysis') {
    return (
      <ToneChip tone={BIAS_TONES[snapshot.bias]} sx={{ fontSize: 11, px: 0.75, py: '1px', borderRadius: '5px' }}>
        {snapshot.bias}
      </ToneChip>
    );
  }
  const change = snapshot.changePercent;
  return (
    <Box component="span" sx={{ ...mono, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontSize: 12, lineHeight: 1.2 }}>
      <span>{snapshot.close.toFixed(2)}</span>
      <Box component="span" sx={{ color: change > 0 ? tokens.up : change < 0 ? tokens.down : tokens.textSecondary }}>
        {`${change > 0 ? '+' : ''}${change.toFixed(2)}%`}
      </Box>
    </Box>
  );
};

const Watchlist = ({ page }: { page: Page }) => {
  const headingId = useId();
  const { favourites } = useFavourites();
  const { symbol, exchange, setExchange, setSymbol } = useStockSelection();

  if ((page !== 'stock-table' && page !== 'analysis') || favourites.length === 0) return null;

  return (
    <Box component="section" aria-labelledby={headingId}>
      <Typography
        id={headingId}
        component="h2"
        sx={{ mb: 0.75, px: 1.25, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: tokens.textSecondary }}
      >
        Watchlist
      </Typography>
      <Box component="ul" aria-labelledby={headingId} sx={{ listStyle: 'none', m: 0, p: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {favourites.map(fav => {
          const current = fav.code === symbol && fav.exchange === exchange;
          return (
            <li key={`${fav.code}.${fav.exchange}`}>
              <ButtonBase
                aria-current={current ? 'true' : undefined}
                onClick={() => {
                  setExchange(fav.exchange);
                  setSymbol(fav.code);
                }}
                sx={{
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 1,
                  minHeight: 44,
                  px: 1.25,
                  borderRadius: '8px',
                  textAlign: 'left',
                  bgcolor: current ? tokens.ground : 'transparent',
                  '&:hover': { bgcolor: tokens.ground },
                }}
              >
                <Box component="span" sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, lineHeight: 1.2 }}>
                  <Box component="span" sx={{ ...mono, fontWeight: 500, fontSize: 13 }}>{fav.code}</Box>
                  <Box component="span" sx={{ fontSize: 12, color: tokens.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {fav.name}
                  </Box>
                </Box>
                <WatchlistValue page={page} snapshot={favouriteSnapshot(fav)} />
              </ButtonBase>
            </li>
          );
        })}
      </Box>
    </Box>
  );
};

const Sidebar = ({ currentPage, onNavigate, onHide, hideButtonRef }: SidebarProps) => {
  const { favourites } = useFavourites();

  return (
    <Box
      sx={{
        width: 240,
        boxSizing: 'border-box',
        minHeight: '100%',
        bgcolor: tokens.panel,
        px: 1.75,
        py: 2.5,
        display: 'flex',
        flexDirection: 'column',
        gap: 2.75,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Logo />
        {onHide && (
          <Tooltip title="Hide sidebar">
            <IconButton
              ref={hideButtonRef}
              aria-label="Hide sidebar"
              aria-expanded
              aria-controls={SIDEBAR_ID}
              onClick={onHide}
              sx={{ width: 40, height: 40, color: tokens.textSecondary }}
            >
              <KeyboardDoubleArrowLeftIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>
      <Box component="nav" aria-label="Sections" sx={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <NavItem
          icon={<TableChartOutlinedIcon />}
          label="Stock table"
          active={currentPage === 'stock-table'}
          onClick={() => onNavigate('stock-table')}
        />
        <NavItem
          icon={<InsightsOutlinedIcon />}
          label="Analysis"
          active={currentPage === 'analysis'}
          onClick={() => onNavigate('analysis')}
        />
        <NavItem
          icon={<StarBorderIcon />}
          label="Favourites"
          active={currentPage === 'favourites'}
          onClick={() => onNavigate('favourites')}
          badge={favourites.length}
        />
      </Box>
      <Watchlist page={currentPage} />
      <AccountCard currentPage={currentPage} onNavigate={onNavigate} />
    </Box>
  );
};

export default Sidebar;
