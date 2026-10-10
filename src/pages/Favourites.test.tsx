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

const rowNames = () =>
    screen.getAllByRole('row').slice(1).map(row => within(row).getAllByRole('cell')[1].textContent)

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

            expect(screen.getByRole('heading', { name: 'Favourites' })).toBeInTheDocument()
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

        it('lists every favourite, newest first, with its details', () => {
            renderPage()

            expect(screen.getByText('3 stocks · saved in this browser')).toBeInTheDocument()
            expect(rowNames()).toEqual(['Apple Inc', 'Nokia Oyj', 'Advanced Micro Devices Inc'])
            const nokiaRow = screen.getByRole('row', { name: /Nokia Oyj/ })
            expect(within(nokiaRow).getByText('NOKIA')).toBeInTheDocument()
            expect(within(nokiaRow).getByText('HE')).toBeInTheDocument()
            expect(within(nokiaRow).getByText('EUR')).toBeInTheDocument()
            expect(within(nokiaRow).getByText('8 Oct 2026')).toBeInTheDocument()
        })

        it('says "1 stock" for a single favourite', () => {
            saveFavourites([nokia])
            renderPage()

            expect(screen.getByText('1 stock · saved in this browser')).toBeInTheDocument()
        })

        it('makes no API calls', () => {
            renderPage()

            expect(fetchSpy).not.toHaveBeenCalled()
        })

        it('sorts by name', async () => {
            const user = userEvent.setup()
            renderPage()

            await user.click(screen.getByRole('button', { name: /^Name/ }))
            expect(rowNames()).toEqual(['Advanced Micro Devices Inc', 'Apple Inc', 'Nokia Oyj'])

            await user.click(screen.getByRole('button', { name: /^Name/ }))
            expect(rowNames()).toEqual(['Nokia Oyj', 'Apple Inc', 'Advanced Micro Devices Inc'])
        })

        it('filters by exchange with chips', async () => {
            const user = userEvent.setup()
            renderPage()

            const filters = screen.getByRole('group', { name: 'Exchange' })
            expect(within(filters).getAllByRole('button').map(chip => chip.textContent)).toEqual(['All', 'US', 'HE'])

            await user.click(within(filters).getByRole('button', { name: 'HE' }))
            expect(rowNames()).toEqual(['Nokia Oyj'])

            await user.click(within(filters).getByRole('button', { name: 'All' }))
            expect(rowNames()).toHaveLength(3)
        })

        it('hides the exchange chips when all favourites are on one exchange', () => {
            saveFavourites([apple, amd])
            renderPage()

            expect(screen.queryByRole('group', { name: 'Exchange' })).not.toBeInTheDocument()
        })

        it('shows the last close only when today\'s Analysis cache has it', () => {
            writeCache('AAPL', 'US', { data: mockStockData, error: null }, { data: [], error: null })
            renderPage()

            const appleRow = screen.getByRole('row', { name: /Apple Inc/ })
            expect(within(appleRow).getByText('155.00')).toBeInTheDocument()
            expect(within(appleRow).getByText('+3.3%')).toBeInTheDocument()
            expect(within(appleRow).getByText('10 Jan')).toBeInTheDocument()
            const nokiaRow = screen.getByRole('row', { name: /Nokia Oyj/ })
            expect(within(nokiaRow).getByText('—')).toBeInTheDocument()
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

        it('Analyze selects the stock on its exchange and opens Analysis', async () => {
            const user = userEvent.setup()
            const onOpen = renderPage()

            await user.click(screen.getByRole('button', { name: 'Analyze NOKIA' }))

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
