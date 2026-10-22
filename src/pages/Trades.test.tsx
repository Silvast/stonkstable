import { describe, it, expect, beforeEach, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen, waitFor, within } from '../test/utils/testHelpers'
import Trades from './Trades'
import { loadTrades, saveTrades, saveTradeGoal } from '../utils/tradesStorage'
import type { Trade } from '../utils/trades'

const SELL_ORDER = `Vahvista toimeksianto
* Instrumentti
MINI L NOKIA NORDNET FI24
* Osta/myy
Myyntitoimeksianto
* Tili
Uusi nousu
 · 20339206
* ToimeksiantotyyppiLimit
* Määrä200
* Hinta/kpl1,92 EUR
* Voimassaolo (valitun pvm. loppuun asti)22.10.2026
* Välityspalkkio−0,00 EUR
* Yhteensä384,00 EUR`

const BUY_ORDER = `Vahvista toimeksianto
* Instrumentti
MINI L NOKIA NORDNET FI24
* Osta/myy
Ostotoimeksianto
* Tili
Uusi nousu
 · 20339206
* Määrä200
* Hinta/kpl1,62 EUR
* Välityspalkkio0,00 EUR`

const openPosition = (overrides: Partial<Trade> = {}): Trade => ({
    id: 't1',
    instrument: 'MINI L NOKIA NORDNET FI24',
    account: 'Uusi nousu · 20339206',
    quantity: 200,
    currency: 'EUR',
    open: { price: 1.62, commission: 0, date: '2026-10-09' },
    createdAt: '2026-10-09T08:00:00.000Z',
    ...overrides,
})

const pasteBox = () => screen.getByLabelText(/Paste a Nordnet order confirmation/)

const paste = async (user: ReturnType<typeof userEvent.setup>, text: string) => {
    const box = pasteBox()
    await user.click(box)
    await user.paste(text)
}

const renderPage = () => render(<Trades />)

/** Dialogs fade out, so wait for the page behind them to be reachable again. */
const dialogClosed = () => waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

const openRow = () => within(screen.getByRole('table', { name: 'Open positions' })).getAllByRole('row')[1]

