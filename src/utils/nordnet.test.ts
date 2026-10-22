import { describe, it, expect } from 'vitest'
import { nordnetUrl } from './nordnet'

describe('nordnetUrl', () => {
    it('searches the Finnish ticker on the Nordnet search page', () => {
        expect(nordnetUrl('NOKIA', 'HE')).toBe('https://www.nordnet.fi/etsi?q=NOKIA')
    })

    it('searches the US ticker', () => {
        expect(nordnetUrl('AAPL', 'US')).toBe('https://www.nordnet.fi/etsi?q=AAPL')
    })

    it('searches the London ticker', () => {
        expect(nordnetUrl('VOD', 'LSE')).toBe('https://www.nordnet.fi/etsi?q=VOD')
    })

    it('encodes the query so names with spaces and accents stay valid', () => {
        expect(nordnetUrl('', 'HE', 'Nokian Renkaat Oyj')).toBe('https://www.nordnet.fi/etsi?q=Nokian%20Renkaat%20Oyj')
    })

    it('trims the ticker before searching', () => {
        expect(nordnetUrl('  AAPL  ', 'US')).toBe('https://www.nordnet.fi/etsi?q=AAPL')
    })

    it('falls back to the exchange when neither a ticker nor a name is given', () => {
        expect(nordnetUrl('', 'US')).toBe('https://www.nordnet.fi/etsi?q=Nasdaq')
        expect(nordnetUrl('', 'HE', '  ')).toBe('https://www.nordnet.fi/etsi?q=Helsinki')
        expect(nordnetUrl('', 'LSE')).toBe('https://www.nordnet.fi/etsi?q=LSE')
    })
})