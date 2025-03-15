import React from 'react'
import './App.css'
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Container, 
  useMediaQuery,
  createTheme,
  ThemeProvider,
  responsiveFontSizes,
  Box
} from '@mui/material'
import { StockTable } from './components/Table'

// Create a custom theme with wider breakpoints
const theme = responsiveFontSizes(createTheme({
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
          maxWidth: '90% !important', // Use 90% width for large screens
          marginLeft: 'auto',
          marginRight: 'auto',
        },
      },
    },
  },
}));

function App(): React.ReactElement {
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isIPhoneSize = useMediaQuery('(max-width:400px)'); // Targets iPhone-sized devices

  return (
    <ThemeProvider theme={theme}>
      <AppBar 
        position="static" 
        color="primary" 
        sx={{ 
          mb: { xs: 1, sm: 4 }, 
          bgcolor: '#19d2ac',
          height: isIPhoneSize ? '50px' : isMobile ? '60px' : 'auto',
          boxShadow: isMobile ? 1 : 3,
          width: '90%', // Full width for the background color
          display: 'flex',
          alignItems: 'center', 
          justifyContent: 'center',
        }}
      >
        <Box 
          sx={{ 
            width: { xs: '100%', lg: '90%' }, 
            maxWidth: '1800px',
            display: 'flex',
            justifyContent: 'center'
          }}
        >
          <Toolbar 
            sx={{ 
              flexDirection: isMobile ? 'column' : 'row', 
              py: isIPhoneSize ? 0.5 : isMobile ? 1 : 1,
              minHeight: isIPhoneSize ? '50px' : isMobile ? '60px' : '64px',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
            }}
          >
            <Typography 
              variant={isIPhoneSize ? "h6" : isMobile ? "h5" : "h3"} 
              component="div" 
              sx={{ 
                flexGrow: 1, 
                ml: 0,
                textAlign: 'center', // Center the text for all screen sizes
                my: isMobile ? 0 : 0,
                letterSpacing: isMobile ? '-0.5px' : 'normal',
                fontSize: isIPhoneSize ? '1rem' : isMobile ? '1.1rem' : undefined,
                lineHeight: isMobile ? 1.2 : 1.5,
              }}
            >
              Stonksei taulukkona
            </Typography>
          </Toolbar>
        </Box>
      </AppBar>
      
      <Container 
        maxWidth="xl" 
        disableGutters={false}
        sx={{ 
          width: { xs: '100%', lg: '90%' },
          maxWidth: { xs: '100%', lg: '90%', xl: '1800px' },
          px: { xs: 1, sm: 2, md: 3 },
          mx: 'auto', // Center the container
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center' // Center children horizontally
        }}
      >
        <Typography 
          variant={isMobile ? "subtitle1" : "h6"} 
          component="h1" 
          gutterBottom 
          align="center" 
          sx={{ 
            mb: { xs: 2, sm: 4 },
            fontSize: isMobile ? '0.9rem' : undefined
          }}
        >
          Viimeisen 20 päivän osakekurssit
        </Typography>

        <StockTable />
        
      </Container>
    </ThemeProvider>
  )
}

export default App 