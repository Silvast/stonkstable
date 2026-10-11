import { describe, it, expect } from 'vitest'
import { buildAnalysis, ANALYSIS_THRESHOLDS } from './analysis'
import { NewsArticle, NewsResult } from './news'
import { makeSeries } from '../test/mocks/eodSeries'

const scored = (polarity: number, link: string): NewsArticle => ({
    date: '2026-07-30T10:00:00+00:00',
    title: `Headline ${link}`,
    link,
    symbols: ['AAPL.US'],
    sentiment: { polarity, neg: 0, neu: 1, pos: 0 },
})
const unscored: NewsArticle = { date: '2026-07-30T09:00:00+00:00', title: 'Unscored', link: 'u', symbols: ['AAPL.US'] }

const positiveNews: NewsResult = { data: [scored(0.5, 'a'), scored(0.6, 'b'), unscored], error: null }
const negativeNews: NewsResult = { data: [scored(-0.5, 'a'), scored(-0.7, 'b')], error: null }
const noNews: NewsResult = { data: [], error: null }

const fromCloses = (closes: number[]) =>
    makeSeries({ days: closes.length, start: 0, drift: 0, range: 2, volume: 1000 })
        .map((bar, i) => ({ ...bar, open: closes[i], close: closes[i], high: closes[i] + 1, low: closes[i] - 1 }))

const uptrend =makeSeries({ days: 60, start: 100, drift: 1, range: 2, volume: 1000, lastVolume: 2000 })
const downtrend = makeSeries({ days: 60, start: 200, drift: -1, range: 2, volume: 1000, lastVolume: 3000 })

