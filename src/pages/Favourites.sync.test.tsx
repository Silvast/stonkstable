import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { act, screen, waitFor } from '@testing-library/react'
import type { AuthStatus } from '../context/AuthContext'

const authState = vi.hoisted(() => ({
    initial: 'signedOut' as AuthStatus,
    openSignIn: vi.fn(),
}))
vi.mock('../context/AuthContext', async () => {
    const { createContext, createElement, useContext, useState } = await import('react')
    const StatusContext = createContext<AuthStatus>('signedOut')
    return {
        AuthProvider: ({ children }: { children: React.ReactNode }) => {
            const [status] = useState<AuthStatus>(authState.initial)
            return createElement(StatusContext.Provider, { value: status }, children)
        },
        useAuth: () => ({ status: useContext(StatusContext), openSignIn: authState.openSignIn }),
    }
})

const cloud = vi.hoisted(() => ({
    listCloudFavourites: vi.fn(),
    createCloudFavourite: vi.fn(),
    deleteCloudFavourites: vi.fn(),
}))
vi.mock('../utils/favouritesCloud', () => cloud)

import { render } from '../test/utils/testHelpers'
import Favourites from './Favourites'

describe('Favourites page and account sync', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        localStorage.clear()
        authState.initial = 'signedOut'
        cloud.listCloudFavourites.mockResolvedValue([])
    })

    it('invites signed-out users to sign in', async () => {
        const user = userEvent.setup()
        render(<Favourites onOpen={vi.fn()} />)

        expect(screen.getByText(/to keep your favourites on all your devices/)).toBeInTheDocument()
        await user.click(screen.getByRole('button', { name: 'Sign in' }))

        expect(authState.openSignIn).toHaveBeenCalled()
    })

    it.each<AuthStatus>(['disabled', 'loading', 'signedIn'])('does not show the sign-in hint when %s', (status) => {
        authState.initial = status
        render(<Favourites onOpen={vi.fn()} />)

        expect(screen.queryByText(/to keep your favourites on all your devices/)).not.toBeInTheDocument()
    })

    it('says where favourites are saved', async () => {
        render(<Favourites onOpen={vi.fn()} />)
        expect(screen.getByText('0 stocks · saved in this browser')).toBeInTheDocument()
    })

    it('says favourites are saved to the account when signed in', async () => {
        authState.initial = 'signedIn'
        render(<Favourites onOpen={vi.fn()} />)

        expect(await screen.findByText('0 stocks · saved to your account')).toBeInTheDocument()
    })

    it('shows progress while the account favourites load', async () => {
        authState.initial = 'signedIn'
        let finish: (value: unknown[]) => void = () => {}
        cloud.listCloudFavourites.mockReturnValue(new Promise(resolve => { finish = resolve }))
        render(<Favourites onOpen={vi.fn()} />)

        expect(await screen.findByRole('progressbar', { name: 'Syncing favourites' })).toBeInTheDocument()

        await act(async () => finish([]))
        expect(screen.queryByRole('progressbar', { name: 'Syncing favourites' })).not.toBeInTheDocument()
    })

    it('shows sync errors in a dismissible snackbar', async () => {
        const user = userEvent.setup()
        authState.initial = 'signedIn'
        cloud.listCloudFavourites.mockRejectedValue(new Error('Network error'))
        render(<Favourites onOpen={vi.fn()} />)

        expect(await screen.findByText("Couldn't load favourites from your account")).toBeInTheDocument()

        await user.click(screen.getByRole('button', { name: 'Dismiss' }))

        await waitFor(() => expect(screen.queryByText("Couldn't load favourites from your account")).not.toBeInTheDocument())
    })
})
