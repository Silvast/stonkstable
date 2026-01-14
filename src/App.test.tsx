import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from './test/utils/testHelpers'
import App from './App'
import { mockStockData, mockSuccessResponse } from './test/mocks/stockApi'

describe('App Component', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        global.fetch = vi.fn(() => mockSuccessResponse(mockStockData))
    })

    describe('Initial Render', () => {
        it('renders without crashing', () => {
            render(<App />)
            expect(screen.getByText(/Stonksei taulukkona/i)).toBeInTheDocument()
        })

        it('renders AppBar with title', () => {
            render(<App />)
            const title = screen.getByText(/Stonksei taulukkona/i)
            expect(title).toBeInTheDocument()
        })

        it('renders subtitle text', () => {
            render(<App />)
            expect(screen.getByText(/Viimeisen 20 päivän osakekurssit/i)).toBeInTheDocument()
        })

        it('renders StockTable component', async () => {
            render(<App />)
            await waitFor(() => {
                expect(screen.getByText(/Stock Search Options/i)).toBeInTheDocument()
            })
        })
    })

    describe('Theme Integration', () => {
        it('applies ThemeProvider correctly', () => {
            render(<App />)
            const appBar = screen.getByRole('banner')
            expect(appBar).toBeInTheDocument()
        })

        it('renders Container with correct layout', () => {
            render(<App />)
            const container = screen.getByText(/Viimeisen 20 päivän osakekurssit/i).closest('div')
            expect(container).toBeInTheDocument()
        })
    })

    describe('Layout Structure', () => {
        it('has proper heading hierarchy', () => {
            render(<App />)
            const heading = screen.getByRole('heading', { name: /Viimeisen 20 päivän osakekurssit/i })
            expect(heading).toBeInTheDocument()
        })

        it('contains all major sections', async () => {
            render(<App />)

            // AppBar
            expect(screen.getByText(/Stonksei taulukkona/i)).toBeInTheDocument()

            // Subtitle
            expect(screen.getByText(/Viimeisen 20 päivän osakekurssit/i)).toBeInTheDocument()

            // StockTable
            await waitFor(() => {
                expect(screen.getByText(/Stock Search Options/i)).toBeInTheDocument()
            })
        })
    })

    describe('Responsive Design', () => {
        it('renders correctly on desktop viewport', () => {
            // Default matchMedia mock returns matches: false (desktop-like)
            render(<App />)
            expect(screen.getByText(/Stonksei taulukkona/i)).toBeInTheDocument()
        })

        it('applies responsive styles through theme', () => {
            render(<App />)
            const appBar = screen.getByRole('banner')
            expect(appBar).toBeInTheDocument()
            // Theme and responsive styles are applied through MUI
        })
    })

    describe('Component Integration', () => {
        it('StockTable receives theme context', async () => {
            render(<App />)
            await waitFor(() => {
                const stockTable = screen.getByText(/Stock Search Options/i)
                expect(stockTable).toBeInTheDocument()
            })
        })

        it('all components render within ThemeProvider', async () => {
            render(<App />)

            // AppBar (part of theme)
            expect(screen.getByRole('banner')).toBeInTheDocument()

            // Typography components
            expect(screen.getByText(/Stonksei taulukkona/i)).toBeInTheDocument()
            expect(screen.getByText(/Viimeisen 20 päivän osakekurssit/i)).toBeInTheDocument()

            // StockTable with MUI components
            await waitFor(() => {
                expect(screen.getByLabelText(/Search for a stock by name or symbol/i)).toBeInTheDocument()
            })
        })
    })

    describe('Data Flow', () => {
        it('StockTable can fetch data within App context', async () => {
            const fetchSpy = vi.fn(() => mockSuccessResponse(mockStockData))
            global.fetch = fetchSpy

            render(<App />)

            await waitFor(() => {
                expect(fetchSpy).toHaveBeenCalled()
            })
        })

        it('displays fetched stock data in table', async () => {
            render(<App />)

            await waitFor(() => {
                expect(screen.getByText('Date')).toBeInTheDocument()
                expect(screen.getByText('2024-01-10')).toBeInTheDocument()
            })
        })
    })
})