describe('buildAnalysis', () => {
    describe('steady uptrend with high RSI, a volume spike and positive news', () => {
        const result = buildAnalysis(uptrend, positiveNews)

        it('reports the last bar', () => {
            expect(result.asOf).toBe(uptrend[59].date)
            expect(result.lastClose).toBe(159)
            expect(result.dayChangePercent).toBeCloseTo((159 / 158 - 1) * 100)
        })

        it('labels RSI overbought', () => {
            expect(result.rsi).toEqual({ value: 100, previous: 100, label: 'Overbought' })
        })

        it('labels the trend Up with distances to the averages and the streak', () => {
            expect(result.trend.label).toBe('Up')
            expect(result.trend.sma20).toBe(149.5)
            expect(result.trend.sma50).toBe(134.5)
            expect(result.trend.vsSma20Pct).toBeCloseTo((159 / 149.5 - 1) * 100)
            expect(result.trend.vsSma50Pct).toBeCloseTo((159 / 134.5 - 1) * 100)
            expect(result.trend.streak).toBe(59)
        })

        it('uses the last bar for previous-day levels and pivots', () => {
            expect(result.range.prevHigh).toBe(160)
            expect(result.range.prevLow).toBe(157)
            expect(result.range.prevClose).toBe(159)
            expect(result.range.pivots.p).toBeCloseTo((160 + 157 + 159) / 3)
            expect(result.range.high20).toBe(160)
            expect(result.range.low20).toBe(138)
            expect(result.range.atr).toBeCloseTo(3)
            expect(result.range.atrPercent).toBeCloseTo(3 / 159 * 100)
            expect(result.range.gapPercent).toBe(0)
            expect(result.range.relativeVolume).toBe(2)
        })

        it('averages polarity over scored articles only', () => {
            expect(result.news.avgPolarity).toBeCloseTo(0.55)
            expect(result.news.tone).toBe('Positive')
            expect(result.news.articles).toHaveLength(3)
            expect(result.news.error).toBeNull()
        })

        it('scores overbought RSI against the uptrend, volume and news: 2, leaning long', () => {
            expect(result.bias).toEqual({
                score: 2,
                label: 'Leaning long',
                reasons: [
                    'RSI 100, overbought',
                    'Above 20- and 50-day averages',
                    'Up day on 2.0× volume',
                    '2 positive headlines in 72 h',
                ],
            })
        })
    })

    describe('steady downtrend with a volume spike and negative news', () => {
        const result = buildAnalysis(downtrend, negativeNews)

        it('scores oversold RSI against the downtrend, volume and news: -2, leaning short', () => {
            expect(result.rsi?.label).toBe('Oversold')
            expect(result.trend.label).toBe('Down')
            expect(result.news.tone).toBe('Negative')
            expect(result.bias).toEqual({
                score: -2,
                label: 'Leaning short',
                reasons: [
                    'RSI 0, oversold',
                    'Below 20- and 50-day averages',
                    'Down day on 3.0× volume',
                    '2 negative headlines in 72 h',
                ],
            })
        })
    })

    it('stands aside when the rules cancel out', () => {
        const flat = makeSeries({ days: 60, start: 100, drift: 0, range: 2, volume: 1000 })
        const result = buildAnalysis(flat, noNews)

        expect(result.trend.label).toBe('Sideways')
        expect(result.rsi?.label).toBe('Neutral')
        expect(result.bias).toEqual({ score: 0, label: 'Stand aside', reasons: [] })
    })

    it('ignores volume spikes below the threshold', () => {
        const series = makeSeries({ days: 60, start: 100, drift: 1, range: 2, volume: 1000, lastVolume: 1400 })
        const result = buildAnalysis(series, noNews)

        expect(result.bias.reasons).not.toContainEqual(expect.stringContaining('volume'))
        expect(ANALYSIS_THRESHOLDS.relVolumeHigh).toBe(1.5)
    })

    it('is Sideways when the close is above SMA20 but SMA20 is still below SMA50', () => {
        const bounce = fromCloses([...Array(40).fill(200), ...Array(19).fill(100), 150])
        const result = buildAnalysis(bounce, noNews)

        expect(result.trend.sma20).toBe(102.5)
        expect(result.trend.sma50).toBe(161)
        expect(result.trend.label).toBe('Sideways')
    })

    it('is Sideways when the close is below SMA20 but SMA20 is still above SMA50', () => {
        const pullback = fromCloses([...Array(40).fill(100), ...Array(19).fill(200), 150])

        expect(buildAnalysis(pullback, noNews).trend.label).toBe('Sideways')
    })

    it('compares against SMA20 only when there is not enough history for SMA50', () => {
        const series = makeSeries({ days: 30, start: 100, drift: 1, range: 2, volume: 1000 })
        const result = buildAnalysis(series, noNews)

        expect(result.trend.sma50).toBeNull()
        expect(result.trend.vsSma50Pct).toBeNull()
        expect(result.trend.label).toBe('Up')
        expect(result.bias.reasons).toContain('Above 20-day average')
    })

    it('skips the news rule and keeps the error when news failed', () => {
        const result = buildAnalysis(uptrend, { data: [], error: 'Failed to load news.' })

        expect(result.news).toEqual({ articles: [], avgPolarity: null, tone: null, error: 'Failed to load news.' })
        expect(result.bias.reasons).not.toContainEqual(expect.stringContaining('headline'))
        expect(result.bias.score).toBe(1)
        expect(result.trend.label).toBe('Up')
    })

    it('has no tone when no article is scored', () => {
        const result = buildAnalysis(uptrend, { data: [unscored], error: null })

        expect(result.news.avgPolarity).toBeNull()
        expect(result.news.tone).toBeNull()
    })

    it('stands aside with "Not enough history" for 10 bars without throwing', () => {
        const short = makeSeries({ days: 10, start: 100, drift: 1, range: 2, volume: 1000, lastVolume: 5000 })

        const result = buildAnalysis(short, positiveNews)

        expect(result.bias).toEqual({ score: 0, label: 'Stand aside', reasons: ['Not enough history'] })
        expect(result.rsi).toBeNull()
        expect(result.trend.sma20).toBeNull()
        expect(result.lastClose).toBe(109)
    })

    it('gives the same result for descending input as for ascending', () => {
        expect(buildAnalysis([...uptrend].reverse(), positiveNews)).toEqual(buildAnalysis(uptrend, positiveNews))
    })

    describe('signals', () => {
        it('explains every rule in the order Trend, Momentum, Volume, News', () => {
            expect(buildAnalysis(uptrend, positiveNews).signals).toEqual([
                { rule: 'Trend', score: 1, text: 'Above 20- and 50-day averages' },
                { rule: 'Momentum', score: -1, text: 'RSI 100, overbought' },
                { rule: 'Volume', score: 1, text: 'Up day on 2.0× volume' },
                { rule: 'News', score: 1, text: '2 positive headlines in 72 h' },
            ])
        })

        it('explains rules that did not fire', () => {
            const flat = makeSeries({ days: 60, start: 100, drift: 0, range: 2, volume: 1000 })

            expect(buildAnalysis(flat, noNews).signals).toEqual([
                { rule: 'Trend', score: 0, text: 'No clear trend against the averages' },
                { rule: 'Momentum', score: 0, text: 'RSI 50, neither overbought nor oversold' },
                { rule: 'Volume', score: 0, text: '1.0× normal volume, no confirmation' },
                { rule: 'News', score: 0, text: 'No headlines in 72 h' },
            ])
        })

        it('scores the downtrend rules negatively', () => {
            const signals = buildAnalysis(downtrend, negativeNews).signals

            expect(signals.map(signal => signal.score)).toEqual([-1, 1, -1, -1])
            expect(signals[0].text).toBe('Below 20- and 50-day averages')
        })

        it('explains missing or mixed news', () => {
            const news = (result: NewsResult) => buildAnalysis(uptrend, result).signals[3]

            expect(news({ data: [], error: 'Failed to load news.' })).toEqual({ rule: 'News', score: 0, text: 'News unavailable' })
            expect(news({ data: [unscored], error: null })).toEqual({ rule: 'News', score: 0, text: 'No scored headlines' })
            expect(news({ data: [scored(0.5, 'a'), scored(-0.5, 'b')], error: null }))
                .toEqual({ rule: 'News', score: 0, text: 'Mixed or neutral headlines' })
        })

        it('says when there is not enough volume history to compare', () => {
            const twentyDays = makeSeries({ days: 20, start: 100, drift: 1, range: 2, volume: 1000 })

            expect(buildAnalysis(twentyDays, noNews).signals[2]).toEqual({ rule: 'Volume', score: 0, text: 'Not enough volume history' })
        })

        it('has no signals without enough history', () => {
            const short = makeSeries({ days: 10, start: 100, drift: 1, range: 2, volume: 1000 })

            expect(buildAnalysis(short, noNews).signals).toEqual([])
        })
    })

    it('keeps the last 20 closes, oldest first, for the trend chart', () => {
        const result = buildAnalysis([...uptrend].reverse(), noNews)

        expect(result.trend.recentCloses).toEqual(Array.from({ length: 20 }, (_, i) => 140 + i))
    })

    it('does not reorder the caller\'s array', () => {
        const descending = [...uptrend].reverse()
        buildAnalysis(descending, positiveNews)

        expect(descending[0].date).toBe(uptrend[59].date)
    })
})
