import { Box, Chip, LinearProgress, Stack, Typography } from '@mui/material';
import AnalysisCard from './AnalysisCard';
import { AnalysisResult, ANALYSIS_THRESHOLDS } from '../../utils/analysis';

const LABEL_COLORS = {
  Oversold: 'success',
  Neutral: 'default',
  Overbought: 'error',
} as const;

const arrow = (value: number, previous: number): string => {
  if (value > previous) return '↑';
  if (value < previous) return '↓';
  return '→';
};

const Tick = ({ at }: { at: number }) => (
  <Box sx={{ position: 'absolute', left: `${at}%`, top: -2, bottom: -2, width: '1px', bgcolor: 'text.secondary' }} />
);

const RsiCard = ({ rsi }: { rsi: AnalysisResult['rsi'] }) => (
  <AnalysisCard title="RSI (14)">
    {rsi === null ? (
      <Typography variant="body2" color="text.secondary">Not enough data</Typography>
    ) : (
      <>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
          <Typography variant="h5" component="p">{rsi.value.toFixed(1)}</Typography>
          <Chip size="small" label={rsi.label} color={LABEL_COLORS[rsi.label]} />
          <Typography variant="body2" color="text.secondary">
            {`${arrow(rsi.value, rsi.previous)} from ${rsi.previous.toFixed(1)}`}
          </Typography>
        </Stack>
        <Box sx={{ position: 'relative' }}>
          <LinearProgress variant="determinate" value={rsi.value} aria-label="RSI" sx={{ height: 8, borderRadius: 1 }} />
          <Tick at={ANALYSIS_THRESHOLDS.rsiOversold} />
          <Tick at={ANALYSIS_THRESHOLDS.rsiOverbought} />
        </Box>
      </>
    )}
  </AnalysisCard>
);

export default RsiCard;
