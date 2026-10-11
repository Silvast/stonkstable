import { describe, it, expect, beforeEach, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen, waitFor, within, chooseExchange, exchangeButton } from './test/utils/testHelpers'
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

    it('provides its own contexts so it renders without the test providers', async () => {
        renderWithoutTestProviders(<App />)

        expect((await screen.findAllByRole('button', { name: 'Add AAPL to favourites' })).length).toBeGreaterThan(0)
    })

    it('hides sign-in when no backend is configured', () => {
        render(<App />)

        expect(screen.queryByRole('button', { name: /Sign in/ })).not.toBeInTheDocument()
    })

    it('shows the Stonkstable sidebar with the section nav', () => {
        render(<App />)

        const sidebar = screen.getByRole('complementary')
        expect(within(sidebar).getByText('Stonkstable')).toBeInTheDocument()
        const nav = within(sidebar).getByRole('navigation', { name: 'Sections' })
        expect(within(nav).getAllByRole('button').map(button => button.textContent)).toEqual([
            'Stock table', 'Analysis', 'Favourites',
        ])
        expect(within(nav).getByRole('button', { name: 'Stock table' })).toHaveAttribute('aria-current', 'page')
    })

    it('no longer shows the old page header', () => {
        render(<App />)

        expect(screen.queryByText(/Stonksei taulukkona/i)).not.toBeInTheDocument()
        expect(screen.queryByText(/Viimeisen 20 päivän osakekurssit/i)).not.toBeInTheDocument()
    })

    it('opens the navigation from a menu button on narrow screens', async () => {
        const user = userEvent.setup()
        const matchMedia = window.matchMedia
        window.matchMedia = vi.fn().mockImplementation((query: string) => ({
            ...matchMedia(query),
            matches: query.includes('max-width:959.95px'),
        }))
        try {
            render(<App />)

            expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
            await user.click(screen.getByRole('button', { name: 'Open navigation' }))
            const nav = await screen.findByRole('navigation', { name: 'Sections' })
            await user.click(within(nav).getByRole('button', { name: 'Analysis' }))

            expect(screen.getByRole('button', { name: 'Analyse' })).toBeInTheDocument()
            await waitFor(() => expect(screen.queryByRole('navigation', { name: 'Sections' })).not.toBeInTheDocument())
        } finally {
            window.matchMedia = matchMedia
        }
    })

    it('defaults to Stock Table page', async () => {
        render(<App />)

        expect(await screen.findByRole('heading', { name: 'Daily prices' })).toBeInTheDocument()

        const stockTableButton = screen.getByRole('button', { name: /Stock Table/i })
        expect(stockTableButton).toHaveAttribute('aria-current', 'page')
    })

    it('navigates to Analysis page and back', async () => {
        const user = userEvent.setup()
        render(<App />)

        // Stock table visible by default
        expect(await screen.findByRole('heading', { name: 'Daily prices' })).toBeInTheDocument()

        const analysisButton = screen.getByRole('button', { name: /Analysis/i })
        await user.click(analysisButton)

        expect(analysisButton).toHaveAttribute('aria-current', 'page')
        expect(screen.getByRole('button', { name: 'Analyse' })).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: 'Fetch' })).not.toBeInTheDocument()

        // Buttons remain visible on Analysis page
        expect(screen.getByRole('button', { name: /Stock Table/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /Analysis/i })).toBeInTheDocument()

        const stockTableButton = screen.getByRole('button', { name: /Stock Table/i })
        await user.click(stockTableButton)

        expect(stockTableButton).toHaveAttribute('aria-current', 'page')
        expect(await screen.findByRole('heading', { name: 'Daily prices' })).toBeInTheDocument()
    })

    it('keeps the chosen stock and exchange when switching tabs', async () => {
        const user = userEvent.setup()
        render(<App />)

        await chooseExchange(user, 'HE')
        const stockInput = screen.getByRole('combobox', { name: /Stock Symbol/i })
        await user.type(stockInput, 'NOKIA')
        await user.click(await screen.findByRole('option', { name: /Nokia Oyj \(NOKIA\)/i }))

        await user.click(screen.getByRole('button', { name: /Analysis/i }))
        await user.click(screen.getByRole('button', { name: /Stock Table/i }))

        expect(exchangeButton('HE')).toHaveAttribute('aria-pressed', 'true')
        expect(screen.getByRole('combobox', { name: /Stock Symbol/i })).toHaveValue('Nokia Oyj (NOKIA)')
    })

    it('shows the stock picked on Stock Table on the Analysis page', async () => {
        const user = userEvent.setup()
        render(<App />)

        await chooseExchange(user, 'HE')
        await user.type(screen.getByRole('combobox', { name: /Stock Symbol/i }), 'NOKIA')
        await user.click(await screen.findByRole('option', { name: /Nokia Oyj \(NOKIA\)/i }))

        await user.click(screen.getByRole('button', { name: /Analysis/i }))

        expect(screen.getByRole('combobox', { name: /Stock Symbol/i })).toHaveValue('Nokia Oyj (NOKIA)')
        expect(screen.getByRole('heading', { level: 1, name: 'Nokia Oyj' })).toBeInTheDocument()
        expect(screen.getByText('NOKIA.HE')).toBeInTheDocument()
        expect(screen.getByRole('link', { name: /Open in TradingView/i }))
            .toHaveAttribute('href', 'https://www.tradingview.com/chart/?symbol=OMXHEX%3ANOKIA')
    })

    describe('Favourites', () => {
        const favouritesNav = () => screen.getByRole('button', { name: /^Favourites/ })

        it('has a Favourites nav button whose count follows the starred stocks', async () => {
            const user = userEvent.setup()
            render(<App />)

            expect(favouritesNav()).toHaveTextContent(/^Favourites$/)

            await user.click((await screen.findAllByRole('button', { name: 'Add AAPL to favourites' }))[0])

            expect(favouritesNav()).toHaveTextContent(/^Favourites1$/)
        })

        it('lists a stock starred on Stock Table', async () => {
            const user = userEvent.setup()
            render(<App />)

            await user.click((await screen.findAllByRole('button', { name: 'Add AAPL to favourites' }))[0])
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

            expect(screen.getByRole('button', { name: /^Stock table$/ })).toHaveAttribute('aria-current', 'page')
            expect(await screen.findByText('NOKIA.HE')).toBeInTheDocument()
            expect(screen.getByRole('combobox', { name: /Stock Symbol/i })).toHaveValue('Nokia Oyj (NOKIA)')
        })
    })
})
