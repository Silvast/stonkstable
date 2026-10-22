import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { screen, within } from '@testing-library/react'
import { render } from '../../test/utils/testHelpers'
import { BiasPanel, RsiCard, TrendCard, TypicalDayCard, LevelsCard, NewsCard } from '.'
import { AnalysisResult } from '../../utils/analysis'

const range: AnalysisResult['range'] = {
    atr: 5.46,
    atrPercent: 2.4,
    prevHigh: 229.1,
    prevLow: 224.25,
    prevClose: 227.48,
    high20: 233,
    low20: 210.5,
    pivots: { p: 226.94, r1: 229.64, s1: 224.79 },
    gapPercent: -0.84,
    relativeVolume: 1.83,
}

const trend: AnalysisResult['trend'] = {
    sma20: 220.6,
    sma50: 215.8,
    vsSma20Pct: 3.12,
    vsSma50Pct: 5.41,
    label: 'Up',
    streak: 4,
    recentCloses: [210, 212, 215, 214, 218, 222, 227.48],
}

const signals: AnalysisResult['signals'] = [
    { rule: 'Trend', score: 1, text: 'Above 20- and 50-day averages' },
    { rule: 'Momentum', score: 0, text: 'RSI 63, neither overbought nor oversold' },
    { rule: 'Volume', score: 1, text: 'Up day on 1.8× volume' },
    { rule: 'News', score: -1, text: '1 negative headline in 72 h' },
]

describe('BiasPanel', () => {
    const renderBias = (bias: AnalysisResult['bias'] = { score: 1, label: 'Stand aside', reasons: [] }) => render(
        <BiasPanel
            name="Apple Inc"
            code="AAPL.US"
            lastClose={227.48}
            dayChangePercent={1.08}
            asOf="2026-10-09"
            bias={bias}
            signals={signals}
            tradingViewHref="https://www.tradingview.com/chart/?symbol=AAPL"
            nordnetHref="https://www.nordnet.fi/etsi?q=AAPL"
        />
    )

    it('shows the stock, its price and day change', () => {
        renderBias()

        expect(screen.getByRole('heading', { level: 1, name: 'Apple Inc' })).toBeInTheDocument()
        expect(screen.getByText('AAPL.US')).toBeInTheDocument()
        expect(screen.getByText('227.48')).toBeInTheDocument()
        expect(screen.getByText('+1.08%')).toBeInTheDocument()
    })

    it.each([
        [{ score: 2, label: 'Leaning long' as const, reasons: [] }, '+2'],
        [{ score: -3, label: 'Leaning short' as const, reasons: [] }, '-3'],
        [{ score: 0, label: 'Stand aside' as const, reasons: [] }, '0'],
    ])('shows the bias label and signed score', (bias, score) => {
        renderBias(bias)

        expect(screen.getByText(bias.label, { selector: 'span' }).nextSibling).toHaveTextContent(new RegExp(`^${score.replace('+', '\\+')}$`))
        expect(screen.getByRole('img', { name: `Bias score ${score} on a scale from -4 to +4` })).toBeInTheDocument()
    })

    it('lists every signal with its score, rule and explanation', () => {
        renderBias()

        const list = screen.getByRole('list', { name: 'Signals that fired' })
        const rows = within(list).getAllByRole('listitem').map(item => item.textContent)
        expect(rows).toEqual([
            '+1TrendAbove 20- and 50-day averages',
            '0MomentumRSI 63, neither overbought nor oversold',
            '+1VolumeUp day on 1.8× volume',
            '-1News1 negative headline in 72 h',
        ])
    })

    it('says when there is not enough history', () => {
        render(
            <BiasPanel
                name="Apple Inc"
                code="AAPL.US"
                lastClose={227.48}
                dayChangePercent={0}
                asOf="2026-10-09"
                bias={{ score: 0, label: 'Stand aside', reasons: ['Not enough history'] }}
                signals={[]}
                tradingViewHref="https://www.tradingview.com/chart/?symbol=AAPL"
                nordnetHref="https://www.nordnet.fi/etsi?q=AAPL"
            />
        )

        expect(screen.getByText('Not enough history')).toBeInTheDocument()
    })

    it('links to TradingView in a new tab and shows the data date', () => {
        renderBias()

        const link = screen.getByRole('link', { name: /Open in TradingView/ })
        expect(link).toHaveAttribute('href', 'https://www.tradingview.com/chart/?symbol=AAPL')
        expect(link).toHaveAttribute('target', '_blank')
        expect(link).toHaveAttribute('rel', 'noopener noreferrer')
        expect(screen.getByText('Daily data to Fri 9 Oct close. Not investment advice.')).toBeInTheDocument()
    })

    it('links to the Nordnet search in a new tab', () => {
        renderBias()

        const link = screen.getByRole('link', { name: /Open in Nordnet/ })
        expect(link).toHaveAttribute('href', 'https://www.nordnet.fi/etsi?q=AAPL')
        expect(link).toHaveAttribute('target', '_blank')
        expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    })
})

