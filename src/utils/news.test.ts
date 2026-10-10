import { describe, it, expect, beforeEach, vi } from 'vitest'
import dayjs from 'dayjs'
import { fetchNewsFromApi } from './news'
import { mockNewsPayload, mockJsonResponse } from '../test/mocks/newsApi'

const from = dayjs('2026-10-07')

describe('fetchNewsFromApi', () => {
    beforeEach(() => {
        vi.restoreAllMocks()
        vi.spyOn(console, 'error').mockImplementation(() => {})
    })

    it('requests the news endpoint through the proxy for symbol.exchange', async () => {
        const fetchSpy = vi.fn((_url: string) => mockJsonResponse(mockNewsPayload))
        vi.stubGlobal('fetch', fetchSpy)

        await fetchNewsFromApi('AAPL', 'US', 'my-key', from)

        expect(fetchSpy).toHaveBeenCalledTimes(1)
        expect(fetchSpy.mock.calls[0][0]).toBe(
            '/api/eodhd/news?s=AAPL.US&from=2026-10-07&limit=10&offset=0&api_token=my-key&fmt=json'
        )
    })

    it('falls back to the demo token when the API key is blank', async () => {
        const fetchSpy = vi.fn((_url: string) => mockJsonResponse([]))
        vi.stubGlobal('fetch', fetchSpy)

        await fetchNewsFromApi('AAPL', 'US', '   ', from)

        expect(fetchSpy.mock.calls[0][0]).toContain('api_token=demo&')
    })

    it('URL-encodes the symbol and the token', async () => {
        const fetchSpy = vi.fn((_url: string) => mockJsonResponse([]))
        vi.stubGlobal('fetch', fetchSpy)

        await fetchNewsFromApi('BRK&B', 'US', 'a+b', from)

        expect(fetchSpy.mock.calls[0][0]).toContain('s=BRK%26B.US&')
        expect(fetchSpy.mock.calls[0][0]).toContain('api_token=a%2Bb&')
    })

    it('returns articles newest first without the article content', async () => {
        vi.stubGlobal('fetch', vi.fn(() => mockJsonResponse(mockNewsPayload)))

        const result = await fetchNewsFromApi('AAPL', 'US', '', from)

        expect(result.error).toBeNull()
        expect(result.data.map(article => article.link)).toEqual([
            'https://example.com/newest',
            'https://example.com/middle',
            'https://example.com/older',
        ])
        expect(result.data[0]).toEqual({
            date: '2026-10-09T14:30:00+00:00',
            title: 'Apple beats expectations',
            link: 'https://example.com/newest',
            symbols: ['AAPL.US', 'MSFT.US'],
            sentiment: { polarity: 0.8, neg: 0.0, neu: 0.6, pos: 0.4 },
        })
        expect(result.data[1].sentiment).toBeUndefined()
    })

    it('treats an empty array as no news, not an error', async () => {
        vi.stubGlobal('fetch', vi.fn(() => mockJsonResponse([])))

        expect(await fetchNewsFromApi('AAPL', 'US', '', from)).toEqual({ data: [], error: null })
    })

    it('returns an error when the response is not ok', async () => {
        vi.stubGlobal('fetch', vi.fn(() => mockJsonResponse({ message: 'nope' }, 500)))

        const result = await fetchNewsFromApi('AAPL', 'US', '', from)

        expect(result.data).toEqual([])
        expect(result.error).toEqual(expect.any(String))
    })

    it('returns an error when the body is not an array', async () => {
        vi.stubGlobal('fetch', vi.fn(() => mockJsonResponse({ error: 'Unauthenticated' })))

        const result = await fetchNewsFromApi('AAPL', 'US', '', from)

        expect(result.data).toEqual([])
        expect(result.error).toEqual(expect.any(String))
    })

    it('returns an error when the request itself fails', async () => {
        vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))))

        const result = await fetchNewsFromApi('AAPL', 'US', '', from)

        expect(result.data).toEqual([])
        expect(result.error).toEqual(expect.any(String))
    })
})
