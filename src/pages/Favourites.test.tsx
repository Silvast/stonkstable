import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen, within, waitFor } from '../test/utils/testHelpers'
import Favourites from './Favourites'
import { useStockSelection } from '../context/StockSelectionContext'
import { FavouriteStock, loadFavourites, saveFavourites } from '../utils/favouritesStorage'
import { writeCache } from '../utils/analysisCache'
import { mockStockData } from '../test/mocks/stockApi'

const apple: FavouriteStock = { code: 'AAPL', exchange: 'US', name: 'Apple Inc', currency: 'USD', addedAt: '2026-10-10T08:00:00.000Z' }
const nokia: FavouriteStock = { code: 'NOKIA', exchange: 'HE', name: 'Nokia Oyj', currency: 'EUR', addedAt: '2026-10-08T08:00:00.000Z' }
const amd: FavouriteStock = { code: 'AMD', exchange: 'US', name: 'Advanced Micro Devices Inc', currency: 'USD', addedAt: '2026-10-02T08:00:00.000Z' }

const SelectionProbe = () => {
    const { symbol, exchange } = useStockSelection()
    return <output data-testid="selection">{`${symbol}.${exchange}`}</output>
}

const renderPage = (onOpen = vi.fn()) => {
    render(<><Favourites onOpen={onOpen} /><SelectionProbe /></>)
    return onOpen
}

const rowCodes = () =>
    screen.getAllByRole('row').slice(1).map(row => within(row).getAllByRole('cell')[1].firstChild?.textContent)

describe('Favourites page', () => {
    let fetchSpy: ReturnType<typeof vi.fn>

    beforeEach(() => {
        localStorage.clear()
        fetchSpy = vi.fn()
        vi.stubGlobal('fetch', fetchSpy)
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    describe('empty state', () => {
        it('explains how to add favourites and links to Stock Table', async () => {
            const user = userEvent.setup()
            const onOpen = renderPage()

            expect(screen.getByRole('heading', { level: 1, name: 'Favourites' })).toBeInTheDocument()
            expect(screen.getByText('No favourites yet')).toBeInTheDocument()
            expect(screen.getByText('Tap the ☆ next to any stock to keep it here.')).toBeInTheDocument()
            expect(screen.queryByRole('table')).not.toBeInTheDocument()

            await user.click(screen.getByRole('button', { name: 'Go to Stock Table' }))

            expect(onOpen).toHaveBeenCalledWith('stock-table')
        })
    })

    describe('with favourites', () => {
        beforeEach(() => {
            saveFavourites([apple, nokia, amd])
        })

        it('says the list is saved in this browser only when not signed in', () => {
            renderPage()

            expect(screen.getByText('Saved in this browser only')).toBeInTheDocument()
        })

        it('lists every favourite, newest first, with its details', () => {
            renderPage()

            expect(rowCodes()).toEqual(['AAPL', 'NOKIA', 'AMD'])
            const nokiaRow = screen.getByRole('row', { name: /Nokia Oyj/ })
            expect(within(nokiaRow).getByText('Nokia Oyj · EUR')).toBeInTheDocument()
            expect(within(nokiaRow).getByText('HE')).toBeInTheDocument()
            expect(within(nokiaRow).getByText('8 Oct 2026')).toBeInTheDocument()
        })

        it('shows a flat sparkline and dashes until the stock is analysed today', () => {
            renderPage()

            const nokiaRow = screen.getByRole('row', { name: /Nokia Oyj/ })
            expect(within(nokiaRow).getByRole('img', { name: 'Not loaded yet' })).toBeInTheDocument()
            expect(within(nokiaRow).getAllByText('—')).toHaveLength(3)
        })

        it('shows the sparkline, last close, day change and bias from today\'s Analysis cache', () => {
            writeCache('AAPL', 'US', { data: mockStockData, error: null }, { data: [], error: null })
            renderPage()

            const appleRow = screen.getByRole('row', { name: /Apple Inc/ })
            expect(within(appleRow).getByRole('img', { name: '20-day closing prices for AAPL' })).toBeInTheDocument()
            expect(within(appleRow).getByText('155.00')).toBeInTheDocument()
            expect(within(appleRow).getByText('+3.33%')).toBeInTheDocument()
            expect(within(appleRow).getByText('Aside')).toBeInTheDocument()
        })

        it('makes no API calls', () => {
            renderPage()

            expect(fetchSpy).not.toHaveBeenCalled()
        })

        it('sorts by stock name', async () => {
            const user = userEvent.setup()
            renderPage()

            await user.click(screen.getByRole('button', { name: /^Stock/ }))
            expect(rowCodes()).toEqual(['AMD', 'AAPL', 'NOKIA'])

            await user.click(screen.getByRole('button', { name: /^Stock/ }))
            expect(rowCodes()).toEqual(['NOKIA', 'AAPL', 'AMD'])
        })

        it('filters by exchange with a segmented control', async () => {
            const user = userEvent.setup()
            renderPage()

            const filters = screen.getByRole('group', { name: 'Exchange' })
            expect(within(filters).getAllByRole('button').map(button => button.textContent)).toEqual(['All', 'US', 'HE'])

            await user.click(within(filters).getByRole('button', { name: 'HE' }))
            expect(rowCodes()).toEqual(['NOKIA'])
            expect(within(filters).getByRole('button', { name: 'HE' })).toHaveAttribute('aria-pressed', 'true')

            await user.click(within(filters).getByRole('button', { name: 'All' }))
            expect(rowCodes()).toHaveLength(3)
        })

        it('hides the exchange filter when all favourites are on one exchange', () => {
            saveFavourites([apple, amd])
            renderPage()

            expect(screen.queryByRole('group', { name: 'Exchange' })).not.toBeInTheDocument()
        })

        it('removes a favourite with an Undo that restores it with the same added date', async () => {
            const user = userEvent.setup()
            renderPage()

            await user.click(screen.getByRole('button', { name: 'Remove NOKIA from favourites' }))

            expect(screen.queryByRole('row', { name: /Nokia Oyj/ })).not.toBeInTheDocument()
            expect(loadFavourites().map(f => f.code)).toEqual(['AAPL', 'AMD'])
            expect(screen.getByText('Removed Nokia Oyj')).toBeInTheDocument()

            await user.click(screen.getByRole('button', { name: 'Undo' }))

            expect(screen.getByRole('row', { name: /Nokia Oyj/ })).toBeInTheDocument()
            expect(loadFavourites().find(f => f.code === 'NOKIA')).toEqual(nokia)
            await waitFor(() => expect(screen.queryByText('Removed Nokia Oyj')).not.toBeInTheDocument())
        })

        it('Analyse selects the stock on its exchange and opens Analysis', async () => {
            const user = userEvent.setup()
            const onOpen = renderPage()

            await user.click(screen.getByRole('button', { name: 'Analyse NOKIA' }))

            expect(screen.getByTestId('selection')).toHaveTextContent('NOKIA.HE')
            expect(onOpen).toHaveBeenCalledWith('analysis')
        })

        it('Table selects the stock on its exchange and opens Stock Table', async () => {
            const user = userEvent.setup()
            const onOpen = renderPage()

            await user.click(screen.getByRole('button', { name: 'Show AMD in Stock Table' }))

            expect(screen.getByTestId('selection')).toHaveTextContent('AMD.US')
            expect(onOpen).toHaveBeenCalledWith('stock-table')
        })
    })
})
