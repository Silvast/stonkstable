import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { TradesProvider, useTrades } from './TradesContext'
import { TRADES_KEY, TRADE_GOAL_KEY, loadTrades, saveTrades, saveTradeGoal, loadTradeGoal } from '../utils/tradesStorage'
import type { Trade, TradeGoal } from '../utils/trades'
import { ParsedOrder } from '../utils/nordnetParser'

const wrapper = ({ children }: { children: React.ReactNode }) => <TradesProvider>{children}</TradesProvider>

const nokia: Omit<Trade, 'id' | 'createdAt'> = {
    instrument: 'MINI L NOKIA NORDNET FI24',
    account: 'Uusi nousu · 20339206',
    quantity: 200,
    currency: 'EUR',
    open: { price: 1.62, commission: 0, date: '2026-10-09' },
}

const sellOrder = (overrides: Partial<ParsedOrder> = {}): ParsedOrder => ({
    side: 'sell',
    instrument: 'MINI L NOKIA NORDNET FI24',
    account: 'Uusi nousu · 20339206',
    quantity: 200,
    price: 1.92,
    currency: 'EUR',
    commission: 0,
    ...overrides,
})

const goal: TradeGoal = { amount: 1000, currency: 'EUR', since: '2026-10-01' }

const first = (result: { current: ReturnType<typeof useTrades> }) => result.current.open[0]

