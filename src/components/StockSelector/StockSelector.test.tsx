import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '../../test/utils/testHelpers'
import StockSelector from './StockSelector'
import { useStockSelection } from '../../context/StockSelectionContext'
import usStocks from '../../assets/us.json'

const getStockInput = () => screen.getByRole('combobox', { name: /Stock Symbol/i })

const SelectionProbe = () => {
    const { symbol, exchange, apiKey } = useStockSelection()
    return <output data-testid="selection">{`${symbol}.${exchange}|${apiKey}`}</output>
}

const renderSelector = () => render(
    <>
        <StockSelector />
        <SelectionProbe />
    </>
)

describe('StockSelector Component', () => {
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

            await user.click(screen.getByLabelText(/Exchange/i))
            await user.click(await screen.findByRole('option', { name: 'HE' }))
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
            expect(screen.getByLabelText(/Exchange/i)).toHaveTextContent('US')
        })

        it('renders the API Key field with the demo placeholder', () => {
            renderSelector()
            expect(screen.getByLabelText(/API Key/i)).toHaveAttribute('placeholder', "Optional (defaults to 'demo')")
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

            await user.click(screen.getByLabelText(/Exchange/i))
            await user.click(await screen.findByRole('option', { name: 'HE' }))

            expect(screen.getByTestId('selection')).toHaveTextContent('AAPL.HE|')
        })

        it('after choosing HE, the autocomplete offers HE stocks', async () => {
            const user = userEvent.setup()
            renderSelector()

            await user.click(screen.getByLabelText(/Exchange/i))
            await user.click(await screen.findByRole('option', { name: 'HE' }))

            const autocomplete = getStockInput()
            await user.type(autocomplete, 'NOKIA')
            await user.click(await screen.findByRole('option', { name: /Nokia Oyj \(NOKIA\)/i }))

            expect(screen.getByTestId('selection')).toHaveTextContent('NOKIA.HE|')
        })

        it('typing an API key updates the shared API key', async () => {
            const user = userEvent.setup()
            renderSelector()

            await user.type(screen.getByLabelText(/API Key/i), 'test-api-key')

            expect(screen.getByTestId('selection')).toHaveTextContent('AAPL.US|test-api-key')
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
