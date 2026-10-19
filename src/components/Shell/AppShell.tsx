import React, { useEffect, useRef, useState } from 'react';
import { AppBar, Box, Drawer, IconButton, Toolbar, Tooltip, useMediaQuery, useTheme } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import Sidebar, { Logo, Page, SIDEBAR_ID } from './Sidebar';
import Footer from './Footer';
import { tokens } from '../../theme';

const SIDEBAR_KEY = 'stonkstable:sidebar:v1';

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
  pb: 3,
  display: 'flex',
  flexDirection: 'column',
} as const;

const contentSx = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
} as const;

const loadHidden = (): boolean => {
  try {
    return localStorage.getItem(SIDEBAR_KEY) === 'hidden';
  } catch {
    return false;
  }
};

const saveHidden = (hidden: boolean) => {
  try {
    if (hidden) localStorage.setItem(SIDEBAR_KEY, 'hidden');
    else localStorage.removeItem(SIDEBAR_KEY);
  } catch {
    return;
  }
};

interface TopBarProps {
  label: string;
  onOpen: () => void;
  buttonRef?: React.Ref<HTMLButtonElement>;
  controls?: string;
}

const TopBar = ({ label, onOpen, buttonRef, controls }: TopBarProps) => (
  <AppBar
    position="sticky"
    color="inherit"
    elevation={0}
    sx={{ borderBottom: `1px solid ${tokens.border}`, bgcolor: tokens.panel }}
  >
    <Toolbar sx={{ gap: 1, minHeight: 56 }}>
      <Tooltip title={label}>
        <IconButton
          ref={buttonRef}
          aria-label={label}
          aria-expanded={controls ? false : undefined}
          aria-controls={controls}
          edge="start"
          onClick={onOpen}
          sx={{ width: 44, height: 44 }}
        >
          <MenuIcon />
        </IconButton>
      </Tooltip>
      <Logo />
    </Toolbar>
  </AppBar>
);

const AppShell = ({ currentPage, onNavigate, children }: AppShellProps) => {
  const theme = useTheme();
  const isNarrow = useMediaQuery(theme.breakpoints.down('md'), { noSsr: true });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarHidden, setSidebarHidden] = useState(loadHidden);
  const showButton = useRef<HTMLButtonElement>(null);
  const hideButton = useRef<HTMLButtonElement>(null);
  const focusAfterToggle = useRef<'show' | 'hide' | null>(null);

  useEffect(() => {
    if (focusAfterToggle.current === 'show') showButton.current?.focus();
    if (focusAfterToggle.current === 'hide') hideButton.current?.focus();
    focusAfterToggle.current = null;
  }, [sidebarHidden]);

  const setHidden = (hidden: boolean) => {
    focusAfterToggle.current = hidden ? 'show' : 'hide';
    setSidebarHidden(hidden);
    saveHidden(hidden);
  };

  if (isNarrow) {
    const navigate = (page: Page) => {
      onNavigate(page);
      setDrawerOpen(false);
    };

    return (
      <Box sx={{ minHeight: '100vh', bgcolor: tokens.ground, display: 'flex', flexDirection: 'column' }}>
        <TopBar label="Open navigation" onOpen={() => setDrawerOpen(true)} />
        <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
          <Sidebar currentPage={currentPage} onNavigate={navigate} />
        </Drawer>
        <Box component="main" sx={mainSx}>
          <Box sx={contentSx}>{children}</Box>
          <Footer />
        </Box>
      </Box>
    );
  }

  if (sidebarHidden) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: tokens.ground, display: 'flex', flexDirection: 'column' }}>
        <TopBar label="Show sidebar" onOpen={() => setHidden(false)} buttonRef={showButton} controls={SIDEBAR_ID} />
        <Box component="main" sx={mainSx}>
          <Box sx={contentSx}>{children}</Box>
          <Footer />
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: tokens.ground }}>
      <Box
        component="aside"
        id={SIDEBAR_ID}
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
        <Sidebar currentPage={currentPage} onNavigate={onNavigate} onHide={() => setHidden(true)} hideButtonRef={hideButton} />
      </Box>
      <Box component="main" sx={mainSx}>
        <Box sx={contentSx}>{children}</Box>
        <Footer />
      </Box>
    </Box>
  );
};

export default AppShell;
