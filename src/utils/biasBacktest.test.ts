import { describe, it, expect, vi, afterEach } from 'vitest'
import { backtestBias } from './biasBacktest'
import { buildAnalysis } from './analysis'
import { makeSeries } from '../test/mocks/eodSeries'
import { StockData } from './stockTable'

type Label = 'Leaning long' | 'Leaning short' | 'Stand aside'

// buildAnalysis is real unless a test overrides its bias label to get known answers.
vi.mock('./analysis', async (importOriginal) => {
    const actual = await importOriginal<typeof import('./analysis')>()
    return { ...actual, buildAnalysis: vi.fn(actual.buildAnalysis) }
})

const actual = await vi.importActual<typeof import('./analysis')>('./analysis')

const bars = (closes: number[]): StockData[] => closes.map((close, i) => ({
    date: new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10),
    open: close,
    close,
    high: close + 1,
    low: close - 1,
    volume: 1000,
}))

// bars.length is the number of bars passed in, so the label for day index i is keyed by i + 1.
const forceLabels = (byDayIndex: Record<number, Label>) => {
    vi.mocked(buildAnalysis).mockImplementation((history, news) => ({
        ...actual.buildAnalysis(history, news),
        bias: { score: 0, label: byDayIndex[history.length - 1] ?? 'Stand aside', reasons: [] },
    }))
}

afterEach(() => {
    vi.mocked(buildAnalysis).mockImplementation(actual.buildAnalysis)
})

describe('backtestBias', () => {
    it('evaluates only days with at least 20 bars of history and leaves out the last days without a full horizon', () => {
        const result = backtestBias(makeSeries({ days: 30, start: 100, drift: 1, range: 2, volume: 1000 }))

        // Days 20..30 (1-based) have enough history: 11 days in total
        expect(result.days).toBe(11)
        expect(result.horizons).toEqual([1, 3, 5])
        expect(result.rows.map(row => row.label)).toEqual(['Leaning long', 'Leaning short', 'Stand aside'])
        expect(result.rows.reduce((sum, row) => sum + row.signals, 0)).toBe(11)
    })

    it('returns no days when there is not enough history', () => {
        const result = backtestBias(makeSeries({ days: 19, start: 100, drift: 1, range: 2, volume: 1000 }))

        expect(result.days).toBe(0)
        expect(result.baseline[1].samples).toBe(0)
        expect(result.baseline[1].upRate).toBeNull()
    })

    it('reports zero returns and no hit rate for a flat price', () => {
        const result = backtestBias(makeSeries({ days: 40, start: 100, drift: 0, range: 0, volume: 1000 }))

        const aside = result.rows.find(row => row.label === 'Stand aside')!
        expect(aside.signals).toBe(result.days)
        for (const horizon of [1, 3, 5]) {
            expect(aside.byHorizon[horizon].avgReturnPercent).toBe(0)
            expect(aside.byHorizon[horizon].hitRate).toBeNull()
            expect(result.baseline[horizon].upRate).toBe(0)
            expect(result.baseline[horizon].downRate).toBe(0)
        }
    })

    it('measures the base rate over every day that has a forward close', () => {
        const result = backtestBias(makeSeries({ days: 30, start: 100, drift: 1, range: 2, volume: 1000 }))

        // Days 19..29 (0-based) have a next-day close; days 19..24 have a close five days ahead
        expect(result.baseline[1].samples).toBe(10)
        expect(result.baseline[5].samples).toBe(6)
        expect(result.baseline[1].upRate).toBe(1)
        expect(result.baseline[1].downRate).toBe(0)
        expect(result.baseline[1].avgReturnPercent).toBeCloseTo(
            Array.from({ length: 10 }, (_, k) => ((120 + k) / (119 + k) - 1) * 100).reduce((a, b) => a + b) / 10
        )
    })

    it('scores long and short hits against the direction of the closes that follow', () => {
        // Bars 0..18 close at 100. Bars 19..24 are 100, 110, 105, 120, 90, 95.
        const closes = [...Array(19).fill(100), 100, 110, 105, 120, 90, 95]
        // Labels for bar indexes 19..24
        forceLabels({ 19: 'Leaning long', 20: 'Leaning short', 21: 'Stand aside', 22: 'Leaning long', 23: 'Leaning short', 24: 'Stand aside' })

        const result = backtestBias(bars(closes))
        const row = (label: Label) => result.rows.find(r => r.label === label)!

        expect(result.days).toBe(6)

        // Leaning long on bar 19 (100) and bar 22 (120)
        expect(row('Leaning long').signals).toBe(2)
        // 1 day: 100->110 is a rise (hit); 120->90 is a fall (miss)
        expect(row('Leaning long').byHorizon[1].samples).toBe(2)
        expect(row('Leaning long').byHorizon[1].hitRate).toBe(0.5)
        expect(row('Leaning long').byHorizon[1].avgReturnPercent).toBeCloseTo(-7.5)
        // 3 days: only bar 19 has a close three days ahead: 100->120 (hit)
        expect(row('Leaning long').byHorizon[3].samples).toBe(1)
        expect(row('Leaning long').byHorizon[3].hitRate).toBe(1)
        expect(row('Leaning long').byHorizon[3].avgReturnPercent).toBeCloseTo(20)
        // 5 days: only bar 19 has a close five days ahead: 100->95 (miss)
        expect(row('Leaning long').byHorizon[5].hitRate).toBe(0)
        expect(row('Leaning long').byHorizon[5].avgReturnPercent).toBeCloseTo(-5)

        // Leaning short on bar 20 (110) and bar 23 (90)
        // 1 day: 110->105 is a fall (hit); 90->95 is a rise (miss)
        expect(row('Leaning short').byHorizon[1].samples).toBe(2)
        expect(row('Leaning short').byHorizon[1].hitRate).toBe(0.5)
        expect(row('Leaning short').byHorizon[1].avgReturnPercent).toBeCloseTo(((105 / 110 - 1) * 100 + (95 / 90 - 1) * 100) / 2)
        // 3 days: only bar 20 has a close three days ahead: 110->90 (hit)
        expect(row('Leaning short').byHorizon[3].hitRate).toBe(1)

        // Stand aside has no hit rate, only an average return
        expect(row('Stand aside').byHorizon[1].hitRate).toBeNull()
        expect(row('Stand aside').byHorizon[1].samples).toBe(1)
        expect(row('Stand aside').byHorizon[1].avgReturnPercent).toBeCloseTo((120 / 105 - 1) * 100)
    })

    it('uses the horizons passed in', () => {
        const result = backtestBias(makeSeries({ days: 30, start: 100, drift: 1, range: 2, volume: 1000 }), [2])

        expect(result.horizons).toEqual([2])
        expect(Object.keys(result.baseline)).toEqual(['2'])
    })

    it('gives the same result whatever order the bars arrive in', () => {
        const rising = makeSeries({ days: 30, start: 100, drift: 1, range: 2, volume: 1000 })

        expect(backtestBias([...rising].reverse())).toEqual(backtestBias(rising))
    })
})
