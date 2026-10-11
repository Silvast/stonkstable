import React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import type { AuthStatus } from './AuthContext'

const authState = vi.hoisted(() => ({
    initial: 'signedIn' as AuthStatus,
    setStatus: (_status: AuthStatus) => {},
}))
vi.mock('./AuthContext', async () => {
    const { createContext, createElement, useContext, useState } = await import('react')
    const StatusContext = createContext<AuthStatus>('signedOut')
    return {
        AuthProvider: ({ children }: { children: React.ReactNode }) => {
            const [status, setStatus] = useState<AuthStatus>(authState.initial)
            authState.setStatus = setStatus
            return createElement(StatusContext.Provider, { value: status }, children)
        },
        useAuth: () => ({ status: useContext(StatusContext) }),
    }
})

const cloud = vi.hoisted(() => ({
    listCloudFavourites: vi.fn(),
    createCloudFavourite: vi.fn(),
    deleteCloudFavourites: vi.fn(),
}))
vi.mock('../utils/favouritesCloud', () => cloud)

import { AuthProvider } from './AuthContext'
import { FavouritesProvider, useFavourites } from './FavouritesContext'
import { FAVOURITES_KEY, FavouriteStock, loadFavourites, saveFavourites } from '../utils/favouritesStorage'
import { StockEntry } from './StockSelectionContext'

const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider><FavouritesProvider>{children}</FavouritesProvider></AuthProvider>
)

const apple: FavouriteStock = { code: 'AAPL', exchange: 'US', name: 'Apple Inc', currency: 'USD', addedAt: '2026-10-10T08:00:00.000Z' }
const nokia: FavouriteStock = { code: 'NOKIA', exchange: 'HE', name: 'Nokia Oyj', currency: 'EUR', addedAt: '2026-10-08T08:00:00.000Z' }
const amd: FavouriteStock = { code: 'AMD', exchange: 'US', name: 'Advanced Micro Devices Inc', currency: 'USD', addedAt: '2026-10-02T08:00:00.000Z' }
const appleEntry: StockEntry = { Code: 'AAPL', Name: 'Apple Inc', Country: 'USA', Exchange: 'NASDAQ', Currency: 'USD', Type: 'Common Stock', Isin: null }

const inCloud = (fav: FavouriteStock, id: string) => ({ ...fav, id })

const deferred = <T,>() => {
    let resolve: (value: T) => void = () => {}
    const promise = new Promise<T>(r => { resolve = r })
    return { promise, resolve }
}

const renderSignedIn = async () => {
    const hook = renderHook(() => useFavourites(), { wrapper })
    await waitFor(() => expect(hook.result.current.syncing).toBe(false))
    return hook
}

