import React from 'react';
import { Box, SxProps, Theme } from '@mui/material';
import { tokens } from '../../theme';

interface PanelProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  sx?: SxProps<Theme>;
}

const Panel = ({ children, sx, ...rest }: PanelProps) => (
  <Box
    component="section"
    {...rest}
    sx={[
      { bgcolor: tokens.panel, border: `1px solid ${tokens.border}`, borderRadius: '12px' },
      ...(Array.isArray(sx) ? sx : [sx]),
    ]}
  >
    {children}
  </Box>
);

export default Panel;
