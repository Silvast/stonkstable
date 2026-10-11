import { Box, Typography } from '@mui/material';
import { ExchangeCode, StockEntry } from '../../context/StockSelectionContext';
import FavouriteToggle from '../Favourites/FavouriteToggle';
import Panel from '../common/Panel';
import { PriceSummary, formatCloseDate } from '../../utils/priceStats';
import { mono, tokens } from '../../theme';

export interface FetchedStock {
  symbol: string;
  exchange: ExchangeCode;
  stock: StockEntry | null;
}

const signed = (value: number, digits = 2) => `${value > 0 ? '+' : ''}${value.toFixed(digits)}`;

export const CodeChip = ({ children }: { children: React.ReactNode }) => (
  <Box component="span" sx={{ ...mono, px: 1, py: '2px', borderRadius: '6px', bgcolor: tokens.neutralChip, fontSize: 12, fontWeight: 500 }}>
    {children}
  </Box>
);

interface StockHeaderProps {
  fetched: FetchedStock;
  summary: PriceSummary;
}

const StockHeader = ({ fetched, summary }: StockHeaderProps) => {
  const name = fetched.stock?.Name ?? fetched.symbol;
  const up = (summary.change ?? 0) >= 0;

  return (
    <Panel
      aria-labelledby="stock-header-title"
      sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 1.5, px: 2.5, py: 2.25 }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
        <Typography variant="h1" id="stock-header-title">{name}</Typography>
        <CodeChip>{`${fetched.symbol}.${fetched.exchange}`}</CodeChip>
        {fetched.stock?.Currency && <CodeChip>{fetched.stock.Currency}</CodeChip>}
        <FavouriteToggle stock={fetched.stock} exchange={fetched.exchange} bordered />
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5, flexWrap: 'wrap' }}>
        <Box component="span" sx={{ ...mono, fontSize: 30, fontWeight: 500 }}>{summary.lastClose.toFixed(2)}</Box>
        {summary.change !== null && summary.changePercent !== null && (
          <Box
            component="span"
            sx={{
              ...mono,
              px: 1,
              py: '3px',
              borderRadius: '6px',
              fontSize: 13,
              fontWeight: 500,
              bgcolor: up ? tokens.upTint : tokens.downTint,
              color: up ? tokens.upOnTint : tokens.downOnTint,
            }}
          >
            {`${signed(summary.change)} · ${signed(summary.changePercent)}%`}
          </Box>
        )}
        <Typography component="span" variant="caption" color="text.secondary">{formatCloseDate(summary.lastDate)}</Typography>
      </Box>
    </Panel>
  );
};

export default StockHeader;
