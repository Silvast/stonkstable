import React from 'react'
import './App.css'
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Container, 
  Divider,
  useMediaQuery,
  useTheme
} from '@mui/material'
import { StockTable } from './components/Table'

function App(): React.ReactElement {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <>
      <AppBar position="static" color="primary" sx={{ mb: { xs: 2, sm: 4 }, bgcolor: '#19d2ac' }}>
        <Toolbar sx={{ flexDirection: isMobile ? 'column' : 'row', py: isMobile ? 2 : 1 }}>
          <Typography 
            variant={isMobile ? "h5" : "h3"} 
            component="div" 
            sx={{ 
              flexGrow: 1, 
              ml: isMobile ? 0 : 2,
              textAlign: isMobile ? 'center' : 'left',
              my: isMobile ? 1 : 0
            }}
          >
            Stonksei taulukkona
          </Typography>
        </Toolbar>
      </AppBar>
      
      <Container maxWidth="lg" sx={{ px: { xs: 1, sm: 2, md: 3 } }}>
        <Typography 
          variant={isMobile ? "subtitle1" : "h6"} 
          component="h1" 
          gutterBottom 
          align="center" 
          sx={{ mb: { xs: 2, sm: 4 } }}
        >
          Viimeisen 20 päivän osakekurssit
        </Typography>

        <StockTable />
        
        <Divider sx={{ my: { xs: 2, sm: 4 } }} />
      </Container>
    </>
  )
}

export default App 