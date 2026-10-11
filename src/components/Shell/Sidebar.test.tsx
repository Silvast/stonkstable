import { describe, it, expect, beforeEach, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen, within } from '../../test/utils/testHelpers'
import Sidebar, { Page } from './Sidebar'
import { useStockSelection } from '../../context/StockSelectionContext'
import { FavouriteStock, saveFavourites } from '../../utils/favouritesStorage'
import { writeCache } from '../../utils/analysisCache'
import { mockStockData } from '../../test/mocks/stockApi'

const apple: FavouriteStock = { code: 'AAPL', exchange: 'US', name: 'Apple Inc', currency: 'USD', addedAt: '2026-10-10T08:00:00.000Z' }
const nokia: FavouriteStock = { code: 'NOKIA', exchange: 'HE', name: 'Nokia Oyj', currency: 'EUR', addedAt: '2026-10-08T08:00:00.000Z' }

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
