import { describe, it, expect, beforeEach, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { fireEvent, render, screen } from '../../test/utils/testHelpers'
import PasteTradePanel from './PasteTradePanel'
import { loadTrades, saveTrades } from '../../utils/tradesStorage'
import type { Trade } from '../../utils/trades'

const SELL = `Vahvista toimeksianto
* Instrumentti
MINI L NOKIA NORDNET FI24
* Osta/myy
Myyntitoimeksianto
* Määrä200
* Hinta/kpl1,92 EUR
* Välityspalkkio−0,00 EUR`

const position: Trade = {
    id: 't1',
    instrument: 'MINI L NOKIA NORDNET FI24',
    quantity: 200,
    currency: 'EUR',
    open: { price: 1.62, commission: 2, date: '2026-10-09' },
    createdAt: '2026-10-09T08:00:00.000Z',
}

describe('PasteTradePanel', () => {
    beforeEach(() => {
        localStorage.clear()
        saveTrades([position])
    })

    it('closes only the edited quantity of a matching position', async () => {
        const user = userEvent.setup()
        render(<PasteTradePanel onSaved={vi.fn()} />)

        fireEvent.change(screen.getByLabelText('Paste a Nordnet order confirmation'), { target: { value: SELL } })
        await user.clear(screen.getByLabelText('Quantity'))
        await user.type(screen.getByLabelText('Quantity'), '100')
        await user.click(screen.getByRole('button', { name: 'Close position' }))

        const trades = loadTrades()
        expect(trades.find(trade => trade.close)?.quantity).toBe(100)
        expect(trades.find(trade => !trade.close)?.quantity).toBe(100)
    })
})
