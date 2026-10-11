import { describe, it, expect, beforeEach } from 'vitest'
import { favouriteSnapshot, BIAS_SHORT_LABELS } from './favouriteSnapshot'
import { writeCache } from './analysisCache'
import { FavouriteStock } from './favouritesStorage'
import { makeSeries } from '../test/mocks/eodSeries'

const apple: FavouriteStock = { code: 'AAPL', exchange: 'US', name: 'Apple Inc', currency: 'USD', addedAt: '2026-10-10T08:00:00.000Z' }

describe('favouriteSnapshot', () => {
    beforeEach(() => {
        localStorage.clear()
    })

    it('is null when today\'s analysis cache has nothing for the stock', () => {
        expect(favouriteSnapshot(apple)).toBeNull()
    })

    it('reads the last close, day change, recent closes and bias from the cache', () => {
        const series = makeSeries({ days: 60, start: 100, drift: 1, range: 2, volume: 1000, lastVolume: 2000 })
        writeCache('AAPL', 'US', { data: series, error: null }, { data: [], error: null })

        const snapshot = favouriteSnapshot(apple)!

        expect(snapshot.close).toBe(159)
        expect(snapshot.changePercent).toBeCloseTo((159 / 158 - 1) * 100)
        expect(snapshot.closes).toEqual(Array.from({ length: 20 }, (_, i) => 140 + i))
        expect(snapshot.bias).toBe('Aside')
    })

    it('shortens bias labels for chips', () => {
        expect(BIAS_SHORT_LABELS).toEqual({ 'Leaning long': 'Long', 'Leaning short': 'Short', 'Stand aside': 'Aside' })
    })
})
