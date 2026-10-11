import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

const amplifyState = vi.hoisted(() => ({ cloudEnabled: true }))
vi.mock('../utils/amplify', () => ({
    get cloudEnabled() { return amplifyState.cloudEnabled },
}))

const auth = vi.hoisted(() => ({
    getCurrentUser: vi.fn(),
    fetchUserAttributes: vi.fn(),
    signOut: vi.fn(),
}))
vi.mock('aws-amplify/auth', () => auth)

const hub = vi.hoisted(() => {
    const listeners: ((data: { payload: { event: string } }) => void)[] = []
    return {
        listeners,
        Hub: {
            listen: vi.fn((_channel: string, callback: (data: { payload: { event: string } }) => void) => {
                listeners.push(callback)
                return () => listeners.splice(listeners.indexOf(callback), 1)
            }),
        },
    }
})
vi.mock('aws-amplify/utils', () => ({ Hub: hub.Hub }))

import { AuthProvider, useAuth } from './AuthContext'

const wrapper = ({ children }: { children: React.ReactNode }) => <AuthProvider>{children}</AuthProvider>

const emit = (event: string) => act(() => hub.listeners.forEach(listener => listener({ payload: { event } })))

describe('AuthContext', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        hub.listeners.length = 0
        amplifyState.cloudEnabled = true
        auth.getCurrentUser.mockRejectedValue(new Error('UserUnAuthenticatedException'))
        auth.fetchUserAttributes.mockResolvedValue({ email: 'ansku@example.com' })
        auth.signOut.mockResolvedValue(undefined)
    })

    it('is disabled without Amplify config and never calls Cognito', () => {
        amplifyState.cloudEnabled = false

        const { result } = renderHook(() => useAuth(), { wrapper })

        expect(result.current.status).toBe('disabled')
        expect(auth.getCurrentUser).not.toHaveBeenCalled()
        expect(hub.Hub.listen).not.toHaveBeenCalled()
    })

    it('starts loading, then is signed out when there is no current user', async () => {
        const { result } = renderHook(() => useAuth(), { wrapper })

        expect(result.current.status).toBe('loading')
        await waitFor(() => expect(result.current.status).toBe('signedOut'))
        expect(result.current.email).toBeUndefined()
    })

    it('is signed in with the email when a user is already signed in', async () => {
        auth.getCurrentUser.mockResolvedValue({ userId: 'u1', username: 'u1' })

        const { result } = renderHook(() => useAuth(), { wrapper })

        await waitFor(() => expect(result.current.status).toBe('signedIn'))
        expect(result.current.email).toBe('ansku@example.com')
    })

    it('switches to signed in on the Hub signedIn event', async () => {
        const { result } = renderHook(() => useAuth(), { wrapper })
        await waitFor(() => expect(result.current.status).toBe('signedOut'))

        auth.getCurrentUser.mockResolvedValue({ userId: 'u1', username: 'u1' })
        emit('signedIn')

        await waitFor(() => expect(result.current.status).toBe('signedIn'))
        expect(result.current.email).toBe('ansku@example.com')
    })

    it.each(['signedOut', 'tokenRefresh_failure'])('switches to signed out on the Hub %s event', async (event) => {
        auth.getCurrentUser.mockResolvedValue({ userId: 'u1', username: 'u1' })
        const { result } = renderHook(() => useAuth(), { wrapper })
        await waitFor(() => expect(result.current.status).toBe('signedIn'))

        emit(event)

        expect(result.current.status).toBe('signedOut')
        expect(result.current.email).toBeUndefined()
    })

    it('stops listening to Hub on unmount', async () => {
        const { unmount } = renderHook(() => useAuth(), { wrapper })

        unmount()

        expect(hub.listeners).toHaveLength(0)
    })

    it('signOut signs out of Cognito', async () => {
        const { result } = renderHook(() => useAuth(), { wrapper })

        await act(() => result.current.signOut())

        expect(auth.signOut).toHaveBeenCalled()
    })

    it('opens and closes the sign-in dialog, and closes it on sign-in', async () => {
        const { result } = renderHook(() => useAuth(), { wrapper })
        await waitFor(() => expect(result.current.status).toBe('signedOut'))
        expect(result.current.signInOpen).toBe(false)

        act(() => result.current.openSignIn())
        expect(result.current.signInOpen).toBe(true)

        act(() => result.current.closeSignIn())
        expect(result.current.signInOpen).toBe(false)

        act(() => result.current.openSignIn())
        auth.getCurrentUser.mockResolvedValue({ userId: 'u1', username: 'u1' })
        emit('signedIn')
        expect(result.current.signInOpen).toBe(false)
    })

    it('throws a clear error when used outside the provider', () => {
        vi.spyOn(console, 'error').mockImplementation(() => {})

        expect(() => renderHook(() => useAuth())).toThrow(/useAuth must be used within an AuthProvider/)
    })
})
