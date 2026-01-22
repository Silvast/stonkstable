import React from 'react';
import { Box, Typography } from '@mui/material';

const Analysis = (): React.ReactElement => {
  return (
    <Box sx={{ py: { xs: 2, sm: 3 } }}>
      <Typography variant="h6" component="h2" sx={{ mb: 1, color: 'text.primary' }}>
        Analysis
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        Content coming soon.
      </Typography>
    </Box>
  );
};

export default Analysis;

