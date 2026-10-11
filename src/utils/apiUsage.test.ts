import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import dayjs from 'dayjs'
import { API_USAGE_KEY, API_USAGE_EVENT, DAILY_CALL_BUDGET, apiCallsToday, recordApiCalls } from './apiUsage'
import { fetchStockDataFromApi } from './stockTable'
import { fetchNewsFromApi } from './news'
import { mockStockData, mockSuccessResponse } from '../test/mocks/stockApi'
import { mockJsonResponse } from '../test/mocks/newsApi'

describe('apiUsage', () => {
    beforeEach(() => {
        localStorage.clear()
        vi.useFakeTimers({ toFake: ['Date'] })
        vi.setSystemTime(new Date('2026-10-10T23:30:00Z'))
    })

    afterEach(() => {
        vi.useRealTimers()
        vi.restoreAllMocks()
    })

    it('starts at zero with a daily budget of about 20 calls', () => {
        expect(apiCallsToday()).toBe(0)
        expect(DAILY_CALL_BUDGET).toBe(20)
    })

    it('adds up calls within the same UTC day', () => {
        recordApiCalls(1)
        recordApiCalls(5)

        expect(apiCallsToday()).toBe(6)
        expect(JSON.parse(localStorage.getItem(API_USAGE_KEY)!)).toEqual({ date: '2026-10-10', count: 6 })
    })

    it('starts again at midnight UTC', () => {
        recordApiCalls(6)

        vi.setSystemTime(new Date('2026-10-11T00:00:01Z'))

        expect(apiCallsToday()).toBe(0)
        recordApiCalls(1)
        expect(apiCallsToday()).toBe(1)
    })

    it('tells listeners when the count changes', () => {
        const listener = vi.fn()
        window.addEventListener(API_USAGE_EVENT, listener)

        recordApiCalls(1)

        expect(listener).toHaveBeenCalledTimes(1)
        window.removeEventListener(API_USAGE_EVENT, listener)
    })

    it('treats unreadable or blocked storage as zero and never throws', () => {
        localStorage.setItem(API_USAGE_KEY, 'not json')
        expect(apiCallsToday()).toBe(0)

        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('QuotaExceededError')
        })
        expect(() => recordApiCalls(1)).not.toThrow()
    })

    it('counts a price fetch as 1 call and a news fetch as 5', async () => {
        vi.stubGlobal('fetch', vi.fn((url: string) =>
            url.includes('/news') ? mockJsonResponse([]) : mockSuccessResponse(mockStockData)))

        await fetchStockDataFromApi('AAPL', 'US', dayjs('2026-10-01'), dayjs('2026-10-09'), '')
        expect(apiCallsToday()).toBe(1)

        await fetchNewsFromApi('AAPL', 'US', '', dayjs('2026-10-07'))
        expect(apiCallsToday()).toBe(6)
    })
})
