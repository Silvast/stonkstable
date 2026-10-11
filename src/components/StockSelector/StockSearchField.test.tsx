import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render, chooseExchange, exchangeButton } from '../../test/utils/testHelpers'
import StockSearchField from './StockSearchField'
import ExchangeToggle from './ExchangeToggle'
import FavouriteToggle from '../Favourites/FavouriteToggle'
import { useStockSelection } from '../../context/StockSelectionContext'
import usStocks from '../../assets/us.json'
import { FavouriteStock, saveFavourites, loadFavourites } from '../../utils/favouritesStorage'

const favourite = (code: string, name: string, exchange: FavouriteStock['exchange'] = 'US'): FavouriteStock =>
    ({ code, exchange, name, currency: 'USD', addedAt: '2026-10-01T00:00:00.000Z' })

const openDropdown = async (user: ReturnType<typeof userEvent.setup>, text = '') => {
    const input = getStockInput()
    await user.clear(input)
    if (text) await user.type(input, text)
    await user.click(input)
    return screen.findByRole('listbox')
}

const getStockInput = () => screen.getByRole('combobox', { name: /Stock Symbol/i })

const SelectionProbe = () => {
    const { symbol, exchange, apiKey } = useStockSelection()
    return <output data-testid="selection">{`${symbol}.${exchange}|${apiKey}`}</output>
}

const Toolbar = () => {
    const { selectedStock, exchange } = useStockSelection()
    return (
        <>
            <StockSearchField />
            <ExchangeToggle />
            <FavouriteToggle stock={selectedStock} exchange={exchange} />
        </>
    )
}

const renderSelector = () => render(
    <>
        <Toolbar />
        <SelectionProbe />
    </>
)

