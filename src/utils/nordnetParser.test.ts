import { describe, it, expect } from 'vitest'
import { parseNordnetOrder, parseFinnishNumber } from './nordnetParser'

const SAMPLE = `Vahvista toimeksianto
Vahvista alla olevat tiedot, jotta arvot ovat varmasti oikeat

* Instrumentti
MINI L NOKIA NORDNET FI24
* Osta/myy
Myyntitoimeksianto
* Tili
Uusi nousu
 · 20339206
* ToimeksiantotyyppiLimit
* Määrä200
* Hinta/kpl1,92 EUR
* Voimassaolo (valitun pvm. loppuun asti)22.10.2026
* Välityspalkkio−0,00 EUR
* Yhteensä384,00 EUR`

const BUY = `Vahvista toimeksianto
* Instrumentti: MINI L NOKIA NORDNET FI24
* Osta/myy: Ostotoimeksianto
* Tili: Uusi nousu · 20339206
* Toimeksiantotyyppi: Limit
* Määrä: 100
* Hinta/kpl: 1,62 EUR
* Voimassaolo (valitun pvm. loppuun asti): 22.10.2026
* Välityspalkkio: −1,00 EUR
* Yhteensä: 161,00 EUR`

const parsed = (text: string) => {
    const result = parseNordnetOrder(text)
    if (!result.ok) throw new Error(`Expected the paste to parse, missing ${result.missing.join(', ')}`)
    return result
}

describe('parseNordnetOrder', () => {
    it('reads the sell order confirmation pasted from the Nordnet site', () => {
        const result = parsed(SAMPLE)

        expect(result.order).toEqual({
            side: 'sell',
            instrument: 'MINI L NOKIA NORDNET FI24',
            account: 'Uusi nousu · 20339206',
            orderType: 'Limit',
            quantity: 200,
            price: 1.92,
            currency: 'EUR',
            commission: 0,
            total: 384,
            validUntil: '2026-10-22',
        })
        expect(result.warnings).toEqual([])
    })

    it('reads a buy order whose values sit on the label line', () => {
        const result = parsed(BUY)

        expect(result.order.side).toBe('buy')
        expect(result.order.quantity).toBe(100)
        expect(result.order.price).toBe(1.62)
        expect(result.order.commission).toBe(1)
        expect(result.order.account).toBe('Uusi nousu · 20339206')
        expect(result.warnings).toEqual([])
    })

    it('reads values that are on their own lines', () => {
        const result = parsed(`Instrumentti
NOKIA
Osta/myy
Ostotoimeksianto
Määrä
250
Hinta/kpl
0,80 EUR`)

        expect(result.order).toMatchObject({ side: 'buy', instrument: 'NOKIA', quantity: 250, price: 0.8 })
    })

    it('copes with no bullets, extra spaces and CRLF line endings', () => {
        const result = parsed(`  Instrumentti   MINI L NOKIA NORDNET FI24\r\n- Osta/myy\r\nMyyntitoimeksianto\r\n• Määrä  200\r\nHinta/kpl  1,92 EUR\r\n`)

        expect(result.order).toMatchObject({ side: 'sell', instrument: 'MINI L NOKIA NORDNET FI24', quantity: 200, price: 1.92 })
    })

    it('unwraps a Markdown link and keeps a nordnet.fi url', () => {
        const result = parsed('Instrumentti\n[MINI L NOKIA NORDNET FI24](https://www.nordnet.fi/tuote/1234)\nOsta/myy\nOstotoimeksianto\nMäärä10\nHinta/kpl1,00 EUR')

        expect(result.order.instrument).toBe('MINI L NOKIA NORDNET FI24')
        expect(result.order.instrumentUrl).toBe('https://www.nordnet.fi/tuote/1234')
    })

    it('drops a Markdown link to somewhere else', () => {
        const result = parsed('Instrumentti\n[MINI L NOKIA NORDNET FI24](https://example.com/tuote/1234)\nOsta/myy\nOstotoimeksianto\nMäärä10\nHinta/kpl1,00 EUR')

        expect(result.order.instrument).toBe('MINI L NOKIA NORDNET FI24')
        expect(result.order.instrumentUrl).toBeUndefined()
    })

    it('reads a price with a space as the thousands separator', () => {
        const result = parsed('Instrumentti\nNOKIA\nOsta/myy\nOstotoimeksianto\nMäärä1 000\nHinta/kpl12 345,50 EUR')

        expect(result.order.quantity).toBe(1000)
        expect(result.order.price).toBe(12345.5)
        expect(result.order.currency).toBe('EUR')
    })

    it('warns when the total does not match quantity × price but still parses', () => {
        const result = parsed('Instrumentti\nNOKIA\nOsta/myy\nOstotoimeksianto\nMäärä100\nHinta/kpl1,62 EUR\nYhteensä200,00 EUR')

        expect(result.order.quantity).toBe(100)
        expect(result.warnings).toEqual(["Total doesn't match quantity × price"])
    })

    it('reports a missing price', () => {
        const result = parseNordnetOrder('Instrumentti\nNOKIA\nOsta/myy\nOstotoimeksianto\nMäärä100')

        expect(result.ok).toBe(false)
        if (result.ok) return
        expect(result.missing).toEqual(['price'])
        expect(result.partial.instrument).toBe('NOKIA')
        expect(result.partial.quantity).toBe(100)
    })

    it('reports everything it could not find in English text', () => {
        const result = parseNordnetOrder('Order confirmation\nInstrument: Nokia\nQuantity: 100\nPrice: 1,62')

        expect(result.ok).toBe(false)
        if (result.ok) return
        expect(result.missing).toEqual(['instrument', 'side', 'quantity', 'price'])
    })

    it('reports everything it could not find in empty text', () => {
        const result = parseNordnetOrder('   \n\n  ')

        expect(result.ok).toBe(false)
        if (result.ok) return
        expect(result.missing).toEqual(['instrument', 'side', 'quantity', 'price'])
    })

    it('does not read a label from the middle of a line', () => {
        const result = parsed('Instrumentti\nTILI OY NORDNET FI24\nOsta/myy\nOstotoimeksianto\nMäärä10\nHinta/kpl1,00 EUR')

        expect(result.order.instrument).toBe('TILI OY NORDNET FI24')
        expect(result.order.account).toBeUndefined()
    })
})

describe('parseFinnishNumber', () => {
    it.each([
        ['1 234,50 EUR', 1234.5],
        ['1 234,50', 1234.5],
        ['1 234,50', 1234.5],
        ['1,92', 1.92],
        ['1.92', 1.92],
        ['200', 200],
        ['−0,00', 0],
        ['-12,40 EUR', -12.4],
        ['1 000', 1000],
    ])('reads %s as %d', (text, expected) => {
        expect(parseFinnishNumber(text)).toBe(expected)
    })

    it('returns null when there is no number', () => {
        expect(parseFinnishNumber('EUR')).toBeNull()
        expect(parseFinnishNumber('')).toBeNull()
    })
})

