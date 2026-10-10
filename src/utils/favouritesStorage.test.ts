import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
    FAVOURITES_KEY,
    FavouriteStock,
    favouriteId,
    loadFavourites,
    saveFavourites,
    toFavourite
} from './favouritesStorage'
import { StockEntry } from '../context/StockSelectionContext'

const apple: FavouriteStock = { code: 'AAPL', exchange: 'US', name: 'Apple Inc', currency: 'USD', addedAt: '2026-10-10T08:00:00.000Z' }
const nokia: FavouriteStock = { code: 'NOKIA', exchange: 'HE', name: 'Nokia Oyj', currency: 'EUR', addedAt: '2026-10-08T08:00:00.000Z' }

const store = (value: unknown) => localStorage.setItem(FAVOURITES_KEY, JSON.stringify(value))

describe('favouritesStorage', () => {
    beforeEach(() => {
        localStorage.clear()
        vi.spyOn(console, 'warn').mockImplementation(() => {})
    })

    afterEach(() => {
        vi.restoreAllMocks()
        vi.useRealTimers()
    })

    it('identifies a favourite by code and exchange', () => {
        expect(favouriteId('NOKIA', 'HE')).toBe('NOKIA.HE')
    })

    it('round-trips saved favourites in order', () => {
        saveFavourites([apple, nokia])

        expect(loadFavourites()).toEqual([apple, nokia])
    })

    it('stores a versioned value under the stonkstable favourites key', () => {
        saveFavourites([apple])

        expect(JSON.parse(localStorage.getItem('stonkstable:favourites:v1')!)).toEqual({ version: 1, items: [apple] })
    })

    it('returns an empty list when nothing is stored', () => {
        expect(loadFavourites()).toEqual([])
    })

    it('returns an empty list for invalid JSON', () => {
        localStorage.setItem(FAVOURITES_KEY, '{not json')

        expect(loadFavourites()).toEqual([])
    })

    it('returns an empty list for an unknown version', () => {
        store({ version: 2, items: [apple] })

        expect(loadFavourites()).toEqual([])
    })

    it('returns an empty list when reading localStorage throws', () => {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('SecurityError')
        })

        expect(loadFavourites()).toEqual([])
    })

    it('drops malformed items and duplicates', () => {
        store({
            version: 1,
            items: [apple, { code: 'NOKIA' }, { exchange: 'US' }, { code: 'X', exchange: 'NASDAQ' }, null, 'AAPL', { ...apple, name: 'Duplicate' }, nokia],
        })

        expect(loadFavourites()).toEqual([apple, nokia])
    })

    it('keeps the same code on different exchanges', () => {
        const appleOnLse = { ...apple, exchange: 'LSE' as const }
        store({ version: 1, items: [apple, appleOnLse] })

        expect(loadFavourites()).toEqual([apple, appleOnLse])
    })

    it('does not throw when writing localStorage fails', () => {
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('QuotaExceededError')
        })

        expect(() => saveFavourites([apple])).not.toThrow()
        expect(console.warn).toHaveBeenCalled()
    })

    it('builds a favourite with the selector exchange rather than the listing exchange', () => {
        vi.useFakeTimers({ toFake: ['Date'] })
        vi.setSystemTime(new Date('2026-10-10T08:00:00.000Z'))
        const entry: StockEntry = {
            Code: 'AAPL', Name: 'Apple Inc', Country: 'USA', Exchange: 'NASDAQ', Currency: 'USD', Type: 'Common Stock', Isin: 'US0378331005',
        }

        expect(toFavourite(entry, 'US')).toEqual(apple)
    })
})
