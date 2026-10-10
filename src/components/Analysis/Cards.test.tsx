import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import { render } from '../../test/utils/testHelpers'
import { BiasCard, RsiCard, TrendCard, RangeCard, NewsCard } from '.'
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
}

describe('BiasCard', () => {
    it('shows the label, the score and each reason', () => {
        render(<BiasCard bias={{ score: 2, label: 'Leaning long', reasons: ['RSI 27, oversold', 'Above 20- and 50-day averages'] }} />)

        expect(screen.getByRole('heading', { name: 'Bias' })).toBeInTheDocument()
        expect(screen.getByText('Leaning long')).toBeInTheDocument()
        expect(screen.getByText('Score +2')).toBeInTheDocument()
        const items = within(screen.getByRole('list')).getAllByRole('listitem')
        expect(items.map(item => item.textContent)).toEqual(['RSI 27, oversold', 'Above 20- and 50-day averages'])
    })

    it('left-aligns its content so the global centred text does not apply', () => {
        render(<BiasCard bias={{ score: 2, label: 'Leaning long', reasons: ['RSI 27, oversold'] }} />)

        expect(screen.getByRole('heading', { name: 'Bias' }).parentElement).toHaveStyle({ textAlign: 'left' })
    })

    it('shows a negative score with its sign', () => {
        render(<BiasCard bias={{ score: -3, label: 'Leaning short', reasons: [] }} />)

        expect(screen.getByText('Score -3')).toBeInTheDocument()
    })
})

