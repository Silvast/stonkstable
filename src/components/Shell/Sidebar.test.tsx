import { describe, it, expect, beforeEach, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen, within } from '../../test/utils/testHelpers'
import Sidebar, { Page } from './Sidebar'
import { useStockSelection } from '../../context/StockSelectionContext'
import { FavouriteStock, saveFavourites } from '../../utils/favouritesStorage'
import { saveTrades } from '../../utils/tradesStorage'
import type { Trade } from '../../utils/trades'
import { writeCache } from '../../utils/analysisCache'
import { mockStockData } from '../../test/mocks/stockApi'

const apple: FavouriteStock = { code: 'AAPL', exchange: 'US', name: 'Apple Inc', currency: 'USD', addedAt: '2026-10-10T08:00:00.000Z' }
const nokia: FavouriteStock = { code: 'NOKIA', exchange: 'HE', name: 'Nokia Oyj', currency: 'EUR', addedAt: '2026-10-08T08:00:00.000Z' }
const nokiaTrade: Trade = {
    id: 't0',
    instrument: 'MINI L NOKIA NORDNET FI24',
    quantity: 200,
    currency: 'EUR',
    open: { price: 1.62, commission: 0, date: '2026-10-09' },
    createdAt: '2026-10-09T08:00:00.000Z',
}

const SelectionProbe = () => {
    const { symbol, exchange } = useStockSelection()
    return <output data-testid="selection">{`${symbol}.${exchange}`}</output>
}

const renderSidebar = (page: Page) => render(<><Sidebar currentPage={page} onNavigate={vi.fn()} /><SelectionProbe /></>)

const watchlistRows = () =>
    within(screen.getByRole('list', { name: 'Watchlist' })).getAllByRole('button')

describe('Sidebar watchlist', () => {
    beforeEach(() => {
        localStorage.clear()
        saveFavourites([nokia, apple])
        writeCache('AAPL', 'US', { data: mockStockData, error: null }, { data: [], error: null })
    })

    it('lists favourites with last close and day change on the Stock table page', () => {
        renderSidebar('stock-table')

        expect(screen.getByRole('heading', { name: 'Watchlist' })).toBeInTheDocument()
        expect(watchlistRows().map(row => row.textContent)).toEqual([
            'NOKIANokia Oyj—',
            'AAPLApple Inc155.00+3.33%',
        ])
    })

    it('shows the bias for each favourite on the Analysis page', () => {
        renderSidebar('analysis')

        expect(watchlistRows().map(row => row.textContent)).toEqual([
            'NOKIANokia Oyj—',
            'AAPLApple IncAside',
        ])
    })

    it('is not shown on the Favourites page', () => {
        renderSidebar('favourites')

        expect(screen.queryByRole('heading', { name: 'Watchlist' })).not.toBeInTheDocument()
    })

    it('is not shown without favourites', () => {
        saveFavourites([])
        renderSidebar('stock-table')

        expect(screen.queryByRole('heading', { name: 'Watchlist' })).not.toBeInTheDocument()
    })

    it('selects a stock when its row is clicked and marks it as current', async () => {
        const user = userEvent.setup()
        renderSidebar('stock-table')

        await user.click(screen.getByRole('button', { name: /^NOKIA/ }))

        expect(screen.getByTestId('selection')).toHaveTextContent('NOKIA.HE')
        expect(screen.getByRole('button', { name: /^NOKIA/ })).toHaveAttribute('aria-current', 'true')
        expect(screen.getByRole('button', { name: /^AAPL/ })).not.toHaveAttribute('aria-current')
    })
})

describe('Sidebar trades nav item', () => {
    beforeEach(() => {
        localStorage.clear()
    })

    it('counts the open positions on the badge and hides the watchlist', () => {
        saveTrades([{ ...nokiaTrade, id: 't1' }, { ...nokiaTrade, id: 't2', close: { price: 1.92, commission: 0, date: '2026-10-16' } }])
        renderSidebar('trades')

        expect(screen.getByRole('button', { name: /^Trades/ })).toHaveTextContent('Trades1')
        expect(screen.queryByRole('heading', { name: 'Watchlist' })).not.toBeInTheDocument()
    })

    it('has no badge without open positions', () => {
        renderSidebar('stock-table')

        expect(screen.getByRole('button', { name: /^Trades/ })).toHaveTextContent('Trades')
    })

    it('marks the Trades page as current', () => {
        renderSidebar('trades')

        expect(screen.getByRole('button', { name: /^Trades/ })).toHaveAttribute('aria-current', 'page')
    })
})
