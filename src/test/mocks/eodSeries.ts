import dayjs from 'dayjs'
import { StockData } from '../../utils/stockTable'

interface SeriesOptions {
    days: number
    start: number
    drift: number
    range: number
    volume: number
    lastVolume?: number
    startDate?: string
}

export const makeSeries = ({ days, start, drift, range, volume, lastVolume, startDate = '2026-06-01' }: SeriesOptions): StockData[] =>
    Array.from({ length: days }, (_, i) => {
        const close = start + drift * i
        const open = i === 0 ? close : start + drift * (i - 1)
        return {
            date: dayjs(startDate).add(i, 'day').format('YYYY-MM-DD'),
            open,
            close,
            high: Math.max(open, close) + range / 2,
            low: Math.min(open, close) - range / 2,
            volume: i === days - 1 && lastVolume !== undefined ? lastVolume : volume,
        }
    })
