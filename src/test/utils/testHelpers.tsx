import React, { ReactElement } from 'react'
import { render, RenderOptions, screen, within } from '@testing-library/react'
import { ThemeProvider } from '@mui/material'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { StockSelectionProvider } from '../../context/StockSelectionContext'
import { FavouritesProvider } from '../../context/FavouritesContext'
import { TradesProvider } from '../../context/TradesContext'
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
                            <TradesProvider>
                                {children}
                            </TradesProvider>
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

export const exchangeButton = (code: string) =>
    within(screen.getByRole('group', { name: 'Exchange' })).getByRole('button', { name: code })

export const chooseExchange = async (user: { click: (element: Element) => Promise<void> }, code: string) => {
    await user.click(exchangeButton(code))
}

export * from '@testing-library/react'
export { customRender as render }

