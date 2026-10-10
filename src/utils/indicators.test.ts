import { describe, it, expect } from 'vitest'
import {
    Bar,
    sma,
    rsi,
    trueRange,
    atr,
    pivots,
    streak,
    relativeVolume,
    rangeHighLow,
    gapPercent
} from './indicators'

const bar = (high: number, low: number, close: number, open = close, volume = 100, date = '2026-01-01'): Bar =>
    ({ date, open, high, low, close, volume })

describe('sma', () => {
    it('is the mean of the last period values', () => {
        expect(sma([1, 2, 3, 4, 5], 3)).toBe(4)
    })

    it('returns null when there are fewer values than the period', () => {
        expect(sma([1, 2], 3)).toBeNull()
    })
})

describe('rsi', () => {
    const rising = Array.from({ length: 30 }, (_, i) => 100 + i)
    const falling = Array.from({ length: 30 }, (_, i) => 100 - i)
    const flat = Array.from({ length: 30 }, () => 100)
    const alternating = Array.from({ length: 60 }, (_, i) => (i % 2 === 0 ? 100 : 101))

    it('is 100 for a strictly rising series', () => {
        expect(rsi(rising)?.value).toBe(100)
    })

    it('is 0 for a strictly falling series', () => {
        expect(rsi(falling)?.value).toBe(0)
    })

    it('is 50 for a flat series', () => {
        expect(rsi(flat)?.value).toBe(50)
    })

    it('stays near 50 for an alternating series', () => {
        const value = rsi(alternating)!.value
        expect(value).toBeGreaterThanOrEqual(45)
        expect(value).toBeLessThanOrEqual(55)
    })

    it('uses Wilder smoothing and reports the previous bar value', () => {
        expect(rsi([1, 2, 1, 2, 3], 2)).toEqual({ value: 87.5, previous: 75 })
    })

    it('weights the previous average by period - 1 when smoothing', () => {
        const result = rsi([1, 2, 1, 2, 3, 4], 3)!
        expect(result.value).toBeCloseTo(100 - 100 / (1 + 23 / 4))
        expect(result.previous).toBeCloseTo(100 - 100 / (1 + 7 / 2))
    })

    it('needs period + 2 closes', () => {
        expect(rsi([1, 2, 1, 2], 2)).toEqual({ value: 75, previous: 50 })
        expect(rsi([1, 2, 1], 2)).toBeNull()
    })
})

describe('trueRange', () => {
    it('uses the gap from the previous close when it is larger than high - low', () => {
        expect(trueRange(bar(15, 13, 14), 11)).toBe(4)
        expect(trueRange(bar(12, 10, 11), 14)).toBe(4)
    })

    it('is high - low without a gap', () => {
        expect(trueRange(bar(12, 10, 11), 11)).toBe(2)
    })
})

describe('atr', () => {
    it('is 2 for bars with a constant range of 2 and no gaps', () => {
        const bars = Array.from({ length: 30 }, () => bar(101, 99, 100))
        const result = atr(bars)!
        expect(result.value).toBe(2)
        expect(result.percent).toBe(2)
    })

    it('seeds with the mean true range and then applies Wilder smoothing', () => {
        const bars = [bar(11, 9, 10), bar(12, 10, 11), bar(15, 13, 14), bar(14, 12, 13)]
        const result = atr(bars, 2)!
        expect(result.value).toBeCloseTo(2.5)
        expect(result.percent).toBeCloseTo(2.5 / 13 * 100)
    })

    it('returns null without period + 1 bars', () => {
        expect(atr([bar(11, 9, 10), bar(12, 10, 11)], 2)).toBeNull()
    })
})

describe('pivots', () => {
    it('computes classic floor pivots', () => {
        expect(pivots(bar(110, 90, 100))).toEqual({ p: 100, r1: 110, s1: 90 })
    })
})

describe('streak', () => {
    it('counts consecutive up closes', () => {
        expect(streak([1, 2, 3, 4])).toBe(3)
    })

    it('counts consecutive down closes as negative', () => {
        expect(streak([4, 3, 2])).toBe(-2)
    })

    it('is 0 when the last close is unchanged', () => {
        expect(streak([1, 2, 2])).toBe(0)
    })

    it('stops at the first change of direction', () => {
        expect(streak([5, 1, 2, 3])).toBe(2)
    })

    it('is 0 with fewer than two closes', () => {
        expect(streak([1])).toBe(0)
    })
})

describe('relativeVolume', () => {
    it('divides the last volume by the mean of the period volumes before it', () => {
        const volumes = [...Array.from({ length: 20 }, () => 100), 200]
        expect(relativeVolume(volumes)).toBe(2)
    })

    it('returns null without period + 1 volumes', () => {
        expect(relativeVolume(Array.from({ length: 20 }, () => 100))).toBeNull()
    })

    it('returns null when the earlier volumes are all zero', () => {
        expect(relativeVolume([0, 0, 0, 50], 3)).toBeNull()
    })
})

describe('rangeHighLow', () => {
    it('is the max high and min low over the last period bars', () => {
        const bars = [bar(500, 1, 100), bar(105, 95, 100), bar(110, 98, 100), bar(103, 90, 100)]
        expect(rangeHighLow(bars, 3)).toEqual({ high: 110, low: 90 })
    })

    it('returns null with fewer bars than the period', () => {
        expect(rangeHighLow([bar(105, 95, 100)], 3)).toBeNull()
    })
})

describe('gapPercent', () => {
    it('compares the last open with the previous close', () => {
        expect(gapPercent([bar(101, 99, 100), bar(104, 102, 103, 103)])).toBeCloseTo(3)
    })

    it('returns null with fewer than two bars', () => {
        expect(gapPercent([bar(101, 99, 100)])).toBeNull()
    })
})
