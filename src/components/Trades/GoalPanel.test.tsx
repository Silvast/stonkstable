import { describe, it, expect, beforeEach, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen } from '../../test/utils/testHelpers'
import GoalPanel from './GoalPanel'
import { saveTradeGoal, saveTrades } from '../../utils/tradesStorage'
import type { Trade } from '../../utils/trades'

const trade = (overrides: Partial<Trade> = {}): Trade => ({
    id: 't1',
    instrument: 'MINI L NOKIA NORDNET FI24',
    quantity: 200,
    currency: 'EUR',
    open: { price: 1.62, commission: 0, date: '2026-10-09' },
    createdAt: '2026-10-09T08:00:00.000Z',
    ...overrides,
})

const renderPanel = () => {
    const onEditGoal = vi.fn()
    render(<GoalPanel onEditGoal={onEditGoal} />)
    return onEditGoal
}

/** The KPI tile that carries this caption. */
const tile = (label: string) => screen.getByText(label).parentElement as HTMLElement

describe('GoalPanel', () => {
    beforeEach(() => {
        localStorage.clear()
    })

    it('asks for an amount when there is no goal, and saves it', async () => {
        render(<GoalPanel onEditGoal={vi.fn()} />)

        expect(screen.getByText('Set a goal')).toBeInTheDocument()

        const field = screen.getByLabelText('Goal amount')
        await userEvent.type(field, '1000')
        await userEvent.click(screen.getByRole('button', { name: 'Save goal' }))

        expect(screen.getByText('Make 1,000.00 €')).toBeInTheDocument()
    })

    it('shows the realised profit against the goal', () => {
        saveTradeGoal({ amount: 1000, currency: 'EUR', since: '2026-10-01' })
        saveTrades([trade({ close: { price: 1.92, commission: 0, date: '2026-10-16' } })])
        renderPanel()

        expect(screen.getByText('Make 1,000.00 €')).toBeInTheDocument()
        expect(screen.getByText('since 1 Oct 2026')).toBeInTheDocument()
        expect(screen.getByText('of 1,000.00 € · +6.0%')).toBeInTheDocument()
        expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '6')
        expect(screen.getByText('1 of 1')).toBeInTheDocument()
    })

    it('projects the open positions with a price now', () => {
        saveTradeGoal({ amount: 1000, currency: 'EUR' })
        saveTrades([trade({ priceNow: 1.8 })])
        renderPanel()

        expect(screen.getByText('Open positions would take this to +36.00 €, before selling commission.')).toBeInTheDocument()
        expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
    })

    it('shows a dash for the open P&L while no price now is set', () => {
        saveTradeGoal({ amount: 1000, currency: 'EUR' })
        saveTrades([trade()])
        renderPanel()

        expect(screen.getByText('Open P&L')).toBeInTheDocument()
        expect(screen.getAllByText('—').length).toBeGreaterThan(0)
    })

    it('leaves trades in other currencies out of the totals', () => {
        saveTradeGoal({ amount: 1000, currency: 'EUR' })
        saveTrades([
            trade({ close: { price: 1.92, commission: 0, date: '2026-10-16' } }),
            trade({ id: 'usd', currency: 'USD', close: { price: 1.92, commission: 0, date: '2026-10-16' } }),
        ])
        renderPanel()

        expect(screen.getByText('USD trades are left out of these totals.')).toBeInTheDocument()
        expect(tile('Realised')).toHaveTextContent('+60.00 €')
    })

    it('opens the goal dialog', async () => {
        saveTradeGoal({ amount: 1000, currency: 'EUR' })
        const onEditGoal = renderPanel()

        await userEvent.click(screen.getByRole('button', { name: 'Edit goal' }))

        expect(onEditGoal).toHaveBeenCalled()
    })

    it('ignores trades closed before the goal started', () => {
        saveTradeGoal({ amount: 1000, currency: 'EUR', since: '2026-10-20' })
        saveTrades([trade({ close: { price: 1.92, commission: 0, date: '2026-10-16' } })])
        renderPanel()

        expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
        expect(tile('Closed trades')).toHaveTextContent('0')
    })
})