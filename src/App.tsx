import React from 'react'
import './App.css'
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Container, 
  Divider
} from '@mui/material'
import { StockTable } from './components/Table'

function App(): React.ReactElement {

  return (
    <>
      <AppBar position="static" color="primary" sx={{ mb: 4, bgcolor: '#19d2ac' }}>
        <Toolbar>
          <Typography variant="h3" component="div" sx={{ flexGrow: 1, ml: 2 }}>
            Stonksei taulukkona
          </Typography>
        </Toolbar>
      </AppBar>
      
      <Container maxWidth="lg">
        <Typography variant="h6" component="h1" gutterBottom align="center" sx={{ mb: 4 }}>
          Viimeisen 20 päivän osakekurssit
        </Typography>

            <StockTable />

        
        <Divider sx={{ my: 4 }} />

      </Container>
    </>
  )
}

export default App 