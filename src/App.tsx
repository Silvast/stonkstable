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
import { Analysis, Favourites, StockTablePage } from './pages'
import { StockSelectionProvider } from './context/StockSelectionContext'
import { AuthProvider } from './context/AuthContext'
import { FavouritesProvider, useFavourites } from './context/FavouritesContext'
import StarIcon from '@mui/icons-material/Star'


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

type Page = 'stock-table' | 'analysis' | 'favourites'

interface NavButtonProps {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}

function NavButton({ active, onClick, children }: NavButtonProps): React.ReactElement {
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  return (
    <Button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      variant="text"
      size={isMobile ? 'small' : 'medium'}
      sx={{
        justifyContent: 'flex-start',
        borderRadius: 1,
        px: 1,
        py: 0.75,
        textTransform: 'none',
        whiteSpace: 'nowrap',
        minWidth: 'fit-content',
        color: active ? 'primary.main' : 'text.secondary',
        bgcolor: active ? 'action.hover' : 'transparent',
        border: '1px solid',
        borderColor: active ? 'primary.main' : 'divider',
        '&:hover': { bgcolor: 'action.hover' },
      }}
    >
      {children}
    </Button>
  )
}

function FavouritesNavLabel(): React.ReactElement {
  const { favourites } = useFavourites()

  return (
    <>
      <StarIcon fontSize="small" sx={{ mr: 0.5 }} />
      Favourites
      {favourites.length > 0 && (
        <Box component="span" sx={{ color: 'text.secondary', ml: 0.5 }}>{favourites.length}</Box>
      )}
    </>
  )
}

function App(): React.ReactElement {
  const [currentPage, setCurrentPage] = useState<Page>('stock-table');

  return (
    <ThemeProvider theme={theme}>
      <AuthProvider>
        <StockSelectionProvider>
          <FavouritesProvider>
            <Box
              sx={{
                bgcolor: 'background.default',
                minHeight: '100vh',
                pt: { xs: 3, sm: 4 },
                width: '100%',
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
                    width: '100%',
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
                      width: '100%',
                    }}
                  >
                    <NavButton active={currentPage === 'stock-table'} onClick={() => setCurrentPage('stock-table')}>
                      Stock Table
                    </NavButton>
                    <NavButton active={currentPage === 'analysis'} onClick={() => setCurrentPage('analysis')}>
                      Analysis
                    </NavButton>
                    <NavButton active={currentPage === 'favourites'} onClick={() => setCurrentPage('favourites')}>
                      <FavouritesNavLabel />
                    </NavButton>
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

                {currentPage === 'stock-table' && <StockTablePage />}
                {currentPage === 'analysis' && <Analysis />}
                {currentPage === 'favourites' && <Favourites onOpen={setCurrentPage} />}

              </Container>
            </Box>
          </FavouritesProvider>
        </StockSelectionProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App 