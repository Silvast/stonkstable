import { describe, it, expect } from 'vitest'
import { buildPriceChart, CHART } from './priceChart'
import { StockData } from './stockTable'

const row = (day: number, close: number, volume: number, open = close): StockData => ({
    date: `2026-10-${String(day).padStart(2, '0')}`,
    open,
    close,
    high: close + 0.05,
    low: close - 0.05,
    volume,
})

const rows = [
    row(5, 4.12, 18_000_000),
    row(1, 4.09, 20_000_000, 4.2),
    row(6, 4.35, 30_000_000),
    row(2, 4.18, 10_000_000),
    row(7, 4.68, 15_000_000),
]

const pointsOf = (path: string) =>
    path.split(/[ML]/).filter(Boolean).map(point => point.trim().split(' ').map(Number))

describe('buildPriceChart', () => {
    const chart = buildPriceChart(rows)

    it('draws five evenly spaced gridlines whose labels bracket every close', () => {
        expect(chart.grid).toHaveLength(5)
        const labels = chart.grid.map(line => Number(line.label))
        expect(Math.min(...labels)).toBeLessThanOrEqual(4.09)
        expect(Math.max(...labels)).toBeGreaterThanOrEqual(4.68)
        const ys = chart.grid.map(line => line.y)
        expect(ys[0]).toBeGreaterThan(ys[4])
        expect(ys[1] - ys[0]).toBeCloseTo(ys[2] - ys[1])
    })

    it('draws the close line oldest to newest across the chart width', () => {
        const points = pointsOf(chart.line)

        expect(chart.line.startsWith('M')).toBe(true)
        expect(points).toHaveLength(5)
        expect(points[0][0]).toBeCloseTo(CHART.left)
        expect(points[4][0]).toBeCloseTo(CHART.width - CHART.right)
        const highest = points.reduce((best, point) => (point[1] < best[1] ? point : best))
        expect(highest).toBe(points[4])
    })

    it('draws one volume bar per day, scaled to the busiest day and coloured by direction', () => {
        expect(chart.bars).toHaveLength(5)
        const tallest = chart.bars.reduce((best, bar) => (bar.height > best.height ? bar : best))
        expect(tallest.height).toBeCloseTo(CHART.volumeHeight)
        expect(chart.bars[3]).toBe(tallest)
        expect(chart.bars.map(bar => bar.up)).toEqual([false, true, false, true, true])
    })

    it('labels up to five dates including the first and last day', () => {
        expect(chart.dates.length).toBeLessThanOrEqual(5)
        expect(chart.dates[0].label).toBe('1 Oct')
        expect(chart.dates[chart.dates.length - 1].label).toBe('7 Oct')
    })

    it('describes the chart for screen readers', () => {
        expect(chart.description).toBe('Closing price from 4.09 to 4.68 over 5 trading days, with daily volume bars')
    })

    it('handles a single flat day without NaN', () => {
        const single = buildPriceChart([row(1, 10, 0)])

        expect(single.line).not.toContain('NaN')
        expect(single.grid.every(line => Number.isFinite(line.y))).toBe(true)
        expect(single.bars[0].height).toBe(0)
    })
})
