import { Box } from '@mui/material';
import AnalysisCard from './AnalysisCard';
import { ToneChip, Tone } from '../common/Chips';
import { AnalysisResult } from '../../utils/analysis';
import { formatPercent, formatPrice } from './format';
import { mono, tokens } from '../../theme';

const LABEL_TONES: Record<AnalysisResult['trend']['label'], Tone> = { Up: 'up', Down: 'down', Sideways: 'neutral' };
const SMA50_COLOUR = '#7A8494';

const streakText = (streak: number) => {
  if (streak > 0) return `${streak} up`;
  if (streak < 0) return `${-streak} down`;
  return 'Flat';
};

const changeColour = (value: number | null) =>
  value === null || value === 0 ? tokens.text : value > 0 ? tokens.up : tokens.down;

const Swatch = ({ colour, style }: { colour: string; style: 'dashed' | 'dotted' }) => (
  <Box component="span" sx={{ width: 14, borderTop: `2px ${style} ${colour}`, flexShrink: 0 }} />
);

const MiniChart = ({ trend }: { trend: AnalysisResult['trend'] }) => {
  const values = [...trend.recentCloses, trend.sma20, trend.sma50].filter((v): v is number => v !== null);
  const low = Math.min(...values);
  const high = Math.max(...values);
  const span = high - low || 1;
  const y = (price: number) => 8 + ((high - price) / span) * 94;
  const xStep = trend.recentCloses.length > 1 ? 300 / (trend.recentCloses.length - 1) : 0;
  const line = trend.recentCloses.map((close, i) => `${i ? 'L' : 'M'}${(i * xStep).toFixed(1)} ${y(close).toFixed(1)}`).join(' ');
  const label = `Recent closes against the 20-day average ${formatPrice(trend.sma20)} and the 50-day average ${formatPrice(trend.sma50)}`;

  return (
    <svg viewBox="0 0 300 110" width="100%" role="img" aria-label={label} style={{ display: 'block' }}>
      {trend.sma20 !== null && (
        <line x1="0" x2="300" y1={y(trend.sma20)} y2={y(trend.sma20)} stroke={tokens.star} strokeWidth="1.5" strokeDasharray="5 4" />
      )}
      {trend.sma50 !== null && (
        <line x1="0" x2="300" y1={y(trend.sma50)} y2={y(trend.sma50)} stroke={SMA50_COLOUR} strokeWidth="1.5" strokeDasharray="2 4" />
      )}
      {line && <path d={line} fill="none" stroke={tokens.primary} strokeWidth="2" strokeLinejoin="round" />}
    </svg>
  );
};

const Row = ({ label, value, colour }: { label: React.ReactNode; value: string; colour?: string }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, fontSize: 13 }}>
    {label}
    <Box component="span" sx={{ ...mono, color: colour }}>{value}</Box>
  </Box>
);

const TrendCard = ({ trend }: { trend: AnalysisResult['trend'] }) => (
  <AnalysisCard title="Trend" action={<ToneChip tone={LABEL_TONES[trend.label]}>{trend.label}</ToneChip>}>
    <MiniChart trend={trend} />
    <Box sx={{ display: 'grid', rowGap: 0.75, mt: 1 }}>
      <Row
        label={(
          <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Swatch colour={tokens.star} style="dashed" />
            {`vs SMA 20 · ${formatPrice(trend.sma20)}`}
          </Box>
        )}
        value={formatPercent(trend.vsSma20Pct)}
        colour={changeColour(trend.vsSma20Pct)}
      />
      <Row
        label={(
          <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Swatch colour={SMA50_COLOUR} style="dotted" />
            {`vs SMA 50 · ${formatPrice(trend.sma50)}`}
          </Box>
        )}
        value={formatPercent(trend.vsSma50Pct)}
        colour={changeColour(trend.vsSma50Pct)}
      />
      <Row label={<Box component="span" sx={{ color: tokens.textSecondary }}>Streak</Box>} value={streakText(trend.streak)} />
    </Box>
  </AnalysisCard>
);

export default TrendCard;
