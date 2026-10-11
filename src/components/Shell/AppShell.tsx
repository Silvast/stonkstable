import React, { useState } from 'react';
import { AppBar, Box, Drawer, IconButton, Toolbar, useMediaQuery, useTheme } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import Sidebar, { Logo, Page } from './Sidebar';
import { tokens } from '../../theme';

interface AppShellProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  children: React.ReactNode;
}

const mainSx = {
  flex: 1,
  minWidth: 0,
  boxSizing: 'border-box',
  px: { xs: 2, md: 3, lg: 4 },
  pt: { xs: 2, md: 2.5 },
  pb: 5,
} as const;

const AppShell = ({ currentPage, onNavigate, children }: AppShellProps) => {
  const theme = useTheme();
  const isNarrow = useMediaQuery(theme.breakpoints.down('md'), { noSsr: true });
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (isNarrow) {
    const navigate = (page: Page) => {
      onNavigate(page);
      setDrawerOpen(false);
    };

    return (
      <Box sx={{ minHeight: '100vh', bgcolor: tokens.ground }}>
        <AppBar
          position="sticky"
          color="inherit"
          elevation={0}
          sx={{ borderBottom: `1px solid ${tokens.border}`, bgcolor: tokens.panel }}
        >
          <Toolbar sx={{ gap: 1, minHeight: 56 }}>
            <IconButton aria-label="Open navigation" edge="start" onClick={() => setDrawerOpen(true)} sx={{ width: 44, height: 44 }}>
              <MenuIcon />
            </IconButton>
            <Logo />
          </Toolbar>
        </AppBar>
        <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
          <Sidebar currentPage={currentPage} onNavigate={navigate} />
        </Drawer>
        <Box component="main" sx={mainSx}>{children}</Box>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: tokens.ground }}>
      <Box
        component="aside"
        sx={{
          flex: '0 0 240px',
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflowY: 'auto',
          borderRight: `1px solid ${tokens.border}`,
          bgcolor: tokens.panel,
        }}
      >
        <Sidebar currentPage={currentPage} onNavigate={onNavigate} />
      </Box>
      <Box component="main" sx={mainSx}>{children}</Box>
    </Box>
  );
};

export default AppShell;