describe('RsiCard', () => {
    it('shows the value, label, direction and where it sits between the bands', () => {
        render(<RsiCard rsi={{ value: 74.26, previous: 70.1, label: 'Overbought' }} />)

        expect(screen.getByRole('heading', { name: 'RSI (14)' })).toBeInTheDocument()
        expect(screen.getByText('Overbought')).toBeInTheDocument()
        expect(screen.getByText('74.3')).toBeInTheDocument()
        expect(screen.getByText('↑ from 70.1')).toBeInTheDocument()
        expect(screen.getByRole('img', { name: 'RSI 74.3, above the 70 band' })).toBeInTheDocument()
        expect(screen.getByText('Momentum is stretched to the upside.')).toBeInTheDocument()
    })

    it.each([
        [{ value: 63.4, previous: 58.9, label: 'Neutral' as const }, 'RSI 63.4, between the 30 and 70 bands', 'Momentum is rising but has room before overbought.'],
        [{ value: 45, previous: 50.04, label: 'Neutral' as const }, 'RSI 45.0, between the 30 and 70 bands', 'Momentum is easing but not yet oversold.'],
        [{ value: 22, previous: 25, label: 'Oversold' as const }, 'RSI 22.0, below the 30 band', 'Momentum is stretched to the downside.'],
    ])('describes %o', (rsi, description, explanation) => {
        render(<RsiCard rsi={rsi} />)

        expect(screen.getByRole('img', { name: description })).toBeInTheDocument()
        expect(screen.getByText(explanation)).toBeInTheDocument()
    })

    it('shows a falling arrow when RSI dropped', () => {
        render(<RsiCard rsi={{ value: 40, previous: 45.56, label: 'Neutral' }} />)

        expect(screen.getByText('↓ from 45.6')).toBeInTheDocument()
    })

    it('says when there is not enough data', () => {
        render(<RsiCard rsi={null} />)

        expect(screen.getByText('Not enough data')).toBeInTheDocument()
    })
})

describe('TrendCard', () => {
    it('shows the label, a mini chart and the distance to each average', () => {
        render(<TrendCard trend={trend} />)

        expect(screen.getByRole('heading', { name: 'Trend' })).toBeInTheDocument()
        expect(screen.getByText('Up')).toBeInTheDocument()
        expect(screen.getByRole('img', { name: 'Recent closes against the 20-day average 220.60 and the 50-day average 215.80' })).toBeInTheDocument()
        expect(screen.getByText('vs SMA 20 · 220.60').parentElement).toHaveTextContent('+3.1%')
        expect(screen.getByText('vs SMA 50 · 215.80').parentElement).toHaveTextContent('+5.4%')
        expect(screen.getByText('4 up')).toBeInTheDocument()
    })

    it.each([[-2, '2 down'], [1, '1 up'], [0, 'Flat']])('describes a streak of %d as %s', (streak, text) => {
        render(<TrendCard trend={{ ...trend, streak }} />)

        expect(screen.getByText(text)).toBeInTheDocument()
    })

    it('shows dashes when the 50-day average is not available', () => {
        render(<TrendCard trend={{ ...trend, sma50: null, vsSma50Pct: null }} />)

        expect(screen.getByText('vs SMA 50 · –').parentElement).toHaveTextContent('–')
    })
})

