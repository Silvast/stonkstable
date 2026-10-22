import { describe, it, expect, beforeEach, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen, within } from '../../test/utils/testHelpers'
import CloseTradeDialog from './CloseTradeDialog'
import { loadTrades, saveTradeGoal, saveTrades } from '../../utils/tradesStorage'
import type { Trade } from '../../utils/trades'

const position: Trade = {
    id: 't1',
    instrument: 'MINI L NOKIA NORDNET FI24',
    account: 'Uusi nousu · 20339206',
    quantity: 200,
    currency: 'EUR',
    open: { price: 1.62, commission: 2, date: '2026-10-09' },
    createdAt: '2026-10-09T08:00:00.000Z',
}

const renderDialog = (trade: Trade | null = position) => {
    const onClose = vi.fn()
    render(<CloseTradeDialog trade={trade} onClose={onClose} />)
    return onClose
}

describe('CloseTradeDialog', () => {
    beforeEach(() => {
        localStorage.clear()
        saveTrades([position])
    })

    it('starts from the price now, the whole position and the opening commission', () => {
        renderDialog({ ...position, priceNow: 1.8 })

        const dialog = screen.getByRole('dialog')
        expect(within(dialog).getByLabelText('Sell price per unit')).toHaveValue('1.8')
        expect(within(dialog).getByLabelText('Quantity')).toHaveValue('200')
        expect(within(dialog).getByLabelText('Commission')).toHaveValue('2')
        expect((within(dialog).getByLabelText('Sold on') as HTMLInputElement).value).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it('shows proceeds, cost and the profit before saving', () => {
        renderDialog({ ...position, priceNow: 1.8 })

        const dialog = screen.getByRole('dialog')

        expect(within(dialog).getByText('358.00 €')).toBeInTheDocument()
        expect(within(dialog).getByText('326.00 €')).toBeInTheDocument()
        expect(within(dialog).getByText('+32.00 €')).toBeInTheDocument()
    })

    it('closes the position and tells the page it is done', async () => {
        const user = userEvent.setup()
        const onClose = renderDialog({ ...position, priceNow: 1.8 })

        const dialog = screen.getByRole('dialog')
        await user.click(within(dialog).getByRole('button', { name: 'Close position' }))

        expect(loadTrades()[0].close).toMatchObject({ price: 1.8, commission: 2 })
        expect(loadTrades()[0].quantity).toBe(200)
        expect(onClose).toHaveBeenCalled()
    })

    it('closes part of the position', async () => {
        const user = userEvent.setup()
        renderDialog({ ...position, priceNow: 1.8 })

        const dialog = screen.getByRole('dialog')
        await user.clear(within(dialog).getByLabelText('Quantity'))
        await user.type(within(dialog).getByLabelText('Quantity'), '100')
        await user.click(within(dialog).getByRole('button', { name: 'Close position' }))

        const trades = loadTrades()
        expect(trades.find(trade => trade.close)?.quantity).toBe(100)
        expect(trades.find(trade => !trade.close)?.quantity).toBe(100)
    })

    it('refuses a price of zero and more than the quantity held', async () => {
        const user = userEvent.setup()
        renderDialog({ ...position, priceNow: 1.8 })

        const dialog = screen.getByRole('dialog')
        const confirm = within(dialog).getByRole('button', { name: 'Close position' })

        await user.clear(within(dialog).getByLabelText('Sell price per unit'))
        await user.type(within(dialog).getByLabelText('Quantity'), '500')

        expect(within(dialog).getByText('Enter the price you sold at')).toBeInTheDocument()
        expect(confirm).toBeDisabled()

        await user.type(within(dialog).getByLabelText('Sell price per unit'), '1.9')
        expect(within(dialog).getByText('Enter a quantity between 1 and 200')).toBeInTheDocument()
        expect(confirm).toBeDisabled()
    })

    it('refuses a sell date before the position was opened', async () => {
        const user = userEvent.setup()
        renderDialog({ ...position, priceNow: 1.8 })

        const dialog = screen.getByRole('dialog')
        await user.clear(within(dialog).getByLabelText('Sold on'))
        await user.type(within(dialog).getByLabelText('Sold on'), '2026-10-01')

        expect(within(dialog).getByText('The sell date is before 2026-10-09')).toBeInTheDocument()
        expect(within(dialog).getByRole('button', { name: 'Close position' })).toBeDisabled()
    })

    it('shows where the goal stands before and after', () => {
        saveTradeGoal({ amount: 1000, currency: 'EUR' })
        saveTrades([{ ...position, id: 'closed', close: { price: 1.92, commission: 0, date: '2026-10-16' } }])
        renderDialog({ ...position, priceNow: 1.8 })

        expect(screen.getByText('Goal: +58.00 € → +90.00 € of 1,000.00 €')).toBeInTheDocument()
    })

    it('closes without saving on Cancel', async () => {
        const user = userEvent.setup()
        const onClose = renderDialog()

        await user.click(screen.getByRole('button', { name: 'Cancel' }))

        expect(loadTrades()[0].close).toBeUndefined()
        expect(onClose).toHaveBeenCalled()
    })
})