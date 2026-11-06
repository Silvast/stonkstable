import { Box, Typography } from '@mui/material';
import dayjs from 'dayjs';
import { PriceSummary, formatVolume } from '../../utils/priceStats';
import { LiveQuote } from '../../utils/liveQuote';
import { mono, tokens } from '../../theme';

const changeColor = (value: number) => (value > 0 ? tokens.up : value < 0 ? tokens.down : tokens.text);
const signed = (value: number) => `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;

const quoteTime = (timestamp: number | null) => {
  if (timestamp === null) return null;
  const time = dayjs.unix(timestamp);
  return time.isSame(dayjs(), 'day') ? time.format('HH:mm') : time.format('D MMM HH:mm');
};

interface Tile {
  label: string;
  value: string;
  color: string;
  detail?: { text: string; color: string };
}

const currentValueTile = (quote: LiveQuote | null | undefined): Tile => {
  if (!quote) {
    return { label: 'Current value', value: '—', color: tokens.text, detail: { text: 'Not available', color: tokens.textSecondary } };
  }
  const time = quoteTime(quote.timestamp);
  const parts = [quote.changePercent !== null ? signed(quote.changePercent) : null, time ? `at ${time}` : null].filter(Boolean);
  return {
    label: 'Current value',
    value: quote.price.toFixed(2),
    color: tokens.text,
    detail: {
      text: parts.length > 0 ? parts.join(' ') : 'Delayed ~15 min',
      color: quote.changePercent !== null ? changeColor(quote.changePercent) : tokens.textSecondary,
    },
  };
};

const KpiTiles = ({ summary, quote }: { summary: PriceSummary; quote?: LiveQuote | null }) => {
  const tiles: Tile[] = [
    currentValueTile(quote),
    {
      label: 'Period change',
      value: signed(summary.periodChangePercent),
      color: changeColor(summary.periodChangePercent),
    },
    { label: '42-day high', value: summary.high.toFixed(2), color: tokens.text },
    { label: '42-day low', value: summary.low.toFixed(2), color: tokens.text },
    { label: 'Avg. volume', value: formatVolume(Math.round(summary.averageVolume)), color: tokens.text },
    { label: 'Up days', value: `${summary.upDays} / ${summary.days}`, color: tokens.text },
  ];

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 1.5 }}>
      {tiles.map(tile => (
        <Box key={tile.label} sx={{ px: 2, py: 1.75, bgcolor: tokens.panel, border: `1px solid ${tokens.border}`, borderRadius: '12px' }}>
          <Typography variant="caption" component="div" color="text.secondary">{tile.label}</Typography>
          <Box sx={{ ...mono, mt: 0.5, fontSize: 20, fontWeight: 500, color: tile.color }}>{tile.value}</Box>
          {tile.detail && (
            <Box sx={{ ...mono, mt: 0.25, fontSize: 12, color: tile.detail.color }}>{tile.detail.text}</Box>
          )}
        </Box>
      ))}
    </Box>
  );
};

export default KpiTiles;