describe('TypicalDayCard', () => {
    it('shows the typical move for a 5× certificate and switches leverage', async () => {
        const user = userEvent.setup()
        render(<TypicalDayCard range={range} />)

        expect(screen.getByRole('heading', { name: 'Typical day' })).toBeInTheDocument()
        expect(screen.getByText('ATR 5.46')).toBeInTheDocument()
        expect(screen.getByText('±12.0%')).toBeInTheDocument()
        expect(screen.getByText('for a 5× certificate')).toBeInTheDocument()

        await user.click(within(screen.getByRole('group', { name: 'Leverage' })).getByRole('button', { name: '10×' }))

        expect(screen.getByText('±24.0%')).toBeInTheDocument()
        expect(screen.getByText('for a 10× certificate')).toBeInTheDocument()
    })

    it('explains the stock\'s own move, gap and volume', () => {
        render(<TypicalDayCard range={range} />)

        expect(screen.getByText('The stock itself moves about 2.4% on a normal day. Gap -0.8%, volume 1.8× normal.')).toBeInTheDocument()
    })

    it('says when ATR is not available', () => {
        render(<TypicalDayCard range={{ ...range, atr: null, atrPercent: null }} />)

        expect(screen.getByText('Not enough data')).toBeInTheDocument()
        expect(screen.queryByRole('group', { name: 'Leverage' })).not.toBeInTheDocument()
    })
})

describe('LevelsCard', () => {
    it('ladders the levels from highest to lowest and highlights the last close', () => {
        render(<LevelsCard range={range} lastClose={227.48} />)

        expect(screen.getByRole('heading', { name: 'Levels to watch' })).toBeInTheDocument()
        const rows = within(screen.getByRole('list', { name: 'Levels to watch' })).getAllByRole('listitem')
        expect(rows.map(row => row.textContent)).toEqual([
            '20-day high233.00',
            'R1 resistance229.64',
            'Prev. high229.10',
            'Last close227.48',
            'Pivot226.94',
            'S1 support224.79',
            'Prev. low224.25',
        ])
        expect(rows[3]).toHaveAttribute('aria-current', 'true')
    })

    it('leaves out the 20-day high when it is not available', () => {
        render(<LevelsCard range={{ ...range, high20: null }} lastClose={227.48} />)

        expect(screen.queryByText('20-day high')).not.toBeInTheDocument()
    })
})

describe('NewsCard', () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] })
        vi.setSystemTime(new Date('2026-10-10T12:00:00'))
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    const article = (hour: number, polarity?: number) => ({
        date: `2026-10-09T${String(hour).padStart(2, '0')}:40:00`,
        title: `Headline ${hour}`,
        link: `https://example.com/${hour}`,
        symbols: ['AAPL.US'],
        ...(polarity === undefined ? {} : { sentiment: { polarity, neg: 0, neu: 1, pos: 0 } }),
    })

    it('links up to five headlines with a tone chip and time, and counts the tones', () => {
        const articles = [article(18, 0.5), article(17, -0.4), article(16, 0.1), article(15), article(14, 0.3), article(13, 0.2)]
        render(<NewsCard news={{ articles, avgPolarity: 0.1, tone: 'Neutral', error: null }} />)

        expect(screen.getByRole('heading', { name: 'News, last 3 days' })).toBeInTheDocument()
        expect(screen.getByText('2 positive · 1 negative')).toBeInTheDocument()
        const links = screen.getAllByRole('link')
        expect(links).toHaveLength(5)
        expect(links[0]).toHaveAttribute('href', 'https://example.com/18')
        expect(links[0]).toHaveAttribute('target', '_blank')
        expect(links[0]).toHaveAttribute('rel', 'noopener noreferrer')
        expect(links[0]).toHaveTextContent('PositiveHeadline 18Fri 9 Oct, 18:40')
        expect(links[1]).toHaveTextContent(/^Negative/)
        expect(links[2]).toHaveTextContent(/^Neutral/)
        expect(links[3]).toHaveTextContent(/^Neutral/)
    })

    it('shows the empty state when there is no news', () => {
        render(<NewsCard news={{ articles: [], avgPolarity: null, tone: null, error: null }} />)

        expect(screen.getByText('No news in the last 72 h')).toBeInTheDocument()
    })

    it('shows only the error when news failed', () => {
        render(<NewsCard news={{ articles: [], avgPolarity: null, tone: null, error: 'Failed to load news.' }} />)

        expect(screen.getByText('Failed to load news.')).toBeInTheDocument()
        expect(screen.queryByText('No news in the last 72 h')).not.toBeInTheDocument()
    })
})
