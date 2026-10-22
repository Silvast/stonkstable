import React from 'react';
import { Box } from '@mui/material';
import { mono, tokens } from '../../theme';
import { APP_VERSION, GIT_HASH, VERSION_LABEL } from '../../version';

const Footer = (): React.ReactElement => (
  <Box
    component="footer"
    aria-label="Site footer"
    sx={{
      mt: 4,
      pt: 1.5,
      borderTop: `1px solid ${tokens.border}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 1,
      flexWrap: 'wrap',
      color: tokens.textSecondary,
      fontSize: 12,
    }}
  >
    <Box
      component="span"
      sx={{ color: tokens.textSecondary, fontSize: 12 }}
    >
      Build info
    </Box>
    <Box
      component="span"
      data-testid="app-version"
      title={`Build ${VERSION_LABEL}`}
      aria-label={`App version ${APP_VERSION}, build ${GIT_HASH}`}
      sx={{
        ...mono,
        color: tokens.textSecondary,
        fontSize: 12,
      }}
    >
      {`v${APP_VERSION} · ${GIT_HASH}`}
    </Box>
  </Box>
);

export default Footer;
