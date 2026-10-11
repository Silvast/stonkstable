import { describe, it, expect } from 'vitest'
import dayjs from 'dayjs'
import {
    formatVolume,
    summarisePrices,
    dailyMoves,
    pricesToCsv,
    formatDateRange,
    formatCloseDate,
    formatRowDate,
} from './priceStats'
import { mockStockData } from '../test/mocks/stockApi'
import { StockData } from './stockTable'

const row = (date: string, open: number, close: number, volume = 1000, high = Math.max(open, close) + 1, low = Math.min(open, close) - 1): StockData =>
    ({ date, open, close, high, low, volume })

describe('formatVolume', () => {
    it.each([
        [23_300_000, '23.3M'],
        [1_250_000_000, '1.3B'],
        [950_000, '950K'],
        [12_345, '12.3K'],
        [999, '999'],
        [0, '0'],
    ])('formats %d as %s', (value, expected) => {
        expect(formatVolume(value)).toBe(expected)
    })
})

describe('summarisePrices', () => {
    it('summarises rows in any order', () => {
        const summary = summarisePrices(mockStockData)!

        expect(summary.lastDate).toBe('2024-01-10')
        expect(summary.lastClose).toBe(155)
        expect(summary.change).toBe(5)
        expect(summary.changePercent).toBeCloseTo(100 / 30)
        expect(summary.high).toBe(156)
        expect(summary.low).toBe(143)
        expect(summary.averageVolume).toBe(1_016_000)
        expect(summary.upDays).toBe(2)
        expect(summary.days).toBe(5)
    })

    it('measures the period change from the first close to the last close', () => {
        const summary = summarisePrices([row('2026-10-01', 9, 10), row('2026-10-02', 10, 11), row('2026-10-05', 11, 12.5)])!

        expect(summary.periodChangePercent).toBeCloseTo(25)
        expect(summary.changePercent).toBeCloseTo((12.5 / 11 - 1) * 100)
    })

    it('reports no previous-day change for a single row', () => {
        const summary = summarisePrices([row('2026-10-01', 9, 10)])!

        expect(summary.change).toBeNull()
        expect(summary.changePercent).toBeNull()
        expect(summary.periodChangePercent).toBe(0)
    })

    it('returns null without rows', () => {
        expect(summarisePrices([])).toBeNull()
    })
})

describe('dailyMoves', () => {
    it('marks each day up or down against the previous close, and the first day against its open', () => {
        const moves = dailyMoves([row('2026-10-02', 10, 11), row('2026-10-01', 12, 10), row('2026-10-05', 11, 11)])

        expect(moves.map(move => [move.row.date, move.up])).toEqual([
            ['2026-10-01', false],
            ['2026-10-02', true],
            ['2026-10-05', false],
        ])
    })
})

describe('pricesToCsv', () => {
    it('writes a header and one oldest-first line per day', () => {
        const csv = pricesToCsv([row('2026-10-02', 10, 11, 2000, 11.5, 9.5), row('2026-10-01', 9, 10, 1000, 10.25, 8.75)])

        expect(csv).toBe([
            'Date,Open,High,Low,Close,Volume',
            '2026-10-01,9,10.25,8.75,10,1000',
            '2026-10-02,10,11.5,9.5,11,2000',
        ].join('\n'))
    })
})

describe('date labels', () => {
    it('shows the year once for a range within one year', () => {
        expect(formatDateRange(dayjs('2026-09-11'), dayjs('2026-10-10'))).toBe('11 Sep – 10 Oct 2026')
    })

    it('shows both years for a range across years', () => {
        expect(formatDateRange(dayjs('2025-12-28'), dayjs('2026-01-10'))).toBe('28 Dec 2025 – 10 Jan 2026')
    })

    it('labels the closing day', () => {
        expect(formatCloseDate('2026-10-09')).toBe('Fri 9 Oct close')
    })

    it('labels table rows with the weekday, adding the year only outside the current year', () => {
        const thisYear = dayjs().year()
        expect(formatRowDate(`${thisYear}-03-02`)).toBe(dayjs(`${thisYear}-03-02`).format('ddd D MMM'))
        expect(formatRowDate('2024-01-10')).toBe('Wed 10 Jan 2024')
    })
})
