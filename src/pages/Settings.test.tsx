import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { act, screen, waitFor, within } from '@testing-library/react'
import type { AuthStatus } from '../context/AuthContext'

const authState = vi.hoisted(() => ({
    initial: 'signedIn' as AuthStatus,
    setStatus: (_status: AuthStatus) => {},
    signOut: vi.fn(),
}))
vi.mock('../context/AuthContext', async () => {
    const { createContext, createElement, useContext, useState } = await import('react')
    const StatusContext = createContext<AuthStatus>('signedOut')
    return {
        AuthProvider: ({ children }: { children: React.ReactNode }) => {
            const [status, setStatus] = useState<AuthStatus>(authState.initial)
            authState.setStatus = setStatus
            return createElement(StatusContext.Provider, { value: status }, children)
        },
        useAuth: () => ({ status: useContext(StatusContext), email: 'ansku@example.com', signOut: authState.signOut }),
    }
})

const settings = vi.hoisted(() => ({ loadCloudApiKey: vi.fn(), saveCloudApiKey: vi.fn() }))
vi.mock('../utils/settingsCloud', () => settings)

const cloud = vi.hoisted(() => ({
    listCloudFavourites: vi.fn(),
    createCloudFavourite: vi.fn(),
    deleteCloudFavourites: vi.fn(),
}))
vi.mock('../utils/favouritesCloud', () => cloud)

import { render } from '../test/utils/testHelpers'
import Settings from './Settings'
import { useStockSelection } from '../context/StockSelectionContext'
import { saveDeviceApiKey } from '../utils/apiKeyStorage'
import { recordApiCalls } from '../utils/apiUsage'

const KeyProbe = () => {
    const { apiKey } = useStockSelection()
    return <output data-testid="key" data-key={apiKey} />
}

const keyPanel = () => screen.getByRole('region', { name: 'EODHD API key' })

const renderSettings = (onLeave = vi.fn()) => {
    render(<><Settings onLeave={onLeave} /><KeyProbe /></>)
    return onLeave
}

describe('Settings page', () => {
    beforeEach(() => {
        localStorage.clear()
        vi.clearAllMocks()
        authState.initial = 'signedIn'
        settings.loadCloudApiKey.mockResolvedValue(null)
        settings.saveCloudApiKey.mockResolvedValue(undefined)
        cloud.listCloudFavourites.mockResolvedValue([])
    })

    describe('EODHD API key', () => {
        it('shows a saved key only as dots', () => {
            saveDeviceApiKey('device-key')
            renderSettings()

            expect(screen.getByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument()
            expect(within(keyPanel()).getByText('Saved')).toBeInTheDocument()
            expect(within(keyPanel()).getByText('•••• •••• •••• ••••')).toBeInTheDocument()
            const page = screen.getByRole('heading', { level: 1, name: 'Settings' }).parentElement!
            expect(page.innerHTML).not.toContain('device-key')
        })

        it('replaces the key from a password field and saves it to the account', async () => {
            const user = userEvent.setup()
            saveDeviceApiKey('device-key')
            renderSettings()

            await user.click(within(keyPanel()).getByRole('button', { name: 'Replace key' }))
            const field = within(keyPanel()).getByLabelText('New API key')
            expect(field).toHaveAttribute('type', 'password')
            expect(field).toHaveValue('')
            await user.type(field, 'new-key')
            await user.click(within(keyPanel()).getByRole('button', { name: 'Save key' }))

            expect(screen.getByTestId('key')).toHaveAttribute('data-key', 'new-key')
            expect(within(keyPanel()).getByText('•••• •••• •••• ••••')).toBeInTheDocument()
            await waitFor(() => expect(settings.saveCloudApiKey).toHaveBeenCalledWith('new-key'), { timeout: 3000 })
        })

        it('keeps the old key on Cancel', async () => {
            const user = userEvent.setup()
            saveDeviceApiKey('device-key')
            renderSettings()

            await user.click(within(keyPanel()).getByRole('button', { name: 'Replace key' }))
            await user.type(within(keyPanel()).getByLabelText('New API key'), 'typo')
            await user.click(within(keyPanel()).getByRole('button', { name: 'Cancel' }))

            expect(screen.getByTestId('key')).toHaveAttribute('data-key', 'device-key')
            expect(within(keyPanel()).queryByLabelText('New API key')).not.toBeInTheDocument()
        })

        it('removes the key', async () => {
            const user = userEvent.setup()
            saveDeviceApiKey('device-key')
            renderSettings()

            await user.click(within(keyPanel()).getByRole('button', { name: 'Remove' }))

            expect(screen.getByTestId('key')).toHaveAttribute('data-key', '')
            expect(within(keyPanel()).getByText('Not set')).toBeInTheDocument()
            expect(within(keyPanel()).getByRole('button', { name: 'Add key' })).toBeInTheDocument()
        })

        it('explains how ?apikey= links behave', () => {
            renderSettings()

            expect(within(keyPanel()).getByText('Opening a link with ?apikey= still works and saves the key here, then removes it from the address bar.')).toBeInTheDocument()
        })
    })

    it('shows today\'s API usage out of about 20 calls', () => {
        recordApiCalls(6)
        renderSettings()

        const usage = screen.getByRole('region', { name: 'API usage' })
        expect(within(usage).getByText('6 of about 20 daily calls used')).toBeInTheDocument()
        expect(within(usage).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '30')
        expect(within(usage).getByText('A fresh analysis costs about 6 calls. A stock table fetch costs 1.')).toBeInTheDocument()
    })

    it('shows the account and signs out', async () => {
        const user = userEvent.setup()
        cloud.listCloudFavourites.mockResolvedValue([
            { id: 'r1', code: 'AAPL', exchange: 'US', name: 'Apple Inc', currency: 'USD', addedAt: '2026-10-01T00:00:00.000Z' },
            { id: 'r2', code: 'NOKIA', exchange: 'HE', name: 'Nokia Oyj', currency: 'EUR', addedAt: '2026-10-02T00:00:00.000Z' },
        ])
        renderSettings()

        const account = screen.getByRole('region', { name: 'Account' })
        expect(await within(account).findByText('ansku@example.com · 2 favourites synced')).toBeInTheDocument()

        await user.click(within(account).getByRole('button', { name: 'Sign out' }))

        expect(authState.signOut).toHaveBeenCalled()
    })

    it('leaves the page when the user is signed out', () => {
        const onLeave = renderSettings()

        act(() => authState.setStatus('signedOut'))

        expect(onLeave).toHaveBeenCalled()
    })
})
