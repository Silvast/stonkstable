import React from 'react'
import { describe, it, expect, afterEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { StockSelectionProvider, useStockSelection, StockEntry } from './StockSelectionContext'
import heStocks from '../assets/he.json'
import usStocks from '../assets/us.json'
import lseStocks from '../assets/lse.json'

const wrapper = ({ children }: { children: React.ReactNode }) => (
    <StockSelectionProvider>{children}</StockSelectionProvider>
)

describe('StockSelectionContext', () => {
    afterEach(() => {
        window.history.replaceState({}, '', '/')
    })

    it('defaults to AAPL on the US exchange with an empty API key', () => {
        const { result } = renderHook(() => useStockSelection(), { wrapper })

        expect(result.current.symbol).toBe('AAPL')
        expect(result.current.exchange).toBe('US')
        expect(result.current.apiKey).toBe('')
        expect(result.current.selectedStock?.Code).toBe('AAPL')
        expect(result.current.stockOptions).toBe(usStocks)
    })

    it('reads the API key from the ?apikey= URL param on mount', async () => {
        window.history.replaceState({}, '', '/?apikey=from-url')

        const { result } = renderHook(() => useStockSelection(), { wrapper })

        await waitFor(() => expect(result.current.apiKey).toBe('from-url'))
    })

    it('swaps the stock list to HE stocks when the exchange changes to HE', async () => {
        const { result } = renderHook(() => useStockSelection(), { wrapper })

        act(() => result.current.setExchange('HE'))

        await waitFor(() => expect(result.current.stockOptions).toBe(heStocks))
        expect(result.current.exchange).toBe('HE')
    })

    it('swaps the stock list to LSE stocks when the exchange changes to LSE', async () => {
        const { result } = renderHook(() => useStockSelection(), { wrapper })

        act(() => result.current.setExchange('LSE'))

        await waitFor(() => expect(result.current.stockOptions).toBe(lseStocks))
    })

    it('clears the selected stock when the symbol is not on the new exchange', async () => {
        const { result } = renderHook(() => useStockSelection(), { wrapper })

        act(() => result.current.setExchange('HE'))

        await waitFor(() => expect(result.current.selectedStock).toBeNull())
    })

    it('selecting a stock also sets the symbol', () => {
        const { result } = renderHook(() => useStockSelection(), { wrapper })
        const msft = (usStocks as StockEntry[]).find(s => s.Code === 'MSFT')!

        act(() => result.current.setSelectedStock(msft))

        expect(result.current.symbol).toBe('MSFT')
        expect(result.current.selectedStock?.Code).toBe('MSFT')
    })

    it('clearing the selection keeps the previous symbol', () => {
        const { result } = renderHook(() => useStockSelection(), { wrapper })

        act(() => result.current.setSelectedStock(null))

        expect(result.current.symbol).toBe('AAPL')
    })

    it('updates the API key', () => {
        const { result } = renderHook(() => useStockSelection(), { wrapper })

        act(() => result.current.setApiKey('my-key'))

        expect(result.current.apiKey).toBe('my-key')
    })

    it('throws a clear error when used outside the provider', () => {
        vi.spyOn(console, 'error').mockImplementation(() => {})

        expect(() => renderHook(() => useStockSelection())).toThrow(
            /useStockSelection must be used within a StockSelectionProvider/
        )
    })
})
