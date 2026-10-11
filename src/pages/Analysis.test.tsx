import { describe, it, expect, beforeEach, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import dayjs from 'dayjs'
import { render, screen, waitFor, within, act, chooseExchange, exchangeButton } from '../test/utils/testHelpers'
import Analysis from './Analysis'
import { makeSeries } from '../test/mocks/eodSeries'
import { mockNewsPayload, mockJsonResponse } from '../test/mocks/newsApi'

const eodSeries = makeSeries({ days: 120, start: 100, drift: 0.5, range: 2, volume: 1000 })
const CARD_HEADINGS = ['Signals that fired', 'RSI (14)', 'Trend', 'Typical day', 'Levels to watch', 'News, last 3 days']

const stubFetch = ({ eodStatus = 200, newsStatus = 200 } = {}) => {
    const fetchSpy = vi.fn((url: string) => {
        if (url.includes('/eod/')) return mockJsonResponse(eodStatus === 200 ? eodSeries : { error: 'boom' }, eodStatus)
        if (url.includes('/news')) return mockJsonResponse(newsStatus === 200 ? mockNewsPayload : { error: 'boom' }, newsStatus)
        throw new Error(`Unexpected fetch ${url}`)
    })
    vi.stubGlobal('fetch', fetchSpy)
    return fetchSpy
}

const analyzeButton = () => screen.getByRole('button', { name: 'Analyse' })
const tradingViewLink = () => screen.getByRole('link', { name: /Open in TradingView/i })
const expectAllCards = async () => {
    for (const name of CARD_HEADINGS) {
        expect(await screen.findByRole('heading', { name })).toBeInTheDocument()
    }
}

describe('Analysis page', () => {
    beforeEach(() => {
        localStorage.clear()
        vi.restoreAllMocks()
        vi.spyOn(console, 'error').mockImplementation(() => {})
    })

    it('renders the selector with AAPL / US defaults and a TradingView link', () => {
        stubFetch()
        render(<Analysis />)

        expect(screen.getByRole('combobox', { name: /Stock Symbol/i })).toHaveValue('Apple Inc (AAPL)')
        expect(exchangeButton('US')).toHaveAttribute('aria-pressed', 'true')
        expect(screen.getByRole('heading', { level: 1, name: 'Apple Inc' })).toBeInTheDocument()
        expect(screen.getByText('AAPL.US')).toBeInTheDocument()
        expect(tradingViewLink()).toHaveAttribute('href', 'https://www.tradingview.com/chart/?symbol=AAPL')
        expect(tradingViewLink()).toHaveAttribute('target', '_blank')
        expect(tradingViewLink()).toHaveAttribute('rel', 'noopener noreferrer')
    })

    it('does not fetch on mount and explains the Analyse button', () => {
        const fetchSpy = stubFetch()
        render(<Analysis />)

        expect(fetchSpy).not.toHaveBeenCalled()
        expect(screen.getByText('Press Analyse to load (uses about 6 of your daily API calls)')).toBeInTheDocument()
        expect(screen.queryByRole('heading', { name: 'Signals that fired' })).not.toBeInTheDocument()
    })

    it('fetches 180 days of EOD and 3 days of news once on Analyse and renders every panel', async () => {
        const user = userEvent.setup()
        const fetchSpy = stubFetch()
        render(<Analysis />)

        await user.click(analyzeButton())

        await expectAllCards()
        expect(fetchSpy).toHaveBeenCalledTimes(2)
        const urls = fetchSpy.mock.calls.map(call => call[0])
        const eodUrl = urls.find(url => url.includes('/eod/'))!
        const newsUrl = urls.find(url => url.includes('/news'))!
        expect(eodUrl).toContain('/api/eodhd/eod/AAPL.US?')
        expect(eodUrl).toContain(`from=${dayjs().subtract(180, 'day').format('YYYY-MM-DD')}`)
        expect(newsUrl).toContain('s=AAPL.US')
        expect(newsUrl).toContain(`from=${dayjs().subtract(3, 'day').format('YYYY-MM-DD')}`)
        const header = screen.getByRole('heading', { level: 1, name: 'Apple Inc' }).parentElement!
        expect(within(header).getByText('159.50')).toBeInTheDocument()
        expect(within(header).getByText('+0.31%')).toBeInTheDocument()
        expect(screen.getByText(`Daily data to ${dayjs(eodSeries[119].date).format('ddd D MMM')} close. Not investment advice.`)).toBeInTheDocument()
    })

    it('serves a second visit on the same day from the cache without fetching', async () => {
        const user = userEvent.setup()
        stubFetch()
        const first = render(<Analysis />)
        await user.click(analyzeButton())
        await expectAllCards()
        first.unmount()

        const fetchSpy = stubFetch()
        render(<Analysis />)

        await expectAllCards()
        expect(screen.getByText(/^Cached \d{2}:\d{2}$/)).toBeInTheDocument()
        expect(fetchSpy).not.toHaveBeenCalled()
    })

    it('Refresh bypasses the cache', async () => {
        const user = userEvent.setup()
        stubFetch()
        const first = render(<Analysis />)
        await user.click(analyzeButton())
        await expectAllCards()
        first.unmount()

        const fetchSpy = stubFetch()
        render(<Analysis />)
        await expectAllCards()
        await user.click(screen.getByRole('button', { name: /^Refresh/ }))

        await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2))
    })

    it('shows the EOD error, caches nothing and renders no cards when EOD fails', async () => {
        const user = userEvent.setup()
        stubFetch({ eodStatus: 500 })
        render(<Analysis />)

        await user.click(analyzeButton())

        expect(await screen.findByText('Failed to load stock data. Please try again later.')).toBeInTheDocument()
        expect(Object.keys(localStorage).filter(key => key.startsWith('stonkstable:analysis:'))).toEqual([])
        for (const name of CARD_HEADINGS) {
            expect(screen.queryByRole('heading', { name })).not.toBeInTheDocument()
        }
    })

    it('still renders the EOD cards and a news error when only news fails', async () => {
        const user = userEvent.setup()
        stubFetch({ newsStatus: 500 })
        render(<Analysis />)

        await user.click(analyzeButton())

        await expectAllCards()
        expect(screen.getByText('Failed to load news. Please try again later.')).toBeInTheDocument()
    })

    it('updates the TradingView link to OMXHEX when the exchange changes to HE', async () => {
        const user = userEvent.setup()
        stubFetch()
        render(<Analysis />)

        await chooseExchange(user, 'HE')
        await user.type(screen.getByRole('combobox', { name: /Stock Symbol/i }), 'NOKIA')
        await user.click(await screen.findByRole('option', { name: /Nokia Oyj \(NOKIA\)/i }))

        expect(tradingViewLink()).toHaveAttribute('href', 'https://www.tradingview.com/chart/?symbol=OMXHEX%3ANOKIA')
    })

    it('drops a response that arrives after the selection changed', async () => {
        const user = userEvent.setup()
        let release: () => void = () => {}
        const gate = new Promise<void>(resolve => { release = resolve })
        vi.stubGlobal('fetch', vi.fn(async (url: string) => {
            await gate
            return mockJsonResponse(url.includes('/eod/') ? eodSeries : mockNewsPayload)
        }))
        render(<Analysis />)

        await user.click(analyzeButton())
        await chooseExchange(user, 'LSE')
        await act(async () => {
            release()
            await new Promise(resolve => setTimeout(resolve, 50))
        })

        expect(analyzeButton()).toBeEnabled()
        expect(screen.queryByRole('heading', { name: 'Signals that fired' })).not.toBeInTheDocument()
        expect(screen.getByText('Press Analyse to load (uses about 6 of your daily API calls)')).toBeInTheDocument()
    })
})
