import { describe, it, expect, beforeEach, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen, waitFor } from './test/utils/testHelpers'
import { render as renderWithoutTestProviders } from '@testing-library/react'
import App from './App'
import { mockStockData, mockSuccessResponse } from './test/mocks/stockApi'
import { saveFavourites } from './utils/favouritesStorage'

describe('App Component', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        localStorage.clear()
        vi.stubGlobal('fetch', vi.fn(() => mockSuccessResponse(mockStockData)))
    })

    it('provides its own contexts so it renders without the test providers', () => {
        renderWithoutTestProviders(<App />)

        expect(screen.getAllByRole('button', { name: 'Add AAPL to favourites' }).length).toBeGreaterThan(0)
    })

    it('renders navigation buttons at the top', () => {
        render(<App />)
        expect(screen.getByRole('button', { name: /Stock Table/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /Analysis/i })).toBeInTheDocument()
    })

    it('renders title and subtitle', () => {
        render(<App />)
        expect(screen.getByRole('heading', { name: /Stonksei taulukkona/i })).toBeInTheDocument()
        expect(screen.getByText(/Viimeisen 20 päivän osakekurssit/i)).toBeInTheDocument()
    })

    it('defaults to Stock Table page', async () => {
        render(<App />)

        await waitFor(() => {
            expect(screen.getByText(/Stock Search Options/i)).toBeInTheDocument()
        })

        const stockTableButton = screen.getByRole('button', { name: /Stock Table/i })
        expect(stockTableButton).toHaveAttribute('aria-current', 'page')
    })

    it('navigates to Analysis page and back', async () => {
        const user = userEvent.setup()
        render(<App />)

        // Stock table visible by default
        await waitFor(() => {
            expect(screen.getByText(/Stock Search Options/i)).toBeInTheDocument()
        })

        const analysisButton = screen.getByRole('button', { name: /Analysis/i })
        await user.click(analysisButton)

        expect(analysisButton).toHaveAttribute('aria-current', 'page')
        expect(screen.getByRole('button', { name: 'Analyze' })).toBeInTheDocument()
        expect(screen.queryByText(/Stock Search Options/i)).not.toBeInTheDocument()

        // Buttons remain visible on Analysis page
        expect(screen.getByRole('button', { name: /Stock Table/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /Analysis/i })).toBeInTheDocument()

        const stockTableButton = screen.getByRole('button', { name: /Stock Table/i })
        await user.click(stockTableButton)

        expect(stockTableButton).toHaveAttribute('aria-current', 'page')
        await waitFor(() => {
            expect(screen.getByText(/Stock Search Options/i)).toBeInTheDocument()
        })
    })

    it('keeps the chosen stock and exchange when switching tabs', async () => {
        const user = userEvent.setup()
        render(<App />)

        await user.click(screen.getByLabelText(/Exchange/i))
        await user.click(await screen.findByRole('option', { name: 'HE' }))
        const stockInput = screen.getByRole('combobox', { name: /Stock Symbol/i })
        await user.type(stockInput, 'NOKIA')
        await user.click(await screen.findByRole('option', { name: /Nokia Oyj \(NOKIA\)/i }))

        await user.click(screen.getByRole('button', { name: /Analysis/i }))
        await user.click(screen.getByRole('button', { name: /Stock Table/i }))

        expect(await screen.findByText(/\(NOKIA\.HE\)/)).toBeInTheDocument()
        expect(screen.getByLabelText(/Exchange/i)).toHaveTextContent('HE')
        expect(screen.getByRole('combobox', { name: /Stock Symbol/i })).toHaveValue('Nokia Oyj (NOKIA)')
    })

    it('shows the stock picked on Stock Table on the Analysis page', async () => {
        const user = userEvent.setup()
        render(<App />)

        await user.click(screen.getByLabelText(/Exchange/i))
        await user.click(await screen.findByRole('option', { name: 'HE' }))
        await user.type(screen.getByRole('combobox', { name: /Stock Symbol/i }), 'NOKIA')
        await user.click(await screen.findByRole('option', { name: /Nokia Oyj \(NOKIA\)/i }))

        await user.click(screen.getByRole('button', { name: /Analysis/i }))

        expect(screen.getByRole('combobox', { name: /Stock Symbol/i })).toHaveValue('Nokia Oyj (NOKIA)')
        expect(screen.getByText(/NOKIA\.HE · Nokia Oyj/)).toBeInTheDocument()
        expect(screen.getByRole('link', { name: /Open in TradingView/i }))
            .toHaveAttribute('href', 'https://www.tradingview.com/chart/?symbol=OMXHEX%3ANOKIA')
    })

    describe('Favourites', () => {
        const favouritesNav = () => screen.getByRole('button', { name: /^Favourites/ })

        it('has a Favourites nav button whose count follows the starred stocks', async () => {
            const user = userEvent.setup()
            render(<App />)

            expect(favouritesNav()).toHaveTextContent(/^Favourites$/)

            await user.click(screen.getAllByRole('button', { name: 'Add AAPL to favourites' })[0])

            expect(favouritesNav()).toHaveTextContent(/^Favourites1$/)
        })

        it('lists a stock starred on Stock Table', async () => {
            const user = userEvent.setup()
            render(<App />)

            await user.click(screen.getAllByRole('button', { name: 'Add AAPL to favourites' })[0])
            await user.click(favouritesNav())

            expect(favouritesNav()).toHaveAttribute('aria-current', 'page')
            expect(screen.getByRole('heading', { name: 'Favourites' })).toBeInTheDocument()
            expect(screen.getByRole('row', { name: /Apple Inc/ })).toBeInTheDocument()
        })

        it('opens a favourite from another exchange in Stock Table', async () => {
            const user = userEvent.setup()
            saveFavourites([{ code: 'NOKIA', exchange: 'HE', name: 'Nokia Oyj', currency: 'EUR', addedAt: '2026-10-08T08:00:00.000Z' }])
            render(<App />)

            await user.click(favouritesNav())
            await user.click(screen.getByRole('button', { name: 'Show NOKIA in Stock Table' }))

            expect(screen.getByRole('button', { name: /^Stock Table$/ })).toHaveAttribute('aria-current', 'page')
            expect(await screen.findByText(/\(NOKIA\.HE\)/)).toBeInTheDocument()
            expect(screen.getByRole('combobox', { name: /Stock Symbol/i })).toHaveValue('Nokia Oyj (NOKIA)')
        })
    })
})
