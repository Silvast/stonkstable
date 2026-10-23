import { describe, it, expect } from 'vitest'
import userEvent from '@testing-library/user-event'
import { screen, within } from '@testing-library/react'
import { render } from '../../test/utils/testHelpers'
import BacktestPanel from './BacktestPanel'
import { BiasBacktest } from '../../utils/biasBacktest'

const stat = (samples: number, hitRate: number | null, avgReturnPercent: number | null) => ({ samples, hitRate, avgReturnPercent })

const plenty: BiasBacktest = {
    days: 120,
    horizons: [1, 3, 5],
    rows: [
        { label: 'Leaning long', signals: 50, byHorizon: { 1: stat(50, 0.6, 0.4), 3: stat(48, 0.55, 0.9), 5: stat(46, 0.7, 1.5) } },
        { label: 'Leaning short', signals: 40, byHorizon: { 1: stat(40, 0.45, -0.2), 3: stat(39, 0.5, -0.3), 5: stat(38, 0.4, -0.6) } },
        { label: 'Stand aside', signals: 30, byHorizon: { 1: stat(30, null, 0.05), 3: stat(29, null, 0.1), 5: stat(28, null, -0.02) } },
    ],
    baseline: {
        1: { samples: 119, upRate: 0.52, downRate: 0.46, avgReturnPercent: 0.1 },
        3: { samples: 117, upRate: 0.53, downRate: 0.45, avgReturnPercent: 0.3 },
        5: { samples: 115, upRate: 0.54, downRate: 0.44, avgReturnPercent: 0.5 },
    },
}

const sparse: BiasBacktest = {
    ...plenty,
    days: 40,
    rows: [
        { label: 'Leaning long', signals: 5, byHorizon: { 1: stat(5, 0.8, 1.2), 3: stat(4, 0.5, 0.2), 5: stat(0, null, null) } },
        { label: 'Leaning short', signals: 0, byHorizon: { 1: stat(0, null, null), 3: stat(0, null, null), 5: stat(0, null, null) } },
        { label: 'Stand aside', signals: 35, byHorizon: { 1: stat(35, null, 0.0), 3: stat(34, null, 0.0), 5: stat(33, null, 0.0) } },
    ],
}

describe('BacktestPanel', () => {
    it('is collapsed until opened', async () => {
        const user = userEvent.setup()
        render(<BacktestPanel backtest={plenty} />)

        const toggle = screen.getByRole('button', { name: 'How has this signal done?' })
        expect(toggle).toHaveAttribute('aria-expanded', 'false')
        expect(screen.queryByRole('table', { name: 'Bias backtest results' })).not.toBeInTheDocument()

        await user.click(toggle)

        expect(toggle).toHaveAttribute('aria-expanded', 'true')
        expect(screen.getByRole('table', { name: 'Bias backtest results' })).toBeVisible()
    })

    it('shows hit rates and average returns for 1, 3 and 5 days', async () => {
        const user = userEvent.setup()
        render(<BacktestPanel backtest={plenty} />)
        await user.click(screen.getByRole('button', { name: 'How has this signal done?' }))

        const table = screen.getByRole('table', { name: 'Bias backtest results' })
        for (const header of ['1 day', '3 days', '5 days']) {
            expect(within(table).getByRole('columnheader', { name: header })).toBeInTheDocument()
        }
        const longRow = within(table).getByRole('row', { name: /Leaning long/ })
        expect(within(longRow).getByText('60%')).toBeInTheDocument()
        expect(within(longRow).getByText('55%')).toBeInTheDocument()
        expect(within(longRow).getByText('70%')).toBeInTheDocument()
        expect(within(longRow).getByText('+1.5%')).toBeInTheDocument()

        const shortRow = within(table).getByRole('row', { name: /Leaning short/ })
        expect(within(shortRow).getByText('45%')).toBeInTheDocument()
    })

    it('shows the base rate for all days alongside the signals', async () => {
        const user = userEvent.setup()
        render(<BacktestPanel backtest={plenty} />)
        await user.click(screen.getByRole('button', { name: 'How has this signal done?' }))

        const baseRow = within(screen.getByRole('table', { name: 'Bias backtest results' })).getByRole('row', { name: /All days/ })
        expect(within(baseRow).getByText('52% up')).toBeInTheDocument()
        expect(within(baseRow).getByText('46% down')).toBeInTheDocument()
    })

    it('does not show a hit rate for stand aside', async () => {
        const user = userEvent.setup()
        render(<BacktestPanel backtest={plenty} />)
        await user.click(screen.getByRole('button', { name: 'How has this signal done?' }))

        const asideRow = within(screen.getByRole('table', { name: 'Bias backtest results' })).getByRole('row', { name: /Stand aside/ })
        expect(within(asideRow).getAllByText('–')).toHaveLength(3)
        expect(within(asideRow).getAllByText('+0.1%')).toHaveLength(2)
    })

    it('says clearly when there are too few signals to judge', async () => {
        const user = userEvent.setup()
        render(<BacktestPanel backtest={sparse} />)
        await user.click(screen.getByRole('button', { name: 'How has this signal done?' }))

        expect(screen.getByText(/Too few signals to judge/)).toBeInTheDocument()
        const longRow = within(screen.getByRole('table', { name: 'Bias backtest results' })).getByRole('row', { name: /Leaning long/ })
        expect(within(longRow).getAllByText('n=5, too few')).toHaveLength(1)
        expect(within(longRow).getByText('no data')).toBeInTheDocument()
    })

    it('does not claim too few signals when every directional row has enough', async () => {
        const user = userEvent.setup()
        render(<BacktestPanel backtest={plenty} />)
        await user.click(screen.getByRole('button', { name: 'How has this signal done?' }))

        expect(screen.queryByText(/Too few signals to judge/)).not.toBeInTheDocument()
    })

    it('explains when there is not enough history', async () => {
        const user = userEvent.setup()
        render(<BacktestPanel backtest={{ ...plenty, days: 0, rows: [] }} />)
        await user.click(screen.getByRole('button', { name: 'How has this signal done?' }))

        expect(screen.getByText(/Not enough history to backtest yet/)).toBeInTheDocument()
    })
})
