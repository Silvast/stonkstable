import { useId } from 'react';
import { Box, Link, Typography } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import Panel from '../common/Panel';
import { CodeChip, ToneChip, toneOf } from '../common/Chips';
import { AnalysisResult, Signal } from '../../utils/analysis';
import { formatCloseDate } from '../../utils/priceStats';
import { mono, tokens } from '../../theme';

interface BiasPanelProps {
  name: string;
  code: string;
  lastClose: number;
  dayChangePercent: number;
  asOf: string;
  bias: AnalysisResult['bias'];
  signals: Signal[];
  tradingViewHref: string;
}

const PILL_COLOURS = {
  'Leaning long': { bgcolor: tokens.up, color: '#FFFFFF' },
  'Leaning short': { bgcolor: tokens.down, color: '#FFFFFF' },
  'Stand aside': { bgcolor: tokens.neutralChip, color: tokens.textIdle },
} as const;

const signedScore = (score: number) => (score > 0 ? `+${score}` : String(score));

const ScoreBar = ({ score }: { score: number }) => {
  const clamped = Math.max(-4, Math.min(4, score));
  const x = Math.max(9, Math.min(351, ((clamped + 4) / 8) * 360));
  const ring = score > 0 ? tokens.up : score < 0 ? tokens.down : tokens.textSecondary;

  return (
    <svg viewBox="0 0 360 46" width="100%" role="img" aria-label={`Bias score ${signedScore(score)} on a scale from -4 to +4`} style={{ display: 'block', maxWidth: 420 }}>
      <rect x="0" y="12" width="120" height="10" rx="5" fill="#F6D8D1" />
      <rect x="122" y="12" width="116" height="10" fill={tokens.border} />
      <rect x="240" y="12" width="120" height="10" rx="5" fill="#CBE8D8" />
      <circle cx={x} cy="17" r="9" fill="#FFFFFF" stroke={ring} strokeWidth="3" />
      <text x="0" y="42" fontSize="11" fill={tokens.textSecondary} fontFamily={tokens.fontSans}>Short</text>
      <text x="180" y="42" fontSize="11" fill={tokens.textSecondary} textAnchor="middle" fontFamily={tokens.fontSans}>Stand aside</text>
      <text x="360" y="42" fontSize="11" fill={tokens.textSecondary} textAnchor="end" fontFamily={tokens.fontSans}>Long</text>
    </svg>
  );
};

const BiasPanel = ({ name, code, lastClose, dayChangePercent, asOf, bias, signals, tradingViewHref }: BiasPanelProps) => {
  const signalsId = useId();
  const changeColour = dayChangePercent > 0 ? tokens.up : dayChangePercent < 0 ? tokens.down : tokens.textSecondary;

  return (
    <Panel sx={{ display: 'flex', flexWrap: 'wrap', gap: 2.5, p: 2.5 }}>
      <Box sx={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: 1.75 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.25 }}>
          <Typography variant="h1" sx={{ fontSize: 22 }}>{name}</Typography>
          <CodeChip>{code}</CodeChip>
          <Box component="span" sx={{ ...mono, fontSize: 15, fontWeight: 500 }}>{lastClose.toFixed(2)}</Box>
          <Box component="span" sx={{ ...mono, fontSize: 13, fontWeight: 500, color: changeColour }}>
            {`${dayChangePercent > 0 ? '+' : ''}${dayChangePercent.toFixed(2)}%`}
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.75 }}>
          <Box component="span" sx={{ px: 2, py: 1, borderRadius: '10px', fontSize: 22, fontWeight: 600, ...PILL_COLOURS[bias.label] }}>
            {bias.label}
          </Box>
          <Box component="span" sx={{ ...mono, fontSize: 22, fontWeight: 500 }}>{signedScore(bias.score)}</Box>
        </Box>
        <ScoreBar score={bias.score} />
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
          <Link
            href={tradingViewHref}
            target="_blank"
            rel="noopener noreferrer"
            underline="none"
            sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, minHeight: 40, fontWeight: 600 }}
          >
            Open in TradingView
            <OpenInNewIcon sx={{ fontSize: 14 }} />
          </Link>
          <Typography variant="caption" color="text.secondary">
            {`Daily data to ${formatCloseDate(asOf)}. Not investment advice.`}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ flex: '1 1 340px' }}>
        <Typography id={signalsId} component="h2" sx={{ fontSize: 13, fontWeight: 600, color: tokens.textSecondary, mb: 1 }}>
          Signals that fired
        </Typography>
        {signals.length === 0 ? (
          <Typography variant="body1" color="text.secondary">{bias.reasons.join(', ')}</Typography>
        ) : (
          <Box component="ul" aria-labelledby={signalsId} sx={{ listStyle: 'none', m: 0, p: 0 }}>
            {signals.map(signal => (
              <Box
                component="li"
                key={signal.rule}
                sx={{ display: 'flex', alignItems: 'center', gap: 1.25, py: 1.125, borderBottom: `1px solid ${tokens.rowLine}` }}
              >
                <ToneChip tone={toneOf(signal.score)} monospace sx={{ minWidth: 30, textAlign: 'center', px: 0 }}>
                  {signedScore(signal.score)}
                </ToneChip>
                <Box component="span" sx={{ fontWeight: 500, minWidth: 84 }}>{signal.rule}</Box>
                <Box component="span" sx={{ color: tokens.textIdle }}>{signal.text}</Box>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Panel>
  );
};

export default BiasPanel;
