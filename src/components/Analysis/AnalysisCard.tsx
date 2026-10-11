import React from 'react';
import { Box, Typography } from '@mui/material';
import Panel from '../common/Panel';

interface AnalysisCardProps {
  title: string;
  titleId?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

const AnalysisCard = ({ title, titleId, action, children }: AnalysisCardProps) => (
  <Panel sx={{ px: 2.5, py: 2.25, height: '100%', boxSizing: 'border-box' }}>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, mb: 1.25 }}>
      <Typography variant="h2" id={titleId}>{title}</Typography>
      {action}
    </Box>
    {children}
  </Panel>
);

export default AnalysisCard;
