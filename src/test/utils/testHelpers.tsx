import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { ThemeProvider, createTheme, responsiveFontSizes } from '@mui/material'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { StockSelectionProvider } from '../../context/StockSelectionContext'

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
                    maxWidth: '90% !important',
                    marginLeft: 'auto',
                    marginRight: 'auto',
                },
            },
        },
    },
}))

interface AllTheProvidersProps {
    children: React.ReactNode
}

const AllTheProviders: React.FC<AllTheProvidersProps> = ({ children }) => {
    return (
        <ThemeProvider theme={theme}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
                <StockSelectionProvider>
                    {children}
                </StockSelectionProvider>
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

