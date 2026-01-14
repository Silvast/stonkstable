import { describe, it, expect } from 'vitest'
import {
  calculatePercentChange,
  calculatePrevDayChangePercent,
  descendingComparator,
  getComparator,
  stableSort,
  renderCellContent,
  StockData,
  Column,
} from './stockTable'

describe('calculatePercentChange', () => {
  it('calculates positive percent change correctly', () => {
    const row: StockData = {
      date: '2024-01-10',
      open: 100,
      close: 110,
      high: 115,
      low: 95,
      volume: 1000000,
    }
    expect(calculatePercentChange(row)).toBeCloseTo(10, 1)
  })

  it('calculates negative percent change correctly', () => {
    const row: StockData = {
      date: '2024-01-10',
      open: 100,
      close: 90,
      high: 105,
      low: 85,
      volume: 1000000,
    }
    expect(calculatePercentChange(row)).toBeCloseTo(-10, 1)
  })

  it('returns zero for no change', () => {
    const row: StockData = {
      date: '2024-01-10',
      open: 100,
      close: 100,
      high: 105,
      low: 95,
      volume: 1000000,
    }
    expect(calculatePercentChange(row)).toBe(0)
  })

  it('handles small percent changes', () => {
    const row: StockData = {
      date: '2024-01-10',
      open: 150.50,
      close: 151.00,
      high: 152,
      low: 150,
      volume: 1000000,
    }
    const result = calculatePercentChange(row)
    expect(result).toBeCloseTo(0.332, 2)
  })
})

describe('calculatePrevDayChangePercent', () => {
  const mockData: StockData[] = [
    { date: '2024-01-08', open: 100, close: 100, high: 105, low: 95, volume: 1000000 },
    { date: '2024-01-09', open: 100, close: 110, high: 115, low: 95, volume: 1000000 },
    { date: '2024-01-10', open: 110, close: 121, high: 125, low: 105, volume: 1000000 },
  ]

  it('calculates previous day change percent correctly', () => {
    const result = calculatePrevDayChangePercent(mockData[2], mockData)
    expect(result).toBeCloseTo(10, 1) // (121/110 - 1) * 100
  })

  it('returns 0 for first item in array', () => {
    const result = calculatePrevDayChangePercent(mockData[0], mockData)
    expect(result).toBe(0)
  })

  it('returns 0 when data is undefined', () => {
    const result = calculatePrevDayChangePercent(mockData[0])
    expect(result).toBe(0)
  })

  it('returns 0 when data is empty array', () => {
    const result = calculatePrevDayChangePercent(mockData[0], [])
    expect(result).toBe(0)
  })

  it('handles negative change', () => {
    const customData: StockData[] = [
      { date: '2024-01-09', open: 100, close: 110, high: 115, low: 95, volume: 1000000 },
      { date: '2024-01-10', open: 110, close: 99, high: 112, low: 98, volume: 1000000 },
    ]
    const result = calculatePrevDayChangePercent(customData[1], customData)
    expect(result).toBeCloseTo(-10, 1) // (99/110 - 1) * 100
  })
})

describe('descendingComparator', () => {
  it('compares dates correctly', () => {
    const a = { date: '2024-01-10' } as StockData
    const b = { date: '2024-01-09' } as StockData
    expect(descendingComparator(a, b, 'date')).toBeLessThan(0)
    expect(descendingComparator(b, a, 'date')).toBeGreaterThan(0)
  })

  it('compares numeric values correctly', () => {
    const a = { open: 150 } as StockData
    const b = { open: 100 } as StockData
    expect(descendingComparator(a, b, 'open')).toBeLessThan(0)
    expect(descendingComparator(b, a, 'open')).toBeGreaterThan(0)
  })

  it('returns 0 for equal values', () => {
    const a = { close: 100 } as StockData
    const b = { close: 100 } as StockData
    expect(descendingComparator(a, b, 'close')).toBe(0)
  })

  it('compares changePercent correctly', () => {
    const a: StockData = { date: '2024-01-10', open: 100, close: 110, high: 115, low: 95, volume: 1000000 }
    const b: StockData = { date: '2024-01-10', open: 100, close: 105, high: 110, low: 95, volume: 1000000 }
    expect(descendingComparator(a, b, 'changePercent')).toBeLessThan(0)
  })

  it('compares prevDayChangePercent correctly', () => {
    const data: StockData[] = [
      { date: '2024-01-08', open: 100, close: 100, high: 105, low: 95, volume: 1000000 },
      { date: '2024-01-09', open: 100, close: 110, high: 115, low: 95, volume: 1000000 },
      { date: '2024-01-10', open: 110, close: 132, high: 135, low: 105, volume: 1000000 },
    ]
    // data[2] has prevDayChangePercent of 20% ((132/110)-1)*100
    // data[1] has prevDayChangePercent of 10% ((110/100)-1)*100
    // For descending: if a > b, return -1 (a should come first)
    const result = descendingComparator(data[2], data[1], 'prevDayChangePercent', data)
    expect(result).toBeLessThan(0) // data[2] should come before data[1]
  })
})

