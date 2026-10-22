import { describe, it, expect, afterEach, vi } from 'vitest'
import {
    Trade,
    TradeGoal,
    costBasis,
    formatMoney,
    formatPercent,
    formatSignedMoney,
    openPnl,
    proceeds,
    progressSeries,
    realisedPnl,
    realisedPct,
    newTradeId,
    splitForClose,
    summary,
    todayIso,
} from './trades'

const trade = (overrides: Partial<Trade> = {}): Trade => ({
    id: 't1',
    instrument: 'MINI L NOKIA NORDNET FI24',
    quantity: 200,
    currency: 'EUR',
    open: { price: 1.62, commission: 0, date: '2026-10-09' },
    createdAt: '2026-10-09T08:00:00.000Z',
    ...overrides,
})

const closedTrade = (overrides: Partial<Trade> = {}) =>
    trade({ close: { price: 1.92, commission: 0, date: '2026-10-16' }, ...overrides })

const goal: TradeGoal = { amount: 1000, currency: 'EUR' }

describe('costBasis', () => {
    it('is quantity × price plus the opening commission', () => {
        expect(costBasis(trade())).toBe(324)
        expect(costBasis(trade({ open: { price: 1.62, commission: 4, date: '2026-10-09' } }))).toBe(328)
    })
})

describe('proceeds', () => {
    it('is quantity × sell price minus the selling commission', () => {
        expect(proceeds(closedTrade())).toBe(384)
        expect(proceeds(closedTrade({ close: { price: 2, commission: 3, date: '2026-10-16' } }))).toBe(397)
    })

    it('is null while the position is open', () => {
        expect(proceeds(trade())).toBeNull()
    })
})

describe('realisedPnl and realisedPct', () => {
    it('works out the sample trade as +60.00 € and +18.5 %', () => {
        expect(realisedPnl(closedTrade())).toBeCloseTo(60, 10)
        expect(realisedPct(closedTrade())).toBeCloseTo(60 / 324, 10)
        expect(formatPercent(realisedPct(closedTrade()))).toBe('+18.5%')
    })

    it('subtracts the commission on both legs', () => {
        const withFees = closedTrade({
            open: { price: 1.62, commission: 2, date: '2026-10-09' },
            close: { price: 1.92, commission: 3, date: '2026-10-16' },
        })

        expect(realisedPnl(withFees)).toBeCloseTo(60 - 5, 10)
    })

    it('is zero and null while the position is open', () => {
        expect(realisedPnl(trade())).toBe(0)
        expect(realisedPct(trade())).toBeNull()
    })
})

describe('openPnl', () => {
    it('is quantity × price now minus the cost', () => {
        expect(openPnl(trade({ priceNow: 1.8 }))).toBeCloseTo(360 - 324, 10)
    })

    it('is null without a price now', () => {
        expect(openPnl(trade())).toBeNull()
    })

    it('is null for a closed position', () => {
        expect(openPnl(closedTrade({ priceNow: 1.8 }))).toBeNull()
    })
})

describe('summary', () => {
    const nokia = closedTrade()
    const amd = trade({
        id: 't2',
        instrument: 'MINI AMD',
        open: { price: 2, commission: 0, date: '2026-10-05' },
        close: { price: 1.8, commission: 0, date: '2026-10-12' },
    })
    const stillOpen = trade({ id: 't3', instrument: 'MINI OPTA', priceNow: 2 })

    it('counts closed EUR trades and ignores open ones', () => {
        const result = summary([nokia, amd, stillOpen], goal)

        expect(result.realised).toBeCloseTo(60 - 40, 10)
        expect(result.closedCount).toBe(2)
        expect(result.wins).toBe(1)
        expect(result.losses).toBe(1)
        expect(result.winRate).toBe(0.5)
        expect(result.best).toBeCloseTo(60, 10)
        expect(result.worst).toBeCloseTo(-40, 10)
        expect(result.excludedCurrencies).toEqual([])
    })

    it('adds the open P&L to make the projection', () => {
        const result = summary([nokia, stillOpen], goal)

        expect(result.openPnl).toBeCloseTo(200 * 2 - 324, 10)
        expect(result.projected).toBeCloseTo(60 + (200 * 2 - 324), 10)
    })

    it('counts open positions without a price now as nothing', () => {
        expect(summary([trade()], goal).openPnl).toBe(0)
    })

    it('leaves other currencies out and lists them', () => {
        const dollar = trade({ id: 't4', currency: 'USD', close: { price: 1.92, commission: 0, date: '2026-10-16' } })
        const result = summary([nokia, dollar], goal)

        expect(result.realised).toBeCloseTo(60, 10)
        expect(result.closedCount).toBe(1)
        expect(result.excludedCurrencies).toEqual(['USD'])
    })

    it('only counts trades closed on or after the goal start', () => {
        const result = summary([nokia, amd], { ...goal, since: '2026-10-14' })

        expect(result.closedCount).toBe(1)
        expect(result.realised).toBeCloseTo(60, 10)
    })

    it('is empty before anything is closed', () => {
        const result = summary([trade()], null)

        expect(result).toMatchObject({
            realised: 0,
            openPnl: 0,
            projected: 0,
            closedCount: 0,
            wins: 0,
            losses: 0,
            winRate: 0,
            best: null,
            worst: null,
        })
    })
})

