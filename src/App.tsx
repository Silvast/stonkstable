import React, { useState } from 'react'
import './App.css'
import { 
  Button,
  Typography, 
  Container, 
  useMediaQuery,
  createTheme,
  ThemeProvider,
  responsiveFontSizes,
  Box
} from '@mui/material'
import { Analysis, StockTablePage } from './pages'


const theme = responsiveFontSizes(createTheme({
  palette: {
    primary: {
      main: '#0066CC',
    },
    text: {
      primary: '#1A1A1A',
      secondary: '#6C757D',
    },
    background: {
      default: '#FFFFFF',
      paper: '#FFFFFF',
    },
    divider: '#E9ECEF',
  },
  typography: {
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    h6: {
      fontWeight: 400,
      fontSize: '1.25rem',
    },
    body2: {
      fontSize: '0.875rem',
    },
  },
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 960,
      lg: 1280,
      xl: 1920,
    },
  },
  components: {
    MuiContainer: {
      styleOverrides: {
        maxWidthXl: {
          maxWidth: '90% !important', 
          marginLeft: 'auto',
          marginRight: 'auto',
        },
      },
    },
  },
}));

function App(): React.ReactElement {
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [currentPage, setCurrentPage] = useState<'stock-table' | 'analysis'>('stock-table');

  return (
    <ThemeProvider theme={theme}>
      <Box 
        sx={{ 
          bgcolor: 'background.default',
          minHeight: '100vh',
          pt: { xs: 3, sm: 4 }
        }}
      >
        <Container 
          maxWidth="xl" 
          disableGutters={false}
          sx={{ 
            width: { xs: '100%', lg: '90%' },
            maxWidth: { xs: '100%', lg: '90%', xl: '1800px' },
            px: { xs: 2, sm: 3, md: 4 },
            mx: 'auto', 
          }}
        >
          {/* Minimal Header */}
          <Box 
            sx={{ 
              mb: { xs: 3, sm: 4 },
              pb: { xs: 2, sm: 3 },
              borderBottom: '1px solid',
              borderColor: 'divider',
            }}
          >
            {/* Navigation (top) */}
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                gap: 1,
                mb: { xs: 2, sm: 2.5 },
                alignItems: { xs: 'stretch', sm: 'center' },
                justifyContent: 'flex-start',
              }}
            >
              <Button
                type="button"
                onClick={() => setCurrentPage('stock-table')}
                aria-current={currentPage === 'stock-table' ? 'page' : undefined}
                variant="text"
                size={isMobile ? 'small' : 'medium'}
                sx={{
                  justifyContent: 'flex-start',
                  borderRadius: 1,
                  px: 1,
                  py: 0.75,
                  color: currentPage === 'stock-table' ? 'primary.main' : 'text.secondary',
                  bgcolor: currentPage === 'stock-table' ? 'action.hover' : 'transparent',
                  border: '1px solid',
                  borderColor: currentPage === 'stock-table' ? 'primary.main' : 'divider',
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                Stock Table
              </Button>
              <Button
                type="button"
                onClick={() => setCurrentPage('analysis')}
                aria-current={currentPage === 'analysis' ? 'page' : undefined}
                variant="text"
                size={isMobile ? 'small' : 'medium'}
                sx={{
                  justifyContent: 'flex-start',
                  borderRadius: 1,
                  px: 1,
                  py: 0.75,
                  color: currentPage === 'analysis' ? 'primary.main' : 'text.secondary',
                  bgcolor: currentPage === 'analysis' ? 'action.hover' : 'transparent',
                  border: '1px solid',
                  borderColor: currentPage === 'analysis' ? 'primary.main' : 'divider',
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                Analysis
              </Button>
            </Box>

            <Typography 
              variant="h6"
              component="h1" 
              sx={{ 
                color: 'text.primary',
                fontWeight: 400,
                mb: 0.5,
                fontSize: { xs: '1.1rem', sm: '1.25rem' }
              }}
            >
              Stonksei taulukkona
            </Typography>
            <Typography 
              variant="body2"
              component="p" 
              sx={{ 
                color: 'text.secondary',
                fontSize: { xs: '0.813rem', sm: '0.875rem' }
              }}
            >
              Viimeisen 20 päivän osakekurssit
            </Typography>
          </Box>

          {currentPage === 'stock-table' ? <StockTablePage /> : <Analysis />}
          
        </Container>
      </Box>
    </ThemeProvider>
  )
}

export default App 