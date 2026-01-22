import React from 'react'
import './App.css'
import { 
  Typography, 
  Container, 
  createTheme,
  ThemeProvider,
  responsiveFontSizes,
  Box
} from '@mui/material'
import { StockTable } from './components/Table'


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

          <StockTable />
          
        </Container>
      </Box>
    </ThemeProvider>
  )
}

export default App 