describe('FavouritesContext signed in', () => {
    beforeEach(() => {
        localStorage.clear()
        vi.clearAllMocks()
        authState.initial = 'signedIn'
        cloud.listCloudFavourites.mockResolvedValue([])
        cloud.createCloudFavourite.mockImplementation(async (fav: FavouriteStock) => inCloud(fav, `new-${fav.code}`))
        cloud.deleteCloudFavourites.mockResolvedValue(undefined)
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('loads favourites from the account, oldest first, without row ids', async () => {
        cloud.listCloudFavourites.mockResolvedValue([inCloud(apple, 'r1'), inCloud(nokia, 'r2')])

        const { result } = await renderSignedIn()

        expect(result.current.favourites).toEqual([nokia, apple])
        expect(result.current.isFavourite('NOKIA', 'HE')).toBe(true)
        expect(result.current.syncError).toBeNull()
    })

    it('shows syncing while the first load is in flight', async () => {
        const load = deferred<unknown[]>()
        cloud.listCloudFavourites.mockReturnValue(load.promise)

        const { result } = renderHook(() => useFavourites(), { wrapper })

        await waitFor(() => expect(result.current.syncing).toBe(true))
        await act(async () => load.resolve([inCloud(apple, 'r1')]))
        expect(result.current.syncing).toBe(false)
        expect(result.current.favourites).toEqual([apple])
    })

    it('shows each stock once when the account has duplicate rows', async () => {
        cloud.listCloudFavourites.mockResolvedValue([inCloud(apple, 'r1'), inCloud(apple, 'r2')])

        const { result } = await renderSignedIn()

        expect(result.current.favourites).toEqual([apple])
    })

    it('adds to the account instead of localStorage', async () => {
        const { result } = await renderSignedIn()

        await act(async () => result.current.toggleFavourite(appleEntry, 'US'))

        expect(cloud.createCloudFavourite).toHaveBeenCalledWith(expect.objectContaining({ code: 'AAPL', exchange: 'US' }))
        expect(result.current.isFavourite('AAPL', 'US')).toBe(true)
        expect(localStorage.getItem(FAVOURITES_KEY)).toBeNull()
    })

    it('removes every account row for that stock', async () => {
        cloud.listCloudFavourites.mockResolvedValue([inCloud(apple, 'r1'), inCloud(apple, 'r2'), inCloud(nokia, 'r3')])
        const { result } = await renderSignedIn()

        await act(async () => result.current.removeFavourite('AAPL', 'US'))

        expect(cloud.deleteCloudFavourites).toHaveBeenCalledWith(['r1', 'r2'])
        expect(result.current.favourites).toEqual([nokia])
    })

    it('rolls back and reports an error when adding fails', async () => {
        cloud.createCloudFavourite.mockRejectedValue(new Error('Network error'))
        const { result } = await renderSignedIn()

        await act(async () => result.current.addFavourite(apple))

        expect(result.current.favourites).toEqual([])
        expect(result.current.syncError).toBe("Couldn't save to your account, try again")

        act(() => result.current.clearSyncError())
        expect(result.current.syncError).toBeNull()
    })

    it('rolls back and reports an error when removing fails', async () => {
        cloud.listCloudFavourites.mockResolvedValue([inCloud(apple, 'r1')])
        cloud.deleteCloudFavourites.mockRejectedValue(new Error('Network error'))
        const { result } = await renderSignedIn()

        await act(async () => result.current.removeFavourite('AAPL', 'US'))

        expect(result.current.favourites).toEqual([apple])
        expect(result.current.syncError).toBe("Couldn't save to your account, try again")
    })

    it('deletes a favourite that is removed while it is still being saved', async () => {
        const save = deferred<FavouriteStock & { id: string }>()
        cloud.createCloudFavourite.mockReturnValue(save.promise)
        const { result } = await renderSignedIn()

        act(() => result.current.addFavourite(apple))
        act(() => result.current.removeFavourite('AAPL', 'US'))
        await act(async () => save.resolve(inCloud(apple, 'r9')))

        await waitFor(() => expect(cloud.deleteCloudFavourites).toHaveBeenCalledWith(['r9']))
        expect(result.current.favourites).toEqual([])
    })

    it('undo restores to the account with the original added date', async () => {
        cloud.listCloudFavourites.mockResolvedValue([inCloud(nokia, 'r1')])
        const { result } = await renderSignedIn()

        await act(async () => result.current.removeFavourite('NOKIA', 'HE'))
        await act(async () => result.current.restoreFavourite(nokia))

        expect(cloud.createCloudFavourite).toHaveBeenCalledWith(nokia)
        expect(result.current.favourites).toEqual([nokia])
    })

    it('reports an error and keeps showing the local list when the account cannot be loaded', async () => {
        saveFavourites([apple])
        cloud.listCloudFavourites.mockRejectedValue(new Error('Network error'))

        const { result } = await renderSignedIn()

        expect(result.current.favourites).toEqual([apple])
        expect(result.current.syncError).toBe("Couldn't load favourites from your account")
        expect(loadFavourites()).toEqual([apple])
    })

    describe('first sign-in on a device', () => {
        it('uploads favourites only starred in this browser, then clears the local copy', async () => {
            saveFavourites([apple, amd])
            cloud.listCloudFavourites.mockResolvedValue([inCloud(nokia, 'r1'), inCloud(amd, 'r2')])

            const { result } = await renderSignedIn()

            expect(cloud.createCloudFavourite).toHaveBeenCalledTimes(1)
            expect(cloud.createCloudFavourite).toHaveBeenCalledWith(apple)
            expect(result.current.favourites).toEqual([amd, nokia, apple])
            expect(localStorage.getItem(FAVOURITES_KEY)).toBeNull()
        })

        it('keeps the local copy and reports an error when an upload fails', async () => {
            saveFavourites([apple, amd])
            cloud.createCloudFavourite.mockImplementation(async (fav: FavouriteStock) => {
                if (fav.code === 'AMD') throw new Error('Network error')
                return inCloud(fav, 'r-apple')
            })

            const { result } = await renderSignedIn()

            expect(result.current.favourites).toEqual([apple])
            expect(loadFavourites()).toEqual([apple, amd])
            expect(result.current.syncError).toBe("Couldn't save to your account, try again")
        })
    })

    it('switches back to this browser\'s list on sign-out', async () => {
        cloud.listCloudFavourites.mockResolvedValue([inCloud(apple, 'r1')])
        const { result } = await renderSignedIn()
        saveFavourites([nokia])

        act(() => authState.setStatus('signedOut'))

        expect(result.current.favourites).toEqual([nokia])
    })

    it('saves to localStorage again after signing out', async () => {
        const { result } = await renderSignedIn()
        act(() => authState.setStatus('signedOut'))

        act(() => result.current.addFavourite(nokia))

        expect(loadFavourites()).toEqual([nokia])
        expect(cloud.createCloudFavourite).not.toHaveBeenCalled()
    })

    it('ignores storage events from other tabs while signed in', async () => {
        const { result } = await renderSignedIn()

        act(() => {
            saveFavourites([nokia])
            window.dispatchEvent(new StorageEvent('storage', { key: FAVOURITES_KEY }))
        })

        expect(result.current.favourites).toEqual([])
    })

    it('reloads from the account on focus, at most once every 30 seconds', async () => {
        let now = 1_000_000
        vi.spyOn(Date, 'now').mockImplementation(() => now)
        const { result } = await renderSignedIn()
        expect(cloud.listCloudFavourites).toHaveBeenCalledTimes(1)

        now += 10_000
        act(() => { window.dispatchEvent(new Event('focus')) })
        expect(cloud.listCloudFavourites).toHaveBeenCalledTimes(1)

        cloud.listCloudFavourites.mockResolvedValue([inCloud(nokia, 'r1')])
        now += 25_000
        await act(async () => { window.dispatchEvent(new Event('focus')) })

        expect(cloud.listCloudFavourites).toHaveBeenCalledTimes(2)
        expect(result.current.favourites).toEqual([nokia])
    })

    it('does not reload on focus while signed out', async () => {
        authState.initial = 'signedOut'
        renderHook(() => useFavourites(), { wrapper })

        await act(async () => { window.dispatchEvent(new Event('focus')) })

        expect(cloud.listCloudFavourites).not.toHaveBeenCalled()
    })
})
