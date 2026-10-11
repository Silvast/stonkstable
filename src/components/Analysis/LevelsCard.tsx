import { useId } from 'react';
import { Box } from '@mui/material';
import AnalysisCard from './AnalysisCard';
import { AnalysisResult } from '../../utils/analysis';
import { mono, tokens } from '../../theme';

type LevelKind = 'resistance' | 'support' | 'close' | 'neutral';

interface Level {
  name: string;
  price: number;
  kind: LevelKind;
}

const DOT_COLOURS: Record<LevelKind, string> = {
  resistance: tokens.down,
  support: tokens.up,
  close: tokens.primary,
  neutral: '#7A8494',
};

const buildLevels = (range: AnalysisResult['range'], lastClose: number): Level[] => {
  const levels: (Level | null)[] = [
    { name: 'R1 resistance', price: range.pivots.r1, kind: 'resistance' },
    { name: 'Prev. high', price: range.prevHigh, kind: 'neutral' },
    range.high20 === null ? null : { name: '20-day high', price: range.high20, kind: 'neutral' },
    { name: 'Last close', price: lastClose, kind: 'close' },
    { name: 'Pivot', price: range.pivots.p, kind: 'neutral' },
    { name: 'S1 support', price: range.pivots.s1, kind: 'support' },
    { name: 'Prev. low', price: range.prevLow, kind: 'neutral' },
  ];
  return levels.filter((level): level is Level => level !== null).sort((a, b) => b.price - a.price);
};

const LevelsCard = ({ range, lastClose }: { range: AnalysisResult['range']; lastClose: number }) => {
  const titleId = useId();
  const levels = buildLevels(range, lastClose);
  const low = Math.min(...levels.map(level => level.price));
  const high = Math.max(...levels.map(level => level.price));
  const position = (price: number) => (high === low ? 50 : ((price - low) / (high - low)) * 100);

  return (
    <AnalysisCard title="Levels to watch" titleId={titleId}>
      <Box component="ul" aria-labelledby={titleId} sx={{ listStyle: 'none', m: 0, p: 0 }}>
        {levels.map(level => {
          const isClose = level.kind === 'close';
          return (
            <Box
              component="li"
              key={level.name}
              aria-current={isClose ? 'true' : undefined}
              sx={{
                display: 'grid',
                gridTemplateColumns: '110px 64px 1fr',
                gap: 1.25,
                alignItems: 'center',
                minHeight: 32,
                px: 0.5,
                borderBottom: `1px solid ${tokens.rowLine}`,
                bgcolor: isClose ? '#F2F8F8' : 'transparent',
              }}
            >
              <Box component="span" sx={{ fontSize: 13, color: isClose ? tokens.primaryDark : tokens.textIdle, fontWeight: isClose ? 600 : 400 }}>
                {level.name}
              </Box>
              <Box component="span" sx={{ ...mono, fontSize: 13, fontWeight: 500, textAlign: 'right' }}>{level.price.toFixed(2)}</Box>
              <Box component="span" aria-hidden sx={{ position: 'relative', height: 4, borderRadius: 2, bgcolor: tokens.neutralChip, mr: 1 }}>
                <Box
                  component="span"
                  sx={{
                    position: 'absolute',
                    left: `calc(${position(level.price)}% - 5px)`,
                    top: -3,
                    width: 10,
                    height: 10,
                    borderRadius: '5px',
                    bgcolor: DOT_COLOURS[level.kind],
                  }}
                />
              </Box>
            </Box>
          );
        })}
      </Box>
    </AnalysisCard>
  );
};

export default LevelsCard;
