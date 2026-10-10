import { Chip, Stack, Typography } from '@mui/material';
import AnalysisCard from './AnalysisCard';
import { AnalysisResult } from '../../utils/analysis';

const CHIP_COLORS = {
  'Leaning long': 'success',
  'Leaning short': 'error',
  'Stand aside': 'default',
} as const;

const BiasCard = ({ bias }: { bias: AnalysisResult['bias'] }) => (
  <AnalysisCard title="Bias">
    <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
      <Chip label={bias.label} color={CHIP_COLORS[bias.label]} sx={{ fontSize: '1.1rem', height: 40, px: 1 }} />
      <Typography variant="body2" color="text.secondary">
        {`Score ${bias.score > 0 ? '+' : ''}${bias.score}`}
      </Typography>
    </Stack>
    <Typography component="ul" variant="body2" sx={{ m: 0, pl: 3 }}>
      {bias.reasons.map(reason => <li key={reason}>{reason}</li>)}
    </Typography>
  </AnalysisCard>
);

export default BiasCard;