describe('TradesContext', () => {
    beforeEach(() => {
        localStorage.clear()
        vi.restoreAllMocks()
    })

    it('starts empty when nothing is stored', () => {
        const { result } = renderHook(() => useTrades(), { wrapper })

        expect(result.current.trades).toEqual([])
        expect(result.current.goal).toBeNull()
    })

    it('starts from the trades and goal stored in localStorage', () => {
        saveTrades([{ ...nokia, id: 't1', createdAt: '2026-10-09T08:00:00.000Z' }])
        saveTradeGoal(goal)

        const { result } = renderHook(() => useTrades(), { wrapper })

        expect(result.current.open).toHaveLength(1)
        expect(result.current.goal).toEqual(goal)
    })

    it('adds a trade with an id and a creation date, and persists it', () => {
        const { result } = renderHook(() => useTrades(), { wrapper })

        let added: Trade = { ...nokia, id: '', createdAt: '' }
        act(() => { added = result.current.addTrade(nokia) })

        expect(added.id).toBeTruthy()
        expect(added.createdAt).toBeTruthy()
        expect(loadTrades()).toHaveLength(1)
        expect(result.current.open).toEqual([added])
    })

    it('does not write to localStorage on mount', () => {
        const setItem = vi.spyOn(Storage.prototype, 'setItem')

        renderHook(() => useTrades(), { wrapper })

        expect(setItem).not.toHaveBeenCalled()
    })

    it('lists open positions newest first and closed trades newest close first', () => {
        saveTrades([
            { ...nokia, id: 'old', createdAt: '2026-10-01T08:00:00.000Z', open: { price: 1.62, commission: 0, date: '2026-10-01' } },
            { ...nokia, id: 'new', createdAt: '2026-10-09T08:00:00.000Z', open: { price: 1.62, commission: 0, date: '2026-10-09' } },
            { ...nokia, id: 'closed-old', createdAt: '2026-10-01T08:00:00.000Z', close: { price: 1.92, commission: 0, date: '2026-10-10' } },
            { ...nokia, id: 'closed-new', createdAt: '2026-10-01T08:00:00.000Z', close: { price: 1.92, commission: 0, date: '2026-10-20' } },
        ])

        const { result } = renderHook(() => useTrades(), { wrapper })

        expect(result.current.open.map(trade => trade.id)).toEqual(['new', 'old'])
        expect(result.current.closed.map(trade => trade.id)).toEqual(['closed-new', 'closed-old'])
    })

    it('closes a position and moves it to the closed list', () => {
        saveTrades([{ ...nokia, id: 't1', createdAt: '2026-10-09T08:00:00.000Z' }])
        const { result } = renderHook(() => useTrades(), { wrapper })

        act(() => result.current.closeTrade('t1', { price: 1.92, commission: 0, date: '2026-10-16' }))

        expect(result.current.open).toEqual([])
        expect(result.current.closed).toHaveLength(1)
        expect(result.current.closed[0]).toMatchObject({ id: 't1', quantity: 200, close: { price: 1.92 } })
        expect(loadTrades()[0].close).toEqual({ price: 1.92, commission: 0, date: '2026-10-16' })
    })

    it('splits a partial close into a closed part and a smaller open position', () => {
        saveTrades([{ ...nokia, id: 't1', createdAt: '2026-10-09T08:00:00.000Z' }])
        const { result } = renderHook(() => useTrades(), { wrapper })

        act(() => result.current.closeTrade('t1', { price: 1.92, commission: 0, date: '2026-10-16' }, 100))

        expect(result.current.open).toHaveLength(1)
        expect(first(result).quantity).toBe(100)
        expect(result.current.closed[0].quantity).toBe(100)
    })

    it('reopens a closed trade', () => {
        saveTrades([{ ...nokia, id: 't1', close: { price: 1.92, commission: 0, date: '2026-10-16' }, createdAt: '2026-10-09T08:00:00.000Z' }])
        const { result } = renderHook(() => useTrades(), { wrapper })

        act(() => result.current.reopenTrade('t1'))

        expect(result.current.closed).toEqual([])
        expect(result.current.open).toHaveLength(1)
        expect(loadTrades()[0].close).toBeUndefined()
    })

    it('updates and removes a trade', () => {
        saveTrades([{ ...nokia, id: 't1', createdAt: '2026-10-09T08:00:00.000Z' }])
        const { result } = renderHook(() => useTrades(), { wrapper })

        act(() => result.current.updateTrade('t1', { priceNow: 1.8, instrument: 'MINI L NOKIA NORDNET FI24 FI26' }))

        expect(first(result)).toMatchObject({ priceNow: 1.8, instrument: 'MINI L NOKIA NORDNET FI24 FI26', id: 't1' })
        expect(loadTrades()[0].priceNow).toBe(1.8)

        act(() => result.current.removeTrade('t1'))

        expect(result.current.trades).toEqual([])
        expect(loadTrades()).toEqual([])
    })

    it('never lets an update change the id', () => {
        saveTrades([{ ...nokia, id: 't1', createdAt: '2026-10-09T08:00:00.000Z' }])
        const { result } = renderHook(() => useTrades(), { wrapper })

        act(() => result.current.updateTrade('t1', { id: 'other' }))

        expect(result.current.trades[0].id).toBe('t1')
    })

    it('restores a removed trade for undo, and keeps an existing one', () => {
        const removed: Trade = { ...nokia, id: 't1', createdAt: '2026-10-09T08:00:00.000Z' }
        saveTrades([removed])
        const { result } = renderHook(() => useTrades(), { wrapper })

        act(() => result.current.removeTrade('t1'))
        act(() => result.current.restoreTrade(removed))

        expect(result.current.trades).toEqual([removed])

        act(() => result.current.restoreTrade(removed))
        expect(result.current.trades).toHaveLength(1)
    })

    it('saves and removes the goal', () => {
        const { result } = renderHook(() => useTrades(), { wrapper })

        act(() => result.current.setGoal(goal))
        expect(result.current.goal).toEqual(goal)
        expect(loadTradeGoal()).toEqual(goal)

        act(() => result.current.setGoal(null))
        expect(loadTradeGoal()).toBeNull()
    })

    it('reloads when another tab changes the trades or the goal', () => {
        const stored: Trade = { ...nokia, id: 'from-other-tab', createdAt: '2026-10-09T08:00:00.000Z' }
        const { result } = renderHook(() => useTrades(), { wrapper })

        act(() => {
            saveTrades([stored])
            saveTradeGoal(goal)
            window.dispatchEvent(new StorageEvent('storage', { key: TRADES_KEY }))
            window.dispatchEvent(new StorageEvent('storage', { key: TRADE_GOAL_KEY }))
        })

        expect(result.current.trades).toEqual([stored])
        expect(result.current.goal).toEqual(goal)
    })

    it('ignores storage events for other keys', () => {
        saveTrades([{ ...nokia, id: 't1', createdAt: '2026-10-09T08:00:00.000Z' }])
        const { result } = renderHook(() => useTrades(), { wrapper })

        act(() => {
            localStorage.clear()
            window.dispatchEvent(new StorageEvent('storage', { key: 'stonkstable:favourites:v1' }))
        })

        expect(result.current.trades).toHaveLength(1)
    })

    describe('findOpenMatch', () => {
        beforeEach(() => {
            saveTrades([
                { ...nokia, id: 'old', createdAt: '2026-10-01T08:00:00.000Z', open: { price: 1.62, commission: 0, date: '2026-10-01' } },
                { ...nokia, id: 'new', createdAt: '2026-10-09T08:00:00.000Z', open: { price: 1.62, commission: 0, date: '2026-10-09' } },
                { ...nokia, id: 'other-account', createdAt: '2026-10-02T08:00:00.000Z', account: 'Seligiaat', open: { price: 1.62, commission: 0, date: '2026-10-02' } },
                { ...nokia, id: 'too-small', createdAt: '2026-10-03T08:00:00.000Z', quantity: 100, open: { price: 1.62, commission: 0, date: '2026-10-03' } },
            ])
        })

        it('finds the oldest open position of the same instrument and account', () => {
            const { result } = renderHook(() => useTrades(), { wrapper })

            expect(result.current.findOpenMatch(sellOrder())?.id).toBe('old')
        })

        it('ignores the case of the instrument name', () => {
            const { result } = renderHook(() => useTrades(), { wrapper })

            expect(result.current.findOpenMatch(sellOrder({ instrument: 'mini l nokia nordnet fi24' }))?.id).toBe('old')
        })

        it('matches a position without an account', () => {
            const { result } = renderHook(() => useTrades(), { wrapper })

            expect(result.current.findOpenMatch(sellOrder({ account: undefined }))?.id).toBe('old')
        })

        it('is null for another instrument', () => {
            const { result } = renderHook(() => useTrades(), { wrapper })

            expect(result.current.findOpenMatch(sellOrder({ instrument: 'MINI OPTA NORDNET FI24' }))).toBeNull()
        })

        it('is null when the position is too small', () => {
            const { result } = renderHook(() => useTrades(), { wrapper })

            expect(result.current.findOpenMatch(sellOrder({ quantity: 300 }))).toBeNull()
        })
    })

    it('throws a clear error when used outside the provider', () => {
        vi.spyOn(console, 'error').mockImplementation(() => {})

        expect(() => renderHook(() => useTrades())).toThrow(/useTrades must be used within a TradesProvider/)
    })
})