describe('Trades page', () => {
    beforeEach(() => {
        localStorage.clear()
        vi.clearAllMocks()
    })

    describe('empty state', () => {
        it('asks for a paste and offers to set a goal', () => {
            renderPage()

            expect(screen.getByRole('heading', { level: 1, name: 'Trades' })).toBeInTheDocument()
            expect(screen.getByText('No open positions. Paste a Nordnet confirmation above to add one.')).toBeInTheDocument()
            expect(screen.getByText('Set a goal')).toBeInTheDocument()
            expect(screen.getByText('Saved in this browser only')).toBeInTheDocument()
        })
    })

    describe('pasting an order', () => {
        it('saves a buy order as an open position', async () => {
            const user = userEvent.setup()
            renderPage()

            await paste(user, BUY_ORDER)

            expect(screen.getByText('Buy')).toBeInTheDocument()
            expect(screen.getByLabelText('Instrument')).toHaveValue('MINI L NOKIA NORDNET FI24')
            expect(screen.getByLabelText('Quantity')).toHaveValue('200')
            expect(screen.getByLabelText('Price per unit')).toHaveValue('1.62')
            expect((screen.getByLabelText('Date') as HTMLInputElement).value).toMatch(/^\d{4}-\d{2}-\d{2}$/)

            await user.click(screen.getByRole('button', { name: 'Save' }))

            expect(screen.getByText('Saved MINI L NOKIA NORDNET FI24')).toBeInTheDocument()
            expect(pasteBox()).toHaveValue('')
            expect(loadTrades()).toHaveLength(1)
            expect(loadTrades()[0]).toMatchObject({
                instrument: 'MINI L NOKIA NORDNET FI24',
                account: 'Uusi nousu · 20339206',
                quantity: 200,
                open: { price: 1.62, commission: 0 },
            })
        })

        it('takes the trade out again with Undo', async () => {
            const user = userEvent.setup()
            renderPage()

            await paste(user, BUY_ORDER)
            await user.click(screen.getByRole('button', { name: 'Save' }))
            expect(loadTrades()).toHaveLength(1)

            await user.click(screen.getByRole('button', { name: 'Undo' }))

            expect(loadTrades()).toEqual([])
            expect(screen.getByText('No open positions. Paste a Nordnet confirmation above to add one.')).toBeInTheDocument()
        })

        it('saves a sell order as an open position when nothing matches', async () => {
            const user = userEvent.setup()
            renderPage()

            await paste(user, SELL_ORDER)
            expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()

            await user.click(screen.getByRole('button', { name: 'Save' }))

            expect(loadTrades()).toHaveLength(1)
            expect(loadTrades()[0]).toMatchObject({ quantity: 200, open: { price: 1.92 } })
        })

        it('closes the matching position instead of opening a new one', async () => {
            const user = userEvent.setup()
            saveTrades([openPosition()])
            renderPage()

            await paste(user, SELL_ORDER)

            expect(screen.getByText(/This closes your open position in MINI L NOKIA NORDNET FI24/)).toBeInTheDocument()
            expect(screen.getByLabelText('Sold on')).toBeInTheDocument()

            await user.click(screen.getByRole('button', { name: 'Close position' }))
            await dialogClosed()

            expect(loadTrades()[0].close).toMatchObject({ price: 1.92, commission: 0 })
            expect(screen.getByText('No open positions. Paste a Nordnet confirmation above to add one.')).toBeInTheDocument()
            const rows = within(screen.getByRole('table', { name: 'Closed trades' })).getAllByRole('row')
            expect(within(rows[1]).getByText('+60.00 €')).toBeInTheDocument()
        })

        it('saves as a new open position when the user asks for it', async () => {
            const user = userEvent.setup()
            saveTrades([openPosition()])
            renderPage()

            await paste(user, SELL_ORDER)
            await user.click(screen.getByRole('button', { name: 'Save as a new open position instead' }))
            await user.click(screen.getByRole('button', { name: 'Save' }))

            expect(loadTrades()).toHaveLength(2)
        })

        it('warns when the total does not match quantity × price', async () => {
            const user = userEvent.setup()
            renderPage()

            await paste(user, `${BUY_ORDER}\n* Yhteensä999,00 EUR`)

            expect(screen.getByText("Total doesn't match quantity × price")).toBeInTheDocument()
        })

        it('explains unrecognised text and keeps saving disabled until the fields are filled in', async () => {
            const user = userEvent.setup()
            renderPage()

            await paste(user, 'Instrument: Nokia\nQuantity: 100')

            expect(screen.getByText(/Couldn't find price and quantity in this text/)).toBeInTheDocument()
            expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()

            await user.type(screen.getByLabelText('Instrument'), 'MINI L NOKIA NORDNET FI24')
            await user.type(screen.getByLabelText('Quantity'), '100')
            await user.type(screen.getByLabelText('Price per unit'), '1,62')

            expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled()
            await user.click(screen.getByRole('button', { name: 'Save' }))

            expect(loadTrades()[0]).toMatchObject({ quantity: 100, open: { price: 1.62 } })
        })

        it('clears the form with Clear', async () => {
            const user = userEvent.setup()
            renderPage()

            await paste(user, BUY_ORDER)
            await user.click(screen.getByRole('button', { name: 'Clear' }))

            expect(pasteBox()).toHaveValue('')
            expect(screen.getByLabelText('Instrument')).toHaveValue('')
        })

        it('starts an empty form with Enter manually', async () => {
            const user = userEvent.setup()
            renderPage()

            await user.click(screen.getByRole('button', { name: 'Enter manually' }))
            await user.type(screen.getByLabelText('Instrument'), 'MINI OPTA NORDNET FI24')
            await user.type(screen.getByLabelText('Quantity'), '50')
            await user.type(screen.getByLabelText('Price per unit'), '3.10')
            await user.click(screen.getByRole('button', { name: 'Save' }))

            expect(loadTrades()[0]).toMatchObject({ instrument: 'MINI OPTA NORDNET FI24', quantity: 50, open: { price: 3.1 } })
        })

        it('focuses the paste box from Add trade', async () => {
            const user = userEvent.setup()
            renderPage()

            await user.click(screen.getByRole('button', { name: 'Add trade' }))

            expect(pasteBox()).toHaveFocus()
        })
    })

    describe('open positions', () => {
        beforeEach(() => {
            saveTrades([openPosition({ priceNow: 1.8 })])
        })

        it('shows the position with its cost and open P&L', () => {
            renderPage()

            const row = openRow()
            expect(within(row).getByText('MINI L NOKIA NORDNET FI24')).toBeInTheDocument()
            expect(within(row).getByText('Uusi nousu · 20339206')).toBeInTheDocument()
            expect(within(row).getByText('324.00 €')).toBeInTheDocument()
            expect(within(row).getByText('9 Oct 2026')).toBeInTheDocument()
            expect(within(row).getByText('+36.00 €')).toBeInTheDocument()
            expect(within(row).getByText('+11.1%')).toBeInTheDocument()
        })

        it('records a hand typed price now', async () => {
            const user = userEvent.setup()
            renderPage()

            const input = screen.getByLabelText('Price now for MINI L NOKIA NORDNET FI24')
            await user.clear(input)
            await user.type(input, '1.5{Enter}')

            expect(loadTrades()[0].priceNow).toBe(1.5)
            expect(within(openRow()).getByText('−24.00 €')).toBeInTheDocument()
        })

        it('closes the position from the Close dialog', async () => {
            const user = userEvent.setup()
            renderPage()

            await user.click(screen.getByRole('button', { name: 'Close' }))

            const dialog = screen.getByRole('dialog')
            expect(within(dialog).getByText('Close MINI L NOKIA NORDNET FI24')).toBeInTheDocument()
            expect(within(dialog).getByLabelText('Sell price per unit')).toHaveValue('1.8')

            await user.click(within(dialog).getByRole('button', { name: 'Close position' }))
            await dialogClosed()

            expect(loadTrades()[0].close).toMatchObject({ price: 1.8 })
            expect(screen.getByRole('table', { name: 'Closed trades' })).toBeInTheDocument()
        })

        it('edits a position in a dialog', async () => {
            const user = userEvent.setup()
            renderPage()

            await user.click(screen.getByRole('button', { name: 'More actions for MINI L NOKIA NORDNET FI24' }))
            await user.click(screen.getByRole('menuitem', { name: 'Edit' }))
            const dialog = screen.getByRole('dialog')
            await user.clear(within(dialog).getByLabelText('Quantity'))
            await user.type(within(dialog).getByLabelText('Quantity'), '150')
            await user.click(within(dialog).getByRole('button', { name: 'Save' }))
            await dialogClosed()

            expect(loadTrades()[0].quantity).toBe(150)
            expect(within(openRow()).getByText('150')).toBeInTheDocument()
        })

        it('deletes a position with Undo', async () => {
            const user = userEvent.setup()
            renderPage()

            await user.click(screen.getByRole('button', { name: 'More actions for MINI L NOKIA NORDNET FI24' }))
            await user.click(screen.getByRole('menuitem', { name: 'Delete' }))
            expect(loadTrades()).toEqual([])

            await user.click(screen.getByRole('button', { name: 'Undo' }))

            expect(loadTrades()).toHaveLength(1)
        })
    })

    describe('on a phone', () => {
        const narrow = () => {
            const matchMedia = window.matchMedia
            window.matchMedia = vi.fn().mockImplementation((query: string) => ({
                ...matchMedia(query),
                matches: query.includes('max-width:599'),
            }))
            return () => { window.matchMedia = matchMedia }
        }

        it('stacks the positions into cards instead of a table', () => {
            saveTrades([openPosition({ priceNow: 1.8 }), openPosition({ id: 't2', instrument: 'MINI OPTA NORDNET FI24', close: { price: 1.8, commission: 0, date: '2026-10-16' } })])
            const restore = narrow()
            try {
                renderPage()

                expect(screen.queryByRole('table', { name: 'Open positions' })).not.toBeInTheDocument()
                expect(screen.getByText('200 × 1.62 → now 1.80')).toBeInTheDocument()
                expect(screen.getByText('200 × 1.62 → 1.80')).toBeInTheDocument()
            } finally {
                restore()
            }
        })
    })

    describe('goal', () => {
        it('moves the progress bar when a trade is closed', async () => {
            const user = userEvent.setup()
            saveTradeGoal({ amount: 1000, currency: 'EUR' })
            saveTrades([openPosition()])
            renderPage()

            expect(screen.getByText('Make 1,000.00 €')).toBeInTheDocument()
            expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')

            await user.click(screen.getByRole('button', { name: 'Close' }))
            const dialog = screen.getByRole('dialog')
            await user.type(within(dialog).getByLabelText('Sell price per unit'), '1.92')
            await user.click(within(dialog).getByRole('button', { name: 'Close position' }))
            await dialogClosed()

            expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '6')
            expect(within(screen.getByRole('table', { name: 'Closed trades' })).getAllByText('+60.00 €').length).toBeGreaterThan(0)
        })

        it('sets a goal from the panel', async () => {
            const user = userEvent.setup()
            renderPage()

            await user.type(screen.getByLabelText('Goal amount'), '1000')
            await user.click(screen.getByRole('button', { name: 'Save goal' }))

            expect(screen.getByText('Make 1,000.00 €')).toBeInTheDocument()
            expect(screen.queryByText('Set a goal')).not.toBeInTheDocument()
        })

        it('edits the goal in a dialog and can remove it again', async () => {
            const user = userEvent.setup()
            saveTradeGoal({ amount: 1000, currency: 'EUR' })
            renderPage()

            await user.click(screen.getByRole('button', { name: 'Edit goal' }))
            const dialog = screen.getByRole('dialog')
            await user.clear(within(dialog).getByLabelText('Amount (EUR)'))
            await user.type(within(dialog).getByLabelText('Amount (EUR)'), '250')
            await user.click(within(dialog).getByRole('button', { name: 'Save goal' }))
            await dialogClosed()

            expect(screen.getByText('Make 250.00 €')).toBeInTheDocument()

            await user.click(screen.getByRole('button', { name: 'Edit goal' }))
            await user.click(screen.getByRole('button', { name: 'Remove goal' }))
            await dialogClosed()

            expect(screen.getByText('Set a goal')).toBeInTheDocument()
        })

        it('counts the win rate and the closed trades', () => {
            saveTradeGoal({ amount: 1000, currency: 'EUR' })
            saveTrades([
                openPosition({ id: 'a', close: { price: 1.92, commission: 0, date: '2026-10-16' } }),
                openPosition({ id: 'b', close: { price: 1.42, commission: 0, date: '2026-10-20' } }),
            ])
            renderPage()

            expect(screen.getByText('1 of 2')).toBeInTheDocument()
        })
    })

    describe('closed trades', () => {
        beforeEach(() => {
            saveTrades([
                openPosition({ id: 'a', close: { price: 1.92, commission: 0, date: '2026-10-16' } }),
                openPosition({ id: 'b', close: { price: 1.42, commission: 0, date: '2026-10-20' } }),
            ])
        })

        it('lists closed trades newest first with their result', () => {
            renderPage()

            const rows = within(screen.getByRole('table', { name: 'Closed trades' })).getAllByRole('row')
            expect(within(rows[1]).getByText('MINI L NOKIA NORDNET FI24')).toBeInTheDocument()
            expect(within(rows[1]).getByText('−40.00 €')).toBeInTheDocument()
            expect(within(rows[2]).getByText('+60.00 €')).toBeInTheDocument()
            expect(screen.getByText('9 Oct → 16 Oct, 7 d')).toBeInTheDocument()
        })

        it('adds up the visible rows in the footer', () => {
            renderPage()

            const rows = within(screen.getByRole('table', { name: 'Closed trades' })).getAllByRole('row')
            expect(within(rows[rows.length - 1]).getByText('+20.00 €')).toBeInTheDocument()
        })

        it('reopens a closed trade', async () => {
            const user = userEvent.setup()
            renderPage()

            const rows = within(screen.getByRole('table', { name: 'Closed trades' })).getAllByRole('row')
            await user.click(within(rows[1]).getByRole('button', { name: 'More actions for MINI L NOKIA NORDNET FI24' }))
            await user.click(screen.getByRole('menuitem', { name: 'Reopen' }))

            expect(loadTrades().filter(trade => !trade.close)).toHaveLength(1)
        })
    })

    describe('progress', () => {
        it('waits for two closed trades before drawing the chart', async () => {
            const user = userEvent.setup()
            renderPage()

            expect(screen.getByText('Close two trades to see how your realised profit builds up here.')).toBeInTheDocument()

            saveTrades([openPosition({ id: 'a', close: { price: 1.92, commission: 0, date: '2026-10-16' } })])
            await user.click(screen.getByRole('button', { name: 'Add trade' }))

            expect(screen.getByText('Close two trades to see how your realised profit builds up here.')).toBeInTheDocument()
        })

        it('draws the cumulative realised profit once two trades are closed', async () => {
            const user = userEvent.setup()
            saveTrades([
                openPosition({ id: 'a', close: { price: 1.92, commission: 0, date: '2026-10-16' } }),
                openPosition({ id: 'b', close: { price: 1.42, commission: 0, date: '2026-10-20' } }),
            ])
            renderPage()

            expect(screen.getByRole('img', { name: /Realised profit from 60.00 € to 20.00 €/ })).toBeInTheDocument()
            const ranges = screen.getByRole('group', { name: 'Range' })
            expect(within(ranges).getAllByRole('button').map(button => button.textContent)).toEqual(['1M', '3M', 'All'])

            await user.click(within(ranges).getByRole('button', { name: '1M' }))
            expect(within(ranges).getByRole('button', { name: '1M' })).toHaveAttribute('aria-pressed', 'true')
        })
    })
})