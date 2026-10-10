import { Chip, Stack, Typography } from '@mui/material';
import AnalysisCard from './AnalysisCard';
import { AnalysisResult } from '../../utils/analysis';
import { changeColor, formatPercent } from './format';

const streakText = (streak: number): string => {
  if (streak === 0) return 'Unchanged last close';
  const days = Math.abs(streak);
  const direction = streak > 0 ? 'up' : 'down';
  return days === 1 ? `1 ${direction} day` : `${days} ${direction} days in a row`;
};

const TrendCard = ({ trend }: { trend: AnalysisResult['trend'] }) => (
  <AnalysisCard title="Trend">
    <Stack spacing={0.5}>
      <Chip size="small" label={trend.label} sx={{ alignSelf: 'flex-start' }} />
      <Typography variant="body2" sx={{ color: changeColor(trend.vsSma20Pct) }}>
        {`${formatPercent(trend.vsSma20Pct)} vs SMA20`}
      </Typography>
      <Typography variant="body2" sx={{ color: changeColor(trend.vsSma50Pct) }}>
        {`${formatPercent(trend.vsSma50Pct)} vs SMA50`}
      </Typography>
      <Typography variant="body2" color="text.secondary">{streakText(trend.streak)}</Typography>
    </Stack>
  </AnalysisCard>
);

export default TrendCard;
