import { Box, Typography } from '@mui/material';
import AnalysisCard from './AnalysisCard';
import { ToneChip, Tone } from '../common/Chips';
import { AnalysisResult, ANALYSIS_THRESHOLDS } from '../../utils/analysis';
import { mono, tokens } from '../../theme';

const LABEL_TONES: Record<NonNullable<AnalysisResult['rsi']>['label'], Tone> = {
  Oversold: 'up',
  Neutral: 'neutral',
  Overbought: 'down',
};

const band = (value: number) => {
  if (value < ANALYSIS_THRESHOLDS.rsiOversold) return `below the ${ANALYSIS_THRESHOLDS.rsiOversold} band`;
  if (value > ANALYSIS_THRESHOLDS.rsiOverbought) return `above the ${ANALYSIS_THRESHOLDS.rsiOverbought} band`;
  return `between the ${ANALYSIS_THRESHOLDS.rsiOversold} and ${ANALYSIS_THRESHOLDS.rsiOverbought} bands`;
};

const explanation = (rsi: NonNullable<AnalysisResult['rsi']>) => {
  if (rsi.label === 'Overbought') return 'Momentum is stretched to the upside.';
  if (rsi.label === 'Oversold') return 'Momentum is stretched to the downside.';
  return rsi.value >= rsi.previous
    ? 'Momentum is rising but has room before overbought.'
    : 'Momentum is easing but not yet oversold.';
};

const RsiCard = ({ rsi }: { rsi: AnalysisResult['rsi'] }) => {
  if (rsi === null) {
    return (
      <AnalysisCard title="RSI (14)">
        <Typography variant="body1" color="text.secondary">Not enough data</Typography>
      </AnalysisCard>
    );
  }

  const rising = rsi.value >= rsi.previous;
  const marker = Math.max(0, Math.min(100, rsi.value)) * 3;
  const low = ANALYSIS_THRESHOLDS.rsiOversold * 3;
  const high = ANALYSIS_THRESHOLDS.rsiOverbought * 3;

  return (
    <AnalysisCard title="RSI (14)" action={<ToneChip tone={LABEL_TONES[rsi.label]}>{rsi.label}</ToneChip>}>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.25 }}>
        <Box component="span" sx={{ ...mono, fontSize: 34, fontWeight: 500 }}>{rsi.value.toFixed(1)}</Box>
        <Typography component="span" variant="body2" sx={{ color: rising ? tokens.up : tokens.down }}>
          {`${rising ? '↑' : '↓'} from ${rsi.previous.toFixed(1)}`}
        </Typography>
      </Box>
      <svg viewBox="0 0 300 40" width="100%" role="img" aria-label={`RSI ${rsi.value.toFixed(1)}, ${band(rsi.value)}`} style={{ display: 'block', marginTop: 10 }}>
        <rect x="0" y="10" width={low} height="10" rx="3" fill="#CBE8D8" />
        <rect x={low} y="10" width={high - low} height="10" fill={tokens.segmentGround} />
        <rect x={high} y="10" width={300 - high} height="10" rx="3" fill="#F6D8D1" />
        <path d={`M${marker} 10 L${marker - 6} 4 L${marker + 6} 4 Z`} fill={tokens.ink} />
        <line x1={marker} y1="8" x2={marker} y2="22" stroke={tokens.ink} strokeWidth="2" />
        <text x={low} y="36" fontSize="11" fill={tokens.textSecondary} textAnchor="middle" fontFamily={tokens.fontMono}>{ANALYSIS_THRESHOLDS.rsiOversold}</text>
        <text x={high} y="36" fontSize="11" fill={tokens.textSecondary} textAnchor="middle" fontFamily={tokens.fontMono}>{ANALYSIS_THRESHOLDS.rsiOverbought}</text>
      </svg>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1.25 }}>{explanation(rsi)}</Typography>
    </AnalysisCard>
  );
};

export default RsiCard;
