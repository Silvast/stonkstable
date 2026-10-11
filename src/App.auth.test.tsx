import { describe, it, expect, beforeEach, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { act, render, screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react'
import { mockStockData, mockSuccessResponse } from './test/mocks/stockApi'

vi.mock('./utils/amplify', () => ({ cloudEnabled: true, configureAmplify: vi.fn() }))

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
            listen: (_channel: string, callback: (data: { payload: { event: string } }) => void) => {
                listeners.push(callback)
                return () => listeners.splice(listeners.indexOf(callback), 1)
            },
        },
    }
})
vi.mock('aws-amplify/utils', () => ({ Hub: hub.Hub }))

vi.mock('./utils/favouritesCloud', () => ({
    listCloudFavourites: vi.fn().mockResolvedValue([]),
    createCloudFavourite: vi.fn(),
    deleteCloudFavourites: vi.fn(),
}))

vi.mock('./components/Account/AuthenticatorPanel', () => ({
    default: () => <div>Amplify Authenticator</div>,
}))

import App from './App'

const emit = (event: string) => act(() => hub.listeners.forEach(listener => listener({ payload: { event } })))
const signedInAs = (email: string) => {
    auth.getCurrentUser.mockResolvedValue({ userId: 'u1', username: 'u1' })
    auth.fetchUserAttributes.mockResolvedValue({ email })
}

describe('App sign-in', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        hub.listeners.length = 0
        localStorage.clear()
        vi.stubGlobal('fetch', vi.fn(() => mockSuccessResponse(mockStockData)))
        auth.getCurrentUser.mockRejectedValue(new Error('UserUnAuthenticatedException'))
        auth.fetchUserAttributes.mockResolvedValue({})
        auth.signOut.mockResolvedValue(undefined)
    })

    it('shows nothing in the account slot while the session is loading', () => {
        auth.getCurrentUser.mockReturnValue(new Promise(() => {}))
        render(<App />)

        expect(screen.queryByRole('button', { name: 'Sign in' })).not.toBeInTheDocument()
    })

    it('shows a Sign in button when signed out that opens the sign-in dialog', async () => {
        const user = userEvent.setup()
        render(<App />)

        await user.click(await screen.findByRole('button', { name: 'Sign in' }))

        const dialog = await screen.findByRole('dialog', { name: 'Sign in to Stonkstable' })
        expect(await screen.findByText('Amplify Authenticator')).toBeInTheDocument()
        expect(dialog).toBeInTheDocument()
    })

    it('closes the sign-in dialog with its close button', async () => {
        const user = userEvent.setup()
        render(<App />)
        await user.click(await screen.findByRole('button', { name: 'Sign in' }))
        await screen.findByRole('dialog')

        await user.click(screen.getByRole('button', { name: 'Close' }))

        await waitForElementToBeRemoved(() => screen.queryByRole('dialog'))
    })

    it('closes the dialog and shows the email after signing in', async () => {
        const user = userEvent.setup()
        render(<App />)
        await user.click(await screen.findByRole('button', { name: 'Sign in' }))
        await screen.findByRole('dialog')

        signedInAs('ansku@example.com')
        emit('signedIn')

        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
        expect(await screen.findByRole('button', { name: /ansku@example\.com/ })).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: 'Sign in' })).not.toBeInTheDocument()
    })

    it('signs out from the account menu', async () => {
        const user = userEvent.setup()
        signedInAs('ansku@example.com')
        render(<App />)

        await user.click(await screen.findByRole('button', { name: /ansku@example\.com/ }))
        await user.click(await screen.findByRole('menuitem', { name: 'Sign out' }))

        expect(auth.signOut).toHaveBeenCalled()
    })
})