describe('Stock search, exchange toggle and star', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        localStorage.clear()
    })

    describe('Favourite star', () => {
        it('toggles the selected stock as a favourite', async () => {
            const user = userEvent.setup()
            renderSelector()

            await user.click(screen.getByRole('button', { name: 'Add AAPL to favourites' }))

            expect(screen.getByRole('button', { name: 'Remove AAPL from favourites' })).toHaveAttribute('aria-pressed', 'true')
        })

        it('follows the selected stock and exchange', async () => {
            const user = userEvent.setup()
            renderSelector()
            await user.click(screen.getByRole('button', { name: 'Add AAPL to favourites' }))

            await chooseExchange(user, 'HE')
            await user.type(getStockInput(), 'NOKIA')
            await user.click(await screen.findByRole('option', { name: /Nokia Oyj \(NOKIA\)/i }))

            expect(screen.getByRole('button', { name: 'Add NOKIA to favourites' })).toHaveAttribute('aria-pressed', 'false')
        })
    })

    describe('Initial Render', () => {
        it('shows AAPL selected in the Stock Symbol autocomplete', () => {
            renderSelector()
            const autocomplete = getStockInput()
            expect(autocomplete).toHaveValue('Apple Inc (AAPL)')
        })

        it('shows US as default exchange', () => {
            renderSelector()
            expect(exchangeButton('US')).toHaveAttribute('aria-pressed', 'true')
        })
    })

    describe('Writes to the shared selection', () => {
        it('selecting a stock updates the shared symbol', async () => {
            const user = userEvent.setup()
            renderSelector()

            const autocomplete = getStockInput()
            await user.clear(autocomplete)
            await user.type(autocomplete, 'MSFT')
            await user.click(await screen.findByRole('option', { name: /Microsoft Corporation \(MSFT\)/i }))

            expect(screen.getByTestId('selection')).toHaveTextContent('MSFT.US|')
        })

        it('choosing the HE exchange updates the shared exchange', async () => {
            const user = userEvent.setup()
            renderSelector()

            await chooseExchange(user, 'HE')

            expect(screen.getByTestId('selection')).toHaveTextContent('AAPL.HE|')
        })

        it('after choosing HE, the autocomplete offers HE stocks', async () => {
            const user = userEvent.setup()
            renderSelector()

            await chooseExchange(user, 'HE')

            const autocomplete = getStockInput()
            await user.type(autocomplete, 'NOKIA')
            await user.click(await screen.findByRole('option', { name: /Nokia Oyj \(NOKIA\)/i }))

            expect(screen.getByTestId('selection')).toHaveTextContent('NOKIA.HE|')
        })
    })

    describe('Favourites in the dropdown', () => {
        it('groups favourites of the current exchange first under a Favourites header', async () => {
            const user = userEvent.setup()
            saveFavourites([favourite('MSFT', 'Microsoft Corporation'), favourite('AAPL', 'Apple Inc')])
            renderSelector()

            const listbox = await openDropdown(user)

            expect(within(listbox).getByText('Favourites')).toBeInTheDocument()
            expect(within(listbox).getByText('All stocks')).toBeInTheDocument()
            const options = within(listbox).getAllByRole('option')
            expect(options[0]).toHaveTextContent('Microsoft Corporation (MSFT)')
            expect(options[1]).toHaveTextContent('Apple Inc (AAPL)')
            expect(options.filter(option => option.textContent?.includes('(AAPL)'))).toHaveLength(1)
        })

        it('only groups favourites that match the search text', async () => {
            const user = userEvent.setup()
            saveFavourites([favourite('MSFT', 'Microsoft Corporation'), favourite('AAPL', 'Apple Inc')])
            renderSelector()

            const listbox = await openDropdown(user, 'Microsoft')

            expect(within(listbox).getAllByRole('option')[0]).toHaveTextContent('Microsoft Corporation (MSFT)')
            expect(within(listbox).queryByText(/Apple Inc \(AAPL\)/)).not.toBeInTheDocument()
        })

        it('does not group a favourite from another exchange that shares the code', async () => {
            const user = userEvent.setup()
            saveFavourites([favourite('ALEX', 'Alexandria Group Oyj', 'HE')])
            renderSelector()

            const listbox = await openDropdown(user, 'ALEX')

            expect(within(listbox).queryByText('Favourites')).not.toBeInTheDocument()
            const usAlex = within(listbox).getByRole('option', { name: /\(ALEX\)/ })
            expect(within(usAlex).getByRole('button', { name: 'Add ALEX to favourites' })).toBeInTheDocument()
        })

        it('shows a star on every option', async () => {
            const user = userEvent.setup()
            renderSelector()

            const listbox = await openDropdown(user, 'MSFT')

            const msft = within(listbox).getByRole('option', { name: /Microsoft Corporation \(MSFT\)/ })
            expect(within(msft).getByRole('button', { name: 'Add MSFT to favourites' })).toBeInTheDocument()
        })

        it('starring an option keeps the list open and the selected stock unchanged', async () => {
            const user = userEvent.setup()
            renderSelector()
            const listbox = await openDropdown(user, 'MSFT')
            const msft = within(listbox).getByRole('option', { name: /Microsoft Corporation \(MSFT\)/ })

            await user.click(within(msft).getByRole('button', { name: 'Add MSFT to favourites' }))

            expect(screen.getByRole('listbox')).toBeInTheDocument()
            expect(screen.getByRole('button', { name: 'Remove MSFT from favourites' })).toBeInTheDocument()
            expect(screen.getByTestId('selection')).toHaveTextContent('AAPL.US|')
            expect(loadFavourites().map(f => f.code)).toEqual(['MSFT'])
        })
    })

    describe('Performance Fix - Critical Regression Test', () => {
        it('limits autocomplete results to 100 items for performance', async () => {
            const user = userEvent.setup()
            renderSelector()

            expect(usStocks.length).toBeGreaterThan(50000)

            const autocomplete = getStockInput()
            await user.clear(autocomplete)
            await user.click(autocomplete)

            const listbox = await screen.findByRole('listbox')
            const options = within(listbox).queryAllByRole('option')
            expect(options.length).toBe(100)
        })

        it('still renders exactly 100 options when favourites are present', async () => {
            const user = userEvent.setup()
            saveFavourites([favourite('MSFT', 'Microsoft Corporation'), favourite('AAPL', 'Apple Inc')])
            renderSelector()

            const listbox = await openDropdown(user)

            expect(within(listbox).getAllByRole('option')).toHaveLength(100)
        })

        it('filterOptions stops early when limit is reached', async () => {
            const user = userEvent.setup()
            renderSelector()

            const autocomplete = getStockInput()
            await user.clear(autocomplete)
            await user.type(autocomplete, 'A')

            await waitFor(() => {
                const listbox = screen.getByRole('listbox')
                const options = within(listbox).queryAllByRole('option')
                expect(options.length).toBeLessThanOrEqual(100)
                expect(options.length).toBeGreaterThan(0)
            }, { timeout: 3000 })
        })
    })
})
