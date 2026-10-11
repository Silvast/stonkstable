import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { ThemeProvider } from '@mui/material'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { StockSelectionProvider } from '../../context/StockSelectionContext'
import { FavouritesProvider } from '../../context/FavouritesContext'
import { AuthProvider } from '../../context/AuthContext'
import { theme } from '../../theme'

interface AllTheProvidersProps {
    children: React.ReactNode
}

const AllTheProviders: React.FC<AllTheProvidersProps> = ({ children }) => {
    return (
        <ThemeProvider theme={theme}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
                <AuthProvider>
                    <StockSelectionProvider>
                        <FavouritesProvider>
                            {children}
                        </FavouritesProvider>
                    </StockSelectionProvider>
                </AuthProvider>
            </LocalizationProvider>
        </ThemeProvider>
    )
}

const customRender = (
    ui: ReactElement,
    options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options })

export * from '@testing-library/react'
export { customRender as render }

