import React from 'react';
import { Box, SxProps, Theme } from '@mui/material';
import { mono, tokens } from '../../theme';

export type Tone = 'up' | 'down' | 'neutral';

const TONE_COLOURS: Record<Tone, { bgcolor: string; color: string }> = {
  up: { bgcolor: tokens.upTint, color: tokens.upOnTint },
  down: { bgcolor: tokens.downTint, color: tokens.downOnTint },
  neutral: { bgcolor: tokens.neutralChip, color: tokens.textIdle },
};

export const toneOf = (value: number): Tone => (value > 0 ? 'up' : value < 0 ? 'down' : 'neutral');

interface ToneChipProps {
  tone: Tone;
  children: React.ReactNode;
  monospace?: boolean;
  sx?: SxProps<Theme>;
}

export const ToneChip = ({ tone, children, monospace = false, sx }: ToneChipProps) => (
  <Box
    component="span"
    sx={[
      {
        display: 'inline-block',
        px: 1,
        py: '2px',
        borderRadius: '6px',
        fontSize: 12,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        ...TONE_COLOURS[tone],
        ...(monospace ? { ...mono, fontWeight: 500 } : {}),
      },
      ...(Array.isArray(sx) ? sx : [sx]),
    ]}
  >
    {children}
  </Box>
);

export const CodeChip = ({ children }: { children: React.ReactNode }) => (
  <Box component="span" sx={{ ...mono, px: 1, py: '2px', borderRadius: '6px', bgcolor: tokens.neutralChip, fontSize: 12, fontWeight: 500 }}>
    {children}
  </Box>
);
