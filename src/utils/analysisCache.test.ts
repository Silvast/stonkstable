import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readCache, writeCache, pruneCache } from './analysisCache'
import { mockStockData } from '../test/mocks/stockApi'
import { NewsArticle } from './news'

const article: NewsArticle = {
    date: '2026-10-09T14:30:00+00:00',
    title: 'Apple beats expectations',
    link: 'https://example.com/newest',
    symbols: ['AAPL.US'],
}
const okEod = { data: mockStockData, error: null }
const okNews = { data: [article], error: null }

describe('analysisCache', () => {
    beforeEach(() => {
        localStorage.clear()
        vi.useFakeTimers({ toFake: ['Date'] })
        vi.setSystemTime(new Date(2026, 9, 10, 8, 30))
    })

    afterEach(() => {
        vi.useRealTimers()
        vi.restoreAllMocks()
    })

    it('returns null on a miss', () => {
        expect(readCache('AAPL', 'US')).toBeNull()
    })

    it('reads back what was written for the same symbol, exchange and day', () => {
        writeCache('AAPL', 'US', okEod, okNews)

        expect(readCache('AAPL', 'US')).toEqual({
            eod: mockStockData,
            news: okNews,
            fetchedAt: new Date(2026, 9, 10, 8, 30).toISOString(),
        })
    })

    it('stores under a per-symbol, per-exchange, per-day key', () => {
        writeCache('AAPL', 'US', okEod, okNews)

        expect(Object.keys(localStorage)).toEqual(['stonkstable:analysis:v1:AAPL.US:2026-10-10'])
        expect(readCache('AAPL', 'HE')).toBeNull()
        expect(readCache('MSFT', 'US')).toBeNull()
    })

    it('misses on the next day', () => {
        writeCache('AAPL', 'US', okEod, okNews)
        vi.setSystemTime(new Date(2026, 9, 11, 8, 30))

        expect(readCache('AAPL', 'US')).toBeNull()
    })

    it('does not cache when the EOD fetch failed', () => {
        writeCache('AAPL', 'US', { data: [], error: 'Failed to load stock data.' }, okNews)

        expect(readCache('AAPL', 'US')).toBeNull()
    })

    it('caches when only the news failed and keeps the news error', () => {
        writeCache('AAPL', 'US', okEod, { data: [], error: 'Failed to load news.' })

        expect(readCache('AAPL', 'US')?.news).toEqual({ data: [], error: 'Failed to load news.' })
    })

    it('removes analysis entries from previous days on write and keeps unrelated keys', () => {
        localStorage.setItem('stonkstable:analysis:v1:AAPL.US:2026-10-09', '{}')
        localStorage.setItem('stonkstable:analysis:v1:NOKIA.HE:2026-10-08', '{}')
        localStorage.setItem('unrelated', 'keep me')

        writeCache('AAPL', 'US', okEod, okNews)

        expect(Object.keys(localStorage).sort()).toEqual([
            'stonkstable:analysis:v1:AAPL.US:2026-10-10',
            'unrelated',
        ])
    })

    it('pruneCache keeps entries from today', () => {
        localStorage.setItem('stonkstable:analysis:v1:NOKIA.HE:2026-10-10', '{}')
        localStorage.setItem('stonkstable:analysis:v1:NOKIA.HE:2026-10-09', '{}')

        pruneCache()

        expect(Object.keys(localStorage)).toEqual(['stonkstable:analysis:v1:NOKIA.HE:2026-10-10'])
    })

    it('treats unreadable JSON as a miss', () => {
        localStorage.setItem('stonkstable:analysis:v1:AAPL.US:2026-10-10', 'not json')

        expect(readCache('AAPL', 'US')).toBeNull()
    })

    it('treats a localStorage read failure as a miss', () => {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('SecurityError')
        })

        expect(readCache('AAPL', 'US')).toBeNull()
    })

    it('does not throw when localStorage cannot be written', () => {
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('QuotaExceededError')
        })

        expect(() => writeCache('AAPL', 'US', okEod, okNews)).not.toThrow()
    })
})
