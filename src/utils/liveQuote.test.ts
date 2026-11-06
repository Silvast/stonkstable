import { describe, it, expect, beforeEach, vi } from 'vitest'
import { fetchLiveQuote, parseLiveQuote } from './liveQuote'
import { apiCallsToday } from './apiUsage'

describe('parseLiveQuote', () => {
    it('reads price, change and timestamp from the EODHD payload', () => {
        expect(parseLiveQuote({ code: 'NOKIA.HE', timestamp: 1762444800, close: 5.123, change: 0.05, change_p: 0.9856, previousClose: 5.073 }))
            .toEqual({ price: 5.123, change: 0.05, changePercent: 0.9856, timestamp: 1762444800 })
    })

    it('treats "NA" fields as missing', () => {
        expect(parseLiveQuote({ close: 10, change: 'NA', change_p: 'NA', timestamp: 'NA' }))
            .toEqual({ price: 10, change: null, changePercent: null, timestamp: null })
    })

    it('returns null when there is no price', () => {
        expect(parseLiveQuote({ close: 'NA' })).toBeNull()
        expect(parseLiveQuote([])).toBeNull()
        expect(parseLiveQuote(null)).toBeNull()
    })
})

describe('fetchLiveQuote', () => {
    beforeEach(() => localStorage.clear())

    it('calls the real-time endpoint and counts one API call', async () => {
        const fetchSpy = vi.fn((_url: string) => Promise.resolve({ ok: true, json: async () => ({ close: 5.1, change: 0.1, change_p: 2, timestamp: 1 }) } as Response))
        vi.stubGlobal('fetch', fetchSpy)

        const quote = await fetchLiveQuote('NOKIA', 'HE', ' key ')

        expect(fetchSpy.mock.calls[0][0]).toBe('/api/eodhd/real-time/NOKIA.HE?api_token=key&fmt=json')
        expect(quote?.price).toBe(5.1)
        expect(apiCallsToday()).toBe(1)
    })

    it('returns null when the request fails', async () => {
        vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: false, status: 403, json: async () => ({}) } as Response)))
        expect(await fetchLiveQuote('NOKIA', 'HE', 'key')).toBeNull()
    })
})
