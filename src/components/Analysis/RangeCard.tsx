import { Stack, Typography } from '@mui/material';
import AnalysisCard from './AnalysisCard';
import { AnalysisResult } from '../../utils/analysis';
import { DASH, changeColor, formatPercent, formatPrice } from './format';

const LEVERAGES = [3, 5, 10];

const RangeCard = ({ range }: { range: AnalysisResult['range'] }) => {
  const { atr, atrPercent } = range;

  return (
    <AnalysisCard title="Range & levels">
      <Stack spacing={0.5}>
        <Typography variant="body2">
          {atr === null || atrPercent === null ? `ATR ${DASH}` : `ATR ${formatPrice(atr)} (${atrPercent.toFixed(1)}%)`}
        </Typography>
        {atrPercent !== null && LEVERAGES.map(leverage => (
          <Typography key={leverage} variant="body2" color="text.secondary">
            {`${leverage}× certificate ≈ ±${(atrPercent * leverage).toFixed(1)}% typical day`}
          </Typography>
        ))}
        <Typography variant="body2">
          {`Prev H / L / C: ${formatPrice(range.prevHigh)} / ${formatPrice(range.prevLow)} / ${formatPrice(range.prevClose)}`}
        </Typography>
        <Typography variant="body2">
          {`20-day H / L: ${formatPrice(range.high20)} / ${formatPrice(range.low20)}`}
        </Typography>
        <Typography variant="body2">
          {`P ${formatPrice(range.pivots.p)} · R1 ${formatPrice(range.pivots.r1)} · S1 ${formatPrice(range.pivots.s1)}`}
        </Typography>
        <Typography variant="body2" sx={{ color: changeColor(range.gapPercent) }}>
          {`Gap ${formatPercent(range.gapPercent)}`}
        </Typography>
        <Typography variant="body2">
          {range.relativeVolume === null ? `Volume ${DASH}` : `Volume ${range.relativeVolume.toFixed(1)}× normal`}
        </Typography>
      </Stack>
    </AnalysisCard>
  );
};

export default RangeCard;
