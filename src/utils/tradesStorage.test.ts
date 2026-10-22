import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { TRADES_KEY, TRADE_GOAL_KEY, loadTrades, saveTrades, clearTrades, loadTradeGoal, saveTradeGoal } from './tradesStorage'
import type { Trade, TradeGoal } from './trades'

const nokia: Trade = {
    id: 't1',
    instrument: 'MINI L NOKIA NORDNET FI24',
    account: 'Uusi nousu · 20339206',
    quantity: 200,
    currency: 'EUR',
    open: { price: 1.62, commission: 0, date: '2026-10-09' },
    createdAt: '2026-10-09T08:00:00.000Z',
}

const closed: Trade = { ...nokia, id: 't2', close: { price: 1.92, commission: 0, date: '2026-10-16' } }

describe('trades storage', () => {
    beforeEach(() => {
        localStorage.clear()
        vi.restoreAllMocks()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('starts empty when nothing is stored', () => {
        expect(loadTrades()).toEqual([])
        expect(loadTradeGoal()).toBeNull()
    })

    it('keeps every field of a trade through a save and a load', () => {
        saveTrades([nokia, closed])

        expect(loadTrades()).toEqual([nokia, closed])
    })

    it('ignores a different version', () => {
        localStorage.setItem(TRADES_KEY, JSON.stringify({ version: 2, items: [nokia] }))

        expect(loadTrades()).toEqual([])
    })

    it('ignores broken JSON', () => {
        localStorage.setItem(TRADES_KEY, 'not json')

        expect(loadTrades()).toEqual([])
    })

    it('drops items without a positive quantity or a numeric open price', () => {
        localStorage.setItem(
            TRADES_KEY,
            JSON.stringify({
                version: 1,
                items: [
                    nokia,
                    { ...nokia, id: 't3', quantity: 0 },
                    { ...nokia, id: 't4', quantity: -5 },
                    { ...nokia, id: 't5', open: { price: '1.62', commission: 0, date: '2026-10-09' } },
                    { ...nokia, id: 't6', open: undefined },
                    null,
                    'nope',
                ],
            }),
        )

        expect(loadTrades()).toEqual([nokia])
    })

    it('never stores a negative commission', () => {
        saveTrades([{ ...nokia, open: { price: 1.62, commission: -1, date: '2026-10-09' } }])

        expect(loadTrades()[0].open.commission).toBe(0)
    })

    it('gives a stored trade without an id and creation date usable defaults', () => {
        localStorage.setItem(
            TRADES_KEY,
            JSON.stringify({ version: 1, items: [{ instrument: 'NOKIA', quantity: 10, currency: 'EUR', open: { price: 1, commission: 0, date: '2026-10-09' } }] }),
        )

        const [trade] = loadTrades()
        expect(trade.id).toBeTruthy()
        expect(trade.createdAt).toBeTruthy()
        expect(trade.instrument).toBe('NOKIA')
    })

    it('returns an empty list when localStorage throws', () => {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('denied')
        })

        expect(loadTrades()).toEqual([])
    })

    it('warns instead of throwing when saving fails', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('full')
        })

        expect(() => saveTrades([nokia])).not.toThrow()
        expect(warn).toHaveBeenCalled()
    })

    it('clears the stored trades', () => {
        saveTrades([nokia])
        clearTrades()

        expect(localStorage.getItem(TRADES_KEY)).toBeNull()
        expect(loadTrades()).toEqual([])
    })

    describe('goal', () => {
        const goal: TradeGoal = { amount: 1000, currency: 'EUR', since: '2026-10-01', label: 'Autumn 2026' }

        it('keeps a goal through a save and a load', () => {
            saveTradeGoal(goal)

            expect(loadTradeGoal()).toEqual(goal)
        })

        it('forgets a removed goal', () => {
            saveTradeGoal(goal)
            saveTradeGoal(null)

            expect(loadTradeGoal()).toBeNull()
        })

        it('drops a goal with no positive amount', () => {
            localStorage.setItem(TRADE_GOAL_KEY, JSON.stringify({ version: 1, goal: { amount: 0, currency: 'EUR' } }))

            expect(loadTradeGoal()).toBeNull()
        })

        it('ignores a broken goal', () => {
            localStorage.setItem(TRADE_GOAL_KEY, 'not json')

            expect(loadTradeGoal()).toBeNull()
        })
    })
})