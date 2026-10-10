import React from 'react';
import { Paper, Typography } from '@mui/material';

interface AnalysisCardProps {
  title: string;
  children: React.ReactNode;
}

const AnalysisCard = ({ title, children }: AnalysisCardProps) => (
  <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 2 }, height: '100%' }}>
    <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 600, mb: 1 }}>
      {title}
    </Typography>
    {children}
  </Paper>
);

export default AnalysisCard;
