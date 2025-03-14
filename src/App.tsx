import React, { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
// Import Material UI components
import { 
  Button, 
  AppBar, 
  Toolbar, 
  Typography, 
  Container, 
  Card, 
  CardContent, 
  Box,
  Stack,
  Divider
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
// Import our StockTable component
import { StockTable } from './components/Table'

function App(): React.ReactElement {
  const [count, setCount] = useState<number>(0)

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