describe('RsiCard', () => {
    it('shows the value to one decimal, the label and a rising arrow', () => {
        render(<RsiCard rsi={{ value: 74.26, previous: 70.1, label: 'Overbought' }} />)

        expect(screen.getByRole('heading', { name: 'RSI (14)' })).toBeInTheDocument()
        expect(screen.getByText('74.3')).toBeInTheDocument()
        expect(screen.getByText('Overbought')).toBeInTheDocument()
        expect(screen.getByText('↑ from 70.1')).toBeInTheDocument()
        expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '74')
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
    it('shows signed distances to the averages, the label and the streak', () => {
        render(<TrendCard trend={trend} />)

        expect(screen.getByRole('heading', { name: 'Trend' })).toBeInTheDocument()
        expect(screen.getByText('+3.1% vs SMA20')).toBeInTheDocument()
        expect(screen.getByText('+5.4% vs SMA50')).toBeInTheDocument()
        expect(screen.getByText('Up')).toBeInTheDocument()
        expect(screen.getByText('4 up days in a row')).toBeInTheDocument()
    })

    it('describes down streaks, single days and no streak', () => {
        const { rerender } = render(<TrendCard trend={{ ...trend, vsSma20Pct: -1.25, streak: -2 }} />)
        expect(screen.getByText('-1.3% vs SMA20')).toBeInTheDocument()
        expect(screen.getByText('2 down days in a row')).toBeInTheDocument()

        rerender(<TrendCard trend={{ ...trend, streak: 1 }} />)
        expect(screen.getByText('1 up day')).toBeInTheDocument()

        rerender(<TrendCard trend={{ ...trend, streak: 0 }} />)
        expect(screen.getByText('Unchanged last close')).toBeInTheDocument()
    })

    it('shows a dash when an average is not available', () => {
        render(<TrendCard trend={{ ...trend, sma50: null, vsSma50Pct: null }} />)

        expect(screen.getByText('– vs SMA50')).toBeInTheDocument()
    })
})

describe('RangeCard', () => {
    it('shows ATR and the typical day for 3×, 5× and 10× certificates', () => {
        render(<RangeCard range={range} />)

        expect(screen.getByRole('heading', { name: 'Range & levels' })).toBeInTheDocument()
        expect(screen.getByText('ATR 5.46 (2.4%)')).toBeInTheDocument()
        expect(screen.getByText('3× certificate ≈ ±7.2% typical day')).toBeInTheDocument()
        expect(screen.getByText('5× certificate ≈ ±12.0% typical day')).toBeInTheDocument()
        expect(screen.getByText('10× certificate ≈ ±24.0% typical day')).toBeInTheDocument()
    })

    it('shows previous-day levels, the 20-day range, pivots, gap and volume', () => {
        render(<RangeCard range={range} />)

        expect(screen.getByText('Prev H / L / C: 229.10 / 224.25 / 227.48')).toBeInTheDocument()
        expect(screen.getByText('20-day H / L: 233.00 / 210.50')).toBeInTheDocument()
        expect(screen.getByText('P 226.94 · R1 229.64 · S1 224.79')).toBeInTheDocument()
        expect(screen.getByText('Gap -0.8%')).toBeInTheDocument()
        expect(screen.getByText('Volume 1.8× normal')).toBeInTheDocument()
    })

    it('shows dashes when ATR, the 20-day range, gap or volume are missing', () => {
        render(<RangeCard range={{ ...range, atr: null, atrPercent: null, high20: null, low20: null, gapPercent: null, relativeVolume: null }} />)

        expect(screen.getByText('ATR –')).toBeInTheDocument()
        expect(screen.queryByText(/certificate/)).not.toBeInTheDocument()
        expect(screen.getByText('20-day H / L: – / –')).toBeInTheDocument()
        expect(screen.getByText('Gap –')).toBeInTheDocument()
        expect(screen.getByText('Volume –')).toBeInTheDocument()
    })
})

describe('NewsCard', () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] })
        vi.setSystemTime(new Date('2026-10-10T12:00:00Z'))
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    const article = (n: number, polarity?: number) => ({
        date: `2026-10-10T0${n}:00:00Z`,
        title: `Headline ${n}`,
        link: `https://example.com/${n}`,
        symbols: ['AAPL.US'],
        ...(polarity === undefined ? {} : { sentiment: { polarity, neg: 0, neu: 1, pos: 0 } }),
    })

    it('links up to five headlines in a new tab with relative times', () => {
        const articles = [7, 6, 5, 4, 3, 2].map(n => article(n, 0))
        render(<NewsCard news={{ articles, avgPolarity: 0, tone: 'Neutral', error: null }} />)

        expect(screen.getByRole('heading', { name: 'News' })).toBeInTheDocument()
        const links = screen.getAllByRole('link')
        expect(links).toHaveLength(5)
        expect(links[0]).toHaveTextContent('Headline 7')
        expect(links[0]).toHaveAttribute('href', 'https://example.com/7')
        expect(links[0]).toHaveAttribute('target', '_blank')
        expect(links[0]).toHaveAttribute('rel', 'noopener noreferrer')
        expect(screen.getByText('5 hours ago')).toBeInTheDocument()
        expect(screen.getByText('Tone: Neutral')).toBeInTheDocument()
    })

    it('marks each headline with a sentiment dot', () => {
        const articles = [article(5, 0.2), article(4, -0.2), article(3, 0.1), article(2)]
        render(<NewsCard news={{ articles, avgPolarity: 0.03, tone: 'Neutral', error: null }} />)

        expect(screen.getAllByLabelText('Positive sentiment')).toHaveLength(1)
        expect(screen.getAllByLabelText('Negative sentiment')).toHaveLength(1)
        expect(screen.getAllByLabelText('Neutral sentiment')).toHaveLength(2)
    })

    it('shows the empty state when there is no news', () => {
        render(<NewsCard news={{ articles: [], avgPolarity: null, tone: null, error: null }} />)

        expect(screen.getByText('No news in the last 72 h')).toBeInTheDocument()
        expect(screen.queryByText(/Tone/)).not.toBeInTheDocument()
    })

    it('shows only the error when news failed', () => {
        render(<NewsCard news={{ articles: [], avgPolarity: null, tone: null, error: 'Failed to load news.' }} />)

        expect(screen.getByText('Failed to load news.')).toBeInTheDocument()
        expect(screen.queryByText('No news in the last 72 h')).not.toBeInTheDocument()
    })
})
