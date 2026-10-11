import { useState } from 'react';
import { Box, Typography } from '@mui/material';
import AnalysisCard from './AnalysisCard';
import SegmentedControl from '../common/SegmentedControl';
import { AnalysisResult } from '../../utils/analysis';
import { DASH, formatPercent, formatPrice } from './format';
import { mono } from '../../theme';

const LEVERAGES = ['3×', '5×', '10×'] as const;
type Leverage = typeof LEVERAGES[number];

const TypicalDayCard = ({ range }: { range: AnalysisResult['range'] }) => {
  const [leverage, setLeverage] = useState<Leverage>('5×');
  const { atr, atrPercent, gapPercent, relativeVolume } = range;

  if (atr === null || atrPercent === null) {
    return (
      <AnalysisCard title="Typical day">
        <Typography variant="body1" color="text.secondary">Not enough data</Typography>
      </AnalysisCard>
    );
  }

  const multiplier = parseInt(leverage, 10);
  const volume = relativeVolume === null ? DASH : `${relativeVolume.toFixed(1)}× normal`;

  return (
    <AnalysisCard
      title="Typical day"
      action={<Box component="span" sx={{ ...mono, fontSize: 12, color: 'text.secondary' }}>{`ATR ${formatPrice(atr)}`}</Box>}
    >
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.25, flexWrap: 'wrap' }}>
        <Box component="span" sx={{ ...mono, fontSize: 34, fontWeight: 500 }}>{`±${(atrPercent * multiplier).toFixed(1)}%`}</Box>
        <Typography component="span" variant="body2" color="text.secondary">{`for a ${leverage} certificate`}</Typography>
      </Box>
      <Box sx={{ mt: 1.5 }}>
        <SegmentedControl label="Leverage" options={LEVERAGES} value={leverage} onChange={setLeverage} />
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
        {`The stock itself moves about ${atrPercent.toFixed(1)}% on a normal day. Gap ${formatPercent(gapPercent)}, volume ${volume}.`}
      </Typography>
    </AnalysisCard>
  );
};

export default TypicalDayCard;