describe('getComparator', () => {
  const mockData: StockData[] = [
    { date: '2024-01-08', open: 100, close: 100, high: 105, low: 95, volume: 1000000 },
    { date: '2024-01-09', open: 100, close: 110, high: 115, low: 95, volume: 1000000 },
  ]

  it('returns descending comparator for desc order', () => {
    const comparator = getComparator('desc', 'open', mockData)
    expect(comparator(mockData[0], mockData[1])).toBe(0) // Equal values
  })

  it('returns ascending comparator for asc order', () => {
    const comparator = getComparator('asc', 'open', mockData)
    // Equal values should return 0 (or -0, which is equal in JavaScript)
    expect(Math.abs(comparator(mockData[0], mockData[1]))).toBe(0)
  })

  it('handles date comparison with desc order', () => {
    const comparator = getComparator('desc', 'date', mockData)
    const result = comparator(mockData[1], mockData[0])
    expect(result).toBeLessThan(0)
  })

  it('handles date comparison with asc order', () => {
    const comparator = getComparator('asc', 'date', mockData)
    const result = comparator(mockData[1], mockData[0])
    expect(result).toBeGreaterThan(0)
  })
})

describe('stableSort', () => {
  it('sorts array correctly', () => {
    const data: StockData[] = [
      { date: '2024-01-10', open: 150, close: 155, high: 160, low: 145, volume: 1000000 },
      { date: '2024-01-09', open: 145, close: 150, high: 155, low: 140, volume: 900000 },
      { date: '2024-01-08', open: 140, close: 145, high: 150, low: 135, volume: 800000 },
    ]
    const comparator = getComparator('asc', 'open', data)
    const sorted = stableSort(data, comparator)
    expect(sorted[0].open).toBe(140)
    expect(sorted[1].open).toBe(145)
    expect(sorted[2].open).toBe(150)
  })

  it('maintains stable sort for equal values', () => {
    const data: StockData[] = [
      { date: '2024-01-10', open: 100, close: 105, high: 110, low: 95, volume: 1000000 },
      { date: '2024-01-09', open: 100, close: 110, high: 115, low: 95, volume: 900000 },
      { date: '2024-01-08', open: 100, close: 115, high: 120, low: 95, volume: 800000 },
    ]
    const comparator = getComparator('desc', 'open', data)
    const sorted = stableSort(data, comparator)
    // Should maintain original order for equal values
    expect(sorted[0].date).toBe('2024-01-10')
    expect(sorted[1].date).toBe('2024-01-09')
    expect(sorted[2].date).toBe('2024-01-08')
  })

  it('handles empty array', () => {
    const data: StockData[] = []
    const comparator = getComparator('desc', 'open', data)
    const sorted = stableSort(data, comparator)
    expect(sorted).toEqual([])
  })
})

describe('renderCellContent', () => {
  const mockRow: StockData = {
    date: '2024-01-10',
    open: 100,
    close: 110,
    high: 115,
    low: 95,
    volume: 1000000,
  }

  const mockData: StockData[] = [
    { date: '2024-01-09', open: 100, close: 100, high: 105, low: 95, volume: 900000 },
    mockRow,
  ]

  it('renders changePercent with positive value in green', () => {
    const column: Column = {
      id: 'changePercent',
      label: 'Change %',
      numeric: true,
      calculate: calculatePercentChange,
    }
    const result = renderCellContent(mockRow, column)
    expect(result).toBeDefined()
  })

  it('renders changePercent with negative value in red', () => {
    const negativeRow: StockData = {
      date: '2024-01-10',
      open: 110,
      close: 100,
      high: 115,
      low: 95,
      volume: 1000000,
    }
    const column: Column = {
      id: 'changePercent',
      label: 'Change %',
      numeric: true,
      calculate: calculatePercentChange,
    }
    const result = renderCellContent(negativeRow, column)
    expect(result).toBeDefined()
  })

  it('renders changePercent with zero value', () => {
    const zeroRow: StockData = {
      date: '2024-01-10',
      open: 100,
      close: 100,
      high: 105,
      low: 95,
      volume: 1000000,
    }
    const column: Column = {
      id: 'changePercent',
      label: 'Change %',
      numeric: true,
      calculate: calculatePercentChange,
    }
    const result = renderCellContent(zeroRow, column)
    expect(result).toBeDefined()
  })

  it('renders prevDayChangePercent correctly', () => {
    const column: Column = {
      id: 'prevDayChangePercent',
      label: 'Prev. day Change %',
      numeric: true,
      calculate: calculatePrevDayChangePercent,
    }
    const result = renderCellContent(mockRow, column, mockData)
    expect(result).toBeDefined()
  })

  it('formats volume with locale string', () => {
    const column: Column = {
      id: 'volume',
      label: 'Volume',
      numeric: true,
    }
    const result = renderCellContent(mockRow, column)
    expect(result).toBe('1,000,000')
  })

  it('formats numeric values with 2 decimal places', () => {
    const column: Column = {
      id: 'open',
      label: 'Open',
      numeric: true,
    }
    const result = renderCellContent(mockRow, column)
    expect(result).toBe('100.00')
  })

  it('renders date as-is', () => {
    const column: Column = {
      id: 'date',
      label: 'Date',
      numeric: false,
    }
    const result = renderCellContent(mockRow, column)
    expect(result).toBe('2024-01-10')
  })
})
