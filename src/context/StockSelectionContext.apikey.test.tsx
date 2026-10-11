import React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import type { AuthStatus } from './AuthContext'

const authState = vi.hoisted(() => ({
    initial: 'signedOut' as AuthStatus,
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
    loadCloudApiKey: vi.fn(),
    saveCloudApiKey: vi.fn(),
}))
vi.mock('../utils/settingsCloud', () => cloud)

import { AuthProvider } from './AuthContext'
import { StockSelectionProvider, useStockSelection } from './StockSelectionContext'
import { API_KEY_STORAGE_KEY, loadDeviceApiKey, saveDeviceApiKey } from '../utils/apiKeyStorage'

const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider><StockSelectionProvider>{children}</StockSelectionProvider></AuthProvider>
)

const renderSelection = () => renderHook(() => useStockSelection(), { wrapper })

describe('StockSelectionContext API key', () => {
    beforeEach(() => {
        localStorage.clear()
        vi.clearAllMocks()
        authState.initial = 'signedOut'
        cloud.loadCloudApiKey.mockResolvedValue(null)
        cloud.saveCloudApiKey.mockResolvedValue(undefined)
    })

    afterEach(() => {
        window.history.replaceState({}, '', '/')
        vi.useRealTimers()
    })

    describe('on this device', () => {
        it('starts with the key remembered on this device', () => {
            saveDeviceApiKey('device-key')

            const { result } = renderSelection()

            expect(result.current.apiKey).toBe('device-key')
            expect(result.current.rememberOnDevice).toBe(true)
        })

        it('starts with the ?apikey= link over a remembered key', () => {
            saveDeviceApiKey('device-key')
            window.history.replaceState({}, '', '/?apikey=link-key')

            const { result } = renderSelection()

            expect(result.current.apiKey).toBe('link-key')
        })

        it('does not remember keys unless asked', () => {
            const { result } = renderSelection()

            act(() => result.current.setApiKey('typed-key'))

            expect(result.current.rememberOnDevice).toBe(false)
            expect(loadDeviceApiKey()).toBeNull()
        })

        it('remembers the current key when asked, and later edits too', () => {
            const { result } = renderSelection()
            act(() => result.current.setApiKey('typed-key'))

            act(() => result.current.setRememberOnDevice(true))
            expect(loadDeviceApiKey()).toBe('typed-key')

            act(() => result.current.setApiKey('edited-key'))
            expect(loadDeviceApiKey()).toBe('edited-key')
        })

        it('forgets the key when clearing the field or turning remembering off', () => {
            saveDeviceApiKey('device-key')
            const { result } = renderSelection()

            act(() => result.current.setApiKey(''))
            expect(localStorage.getItem(API_KEY_STORAGE_KEY)).toBeNull()

            act(() => result.current.setApiKey('new-key'))
            act(() => result.current.setRememberOnDevice(false))
            expect(localStorage.getItem(API_KEY_STORAGE_KEY)).toBeNull()
            expect(result.current.apiKey).toBe('new-key')
        })

        it('never calls the account while signed out', () => {
            const { result } = renderSelection()

            act(() => result.current.setApiKey('typed-key'))

            expect(cloud.loadCloudApiKey).not.toHaveBeenCalled()
            expect(cloud.saveCloudApiKey).not.toHaveBeenCalled()
        })
    })

    describe('in the account', () => {
        beforeEach(() => {
            authState.initial = 'signedIn'
        })

        it('loads the key from the account when there is no other key', async () => {
            cloud.loadCloudApiKey.mockResolvedValue('account-key')

            const { result } = renderSelection()

            await waitFor(() => expect(result.current.apiKey).toBe('account-key'))
            expect(cloud.saveCloudApiKey).not.toHaveBeenCalled()
        })

        it.each([
            ['the ?apikey= link', () => window.history.replaceState({}, '', '/?apikey=link-key'), 'link-key'],
            ['a key remembered on this device', () => saveDeviceApiKey('device-key'), 'device-key'],
        ])('keeps %s over the account key', async (_label, setUp, expected) => {
            setUp()
            cloud.loadCloudApiKey.mockResolvedValue('account-key')

            const { result } = renderSelection()

            await act(async () => {})
            expect(result.current.apiKey).toBe(expected)
        })

        it('keeps a key typed while the account key was loading', async () => {
            let finish: (key: string) => void = () => {}
            cloud.loadCloudApiKey.mockReturnValue(new Promise(resolve => { finish = resolve }))
            const { result } = renderSelection()

            act(() => result.current.setApiKey('typed-key'))
            await act(async () => finish('account-key'))

            expect(result.current.apiKey).toBe('typed-key')
        })

        it('saves typed keys to the account once typing pauses', async () => {
            vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
            const { result } = renderSelection()
            await act(async () => {})

            act(() => result.current.setApiKey('a'))
            act(() => result.current.setApiKey('ab'))
            await act(async () => { await vi.advanceTimersByTimeAsync(500) })
            expect(cloud.saveCloudApiKey).not.toHaveBeenCalled()

            await act(async () => { await vi.advanceTimersByTimeAsync(500) })
            expect(cloud.saveCloudApiKey).toHaveBeenCalledTimes(1)
            expect(cloud.saveCloudApiKey).toHaveBeenCalledWith('ab')
        })

        it('reports when saving to the account fails', async () => {
            vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
            cloud.saveCloudApiKey.mockRejectedValue(new Error('Network error'))
            const { result } = renderSelection()
            await act(async () => {})

            act(() => result.current.setApiKey('typed-key'))
            await act(async () => { await vi.advanceTimersByTimeAsync(1000) })

            expect(result.current.apiKeySaveError).toBe("Couldn't save the key to your account")

            act(() => result.current.setApiKey('typed-key-2'))
            expect(result.current.apiKeySaveError).toBeNull()
        })

        it('clears a key that came from the account on sign-out', async () => {
            cloud.loadCloudApiKey.mockResolvedValue('account-key')
            const { result } = renderSelection()
            await waitFor(() => expect(result.current.apiKey).toBe('account-key'))

            act(() => authState.setStatus('signedOut'))

            expect(result.current.apiKey).toBe('')
        })

        it('keeps a key typed on this device after sign-out', async () => {
            const { result } = renderSelection()
            await act(async () => {})
            act(() => result.current.setApiKey('typed-key'))

            act(() => authState.setStatus('signedOut'))

            expect(result.current.apiKey).toBe('typed-key')
        })
    })
})
