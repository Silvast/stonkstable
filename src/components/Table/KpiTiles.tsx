import { Box, Typography } from '@mui/material';
import { PriceSummary, formatVolume } from '../../utils/priceStats';
import { mono, tokens } from '../../theme';

const changeColor = (value: number) => (value > 0 ? tokens.up : value < 0 ? tokens.down : tokens.text);

const KpiTiles = ({ summary }: { summary: PriceSummary }) => {
  const tiles = [
    {
      label: 'Period change',
      value: `${summary.periodChangePercent > 0 ? '+' : ''}${summary.periodChangePercent.toFixed(2)}%`,
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
        </Box>
      ))}
    </Box>
  );
};

export default KpiTiles;
