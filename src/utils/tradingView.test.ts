import { describe, it, expect } from 'vitest'
import { tradingViewUrl } from './tradingView'

describe('tradingViewUrl', () => {
    it('uses the bare code for US stocks', () => {
        expect(tradingViewUrl('AAPL', 'US')).toBe('https://www.tradingview.com/chart/?symbol=AAPL')
    })

    it('prefixes Helsinki stocks with OMXHEX and encodes the colon', () => {
        expect(tradingViewUrl('NOKIA', 'HE')).toBe('https://www.tradingview.com/chart/?symbol=OMXHEX%3ANOKIA')
    })

    it('prefixes London stocks with LSE', () => {
        expect(tradingViewUrl('VOD', 'LSE')).toBe('https://www.tradingview.com/chart/?symbol=LSE%3AVOD')
    })
})
