import React, { useCallback, useState } from 'react'
import { CssBaseline, ThemeProvider } from '@mui/material'
import { Analysis, Favourites, Settings, StockTablePage } from './pages'
import { StockSelectionProvider } from './context/StockSelectionContext'
import { AuthProvider } from './context/AuthContext'
import { FavouritesProvider } from './context/FavouritesContext'
import SignInDialog from './components/Account/SignInDialog'
import AppShell from './components/Shell/AppShell'
import type { Page } from './components/Shell/Sidebar'
import { theme } from './theme'

function App(): React.ReactElement {
  const [currentPage, setCurrentPage] = useState<Page>('stock-table')
  const leaveSettings = useCallback(() => setCurrentPage('stock-table'), [])

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <StockSelectionProvider>
          <FavouritesProvider>
            <AppShell currentPage={currentPage} onNavigate={setCurrentPage}>
              {currentPage === 'stock-table' && <StockTablePage />}
              {currentPage === 'analysis' && <Analysis />}
              {currentPage === 'favourites' && <Favourites onOpen={setCurrentPage} />}
              {currentPage === 'settings' && <Settings onLeave={leaveSettings} />}
            </AppShell>
            <SignInDialog />
          </FavouritesProvider>
        </StockSelectionProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