describe('progressSeries', () => {
    it('accumulates realised EUR by close date, oldest first', () => {
        const first = trade({ id: 'a', close: { price: 1.92, commission: 0, date: '2026-10-16' } })
        const second = trade({ id: 'b', close: { price: 1.42, commission: 0, date: '2026-10-20' } })
        const stillOpen = trade({ id: 'c' })

        const series = progressSeries([second, stillOpen, first], goal)

        expect(series.map(point => point.date)).toEqual(['2026-10-16', '2026-10-20'])
        expect(series.map(point => Math.round(point.cumulative))).toEqual([60, 20])
    })

    it('is empty without closed trades', () => {
        expect(progressSeries([trade()], goal)).toEqual([])
    })
})

describe('splitForClose', () => {
    it('closes everything when the whole position is sold', () => {
        const [closed, remaining] = splitForClose(trade(), 200, { price: 1.92, commission: 0, date: '2026-10-16' })

        expect(closed).toMatchObject({ id: 't1', quantity: 200, close: { price: 1.92 } })
        expect(realisedPnl(closed)).toBeCloseTo(60, 10)
        expect(remaining).toBeNull()
    })

    it('splits the opening commission pro rata and gives the remainder a new id', () => {
        const [closed, remaining] = splitForClose(
            trade({ open: { price: 1.62, commission: 4, date: '2026-10-09' } }),
            100,
            { price: 1.92, commission: 2, date: '2026-10-16' },
        )

        expect(closed.quantity).toBe(100)
        expect(closed.open.commission).toBeCloseTo(2, 10)
        expect(closed.id).toBe('t1')
        expect(remaining).toMatchObject({ quantity: 100 })
        expect(remaining?.id).not.toBe('t1')
        expect(remaining?.open.commission).toBeCloseTo(2, 10)
        expect(remaining?.close).toBeUndefined()
    })

    it('never closes more than the position holds', () => {
        const [closed, remaining] = splitForClose(trade(), 500, { price: 1.92, commission: 0, date: '2026-10-16' })

        expect(closed.quantity).toBe(200)
        expect(remaining).toBeNull()
    })

    it('drops the price now from the closed part', () => {
        const [closed] = splitForClose(trade({ priceNow: 1.8 }), 200, { price: 1.92, commission: 0, date: '2026-10-16' })

        expect(closed.priceNow).toBeUndefined()
    })
})

describe('newTradeId', () => {
    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it('uses crypto.randomUUID when the browser has it', () => {
        vi.stubGlobal('crypto', { randomUUID: () => 'uuid-1' })

        expect(newTradeId()).toBe('uuid-1')
    })

    it('falls back to a random id on older browsers', () => {
        vi.stubGlobal('crypto', {})

        expect(newTradeId()).toMatch(/^trade-/)
    })
})

describe('formatting', () => {
    it('always shows the sign on P&L, with a unicode minus', () => {
        expect(formatSignedMoney(60)).toBe('+60.00 €')
        expect(formatSignedMoney(-12.4)).toBe('−12.40 €')
        expect(formatSignedMoney(0)).toBe('0.00 €')
        expect(formatSignedMoney(-0.001)).toBe('0.00 €')
    })

    it('rounds to cents only for display', () => {
        expect(formatMoney(1 / 3)).toBe('0.33 €')
        expect(formatMoney(1234.5)).toBe('1,234.50 €')
        expect(formatMoney(1234.5, 'USD')).toBe('1,234.50 USD')
        expect(formatMoney(-1.005)).toBe('−1.00 €')
    })

    it('shows a dash when there is no percentage', () => {
        expect(formatPercent(null)).toBe('—')
        expect(formatPercent(-0.053)).toBe('−5.3%')
    })
})

describe('todayIso', () => {
    it('formats today as YYYY-MM-DD in the browser timezone', () => {
        const now = new Date(2026, 9, 9, 23, 30)

        vi.useFakeTimers()
        vi.setSystemTime(now)
        try {
            expect(todayIso()).toBe('2026-10-09')
        } finally {
            vi.useRealTimers()
        }
    })
})