import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { FavouritesProvider, useFavourites } from './FavouritesContext'
import { AuthProvider } from './AuthContext'
import { StockEntry } from './StockSelectionContext'
import { FAVOURITES_KEY, FavouriteStock, loadFavourites, saveFavourites } from '../utils/favouritesStorage'

const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider><FavouritesProvider>{children}</FavouritesProvider></AuthProvider>
)

const appleEntry: StockEntry = {
    Code: 'AAPL', Name: 'Apple Inc', Country: 'USA', Exchange: 'NASDAQ', Currency: 'USD', Type: 'Common Stock', Isin: null,
}
const nokia: FavouriteStock = { code: 'NOKIA', exchange: 'HE', name: 'Nokia Oyj', currency: 'EUR', addedAt: '2026-10-08T08:00:00.000Z' }

describe('FavouritesContext', () => {
    beforeEach(() => {
        localStorage.clear()
        vi.restoreAllMocks()
    })

    it('starts empty when nothing is stored', () => {
        const { result } = renderHook(() => useFavourites(), { wrapper })

        expect(result.current.favourites).toEqual([])
        expect(result.current.isFavourite('AAPL', 'US')).toBe(false)
    })

    it('starts from the favourites stored in localStorage', () => {
        saveFavourites([nokia])

        const { result } = renderHook(() => useFavourites(), { wrapper })

        expect(result.current.favourites).toEqual([nokia])
        expect(result.current.isFavourite('NOKIA', 'HE')).toBe(true)
        expect(result.current.isFavourite('NOKIA', 'US')).toBe(false)
    })

    it('toggle adds the stock under the selector exchange, then removes it', () => {
        const { result } = renderHook(() => useFavourites(), { wrapper })

        act(() => result.current.toggleFavourite(appleEntry, 'US'))
        expect(result.current.isFavourite('AAPL', 'US')).toBe(true)
        expect(result.current.favourites).toEqual([
            expect.objectContaining({ code: 'AAPL', exchange: 'US', name: 'Apple Inc', currency: 'USD' }),
        ])

        act(() => result.current.toggleFavourite(appleEntry, 'US'))
        expect(result.current.isFavourite('AAPL', 'US')).toBe(false)
        expect(result.current.favourites).toEqual([])
    })

    it('keeps insertion order', () => {
        const { result } = renderHook(() => useFavourites(), { wrapper })

        act(() => result.current.addFavourite(nokia))
        act(() => result.current.toggleFavourite(appleEntry, 'US'))

        expect(result.current.favourites.map(f => f.code)).toEqual(['NOKIA', 'AAPL'])
    })

    it('does not add the same stock twice', () => {
        const { result } = renderHook(() => useFavourites(), { wrapper })

        act(() => result.current.addFavourite(nokia))
        act(() => result.current.addFavourite({ ...nokia, addedAt: '2026-10-10T00:00:00.000Z' }))

        expect(result.current.favourites).toEqual([nokia])
    })

    it('persists changes to localStorage', () => {
        const { result } = renderHook(() => useFavourites(), { wrapper })

        act(() => result.current.addFavourite(nokia))
        expect(loadFavourites()).toEqual([nokia])

        act(() => result.current.removeFavourite('NOKIA', 'HE'))
        expect(loadFavourites()).toEqual([])
    })

    it('does not write to localStorage on mount', () => {
        const setItem = vi.spyOn(Storage.prototype, 'setItem')

        renderHook(() => useFavourites(), { wrapper })

        expect(setItem).not.toHaveBeenCalled()
    })

    it('restoreFavourite keeps the original addedAt', () => {
        const { result } = renderHook(() => useFavourites(), { wrapper })
        act(() => result.current.addFavourite(nokia))
        act(() => result.current.removeFavourite('NOKIA', 'HE'))

        act(() => result.current.restoreFavourite(nokia))

        expect(result.current.favourites).toEqual([nokia])
    })

    it('reloads when another tab changes the favourites', () => {
        const { result } = renderHook(() => useFavourites(), { wrapper })

        act(() => {
            saveFavourites([nokia])
            window.dispatchEvent(new StorageEvent('storage', { key: FAVOURITES_KEY }))
        })

        expect(result.current.favourites).toEqual([nokia])
    })

    it('ignores storage events for other keys', () => {
        const { result } = renderHook(() => useFavourites(), { wrapper })

        act(() => {
            saveFavourites([nokia])
            window.dispatchEvent(new StorageEvent('storage', { key: 'stonkstable:analysis:v1:AAPL.US:2026-10-10' }))
        })

        expect(result.current.favourites).toEqual([])
    })

    it('throws a clear error when used outside the provider', () => {
        vi.spyOn(console, 'error').mockImplementation(() => {})

        expect(() => renderHook(() => useFavourites())).toThrow(
            /useFavourites must be used within a FavouritesProvider/
        )
    })
})
