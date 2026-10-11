import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { act, screen } from '@testing-library/react'
import type { AuthStatus } from '../../context/AuthContext'

const authState = vi.hoisted(() => ({ status: 'signedOut' as AuthStatus, openSignIn: vi.fn() }))
vi.mock('../../context/AuthContext', async () => {
    const { createElement, Fragment } = await import('react')
    return {
        AuthProvider: ({ children }: { children: React.ReactNode }) => createElement(Fragment, null, children),
        useAuth: () => ({ status: authState.status, email: 'ansku@example.com', openSignIn: authState.openSignIn }),
    }
})

vi.mock('../../utils/settingsCloud', () => ({ loadCloudApiKey: vi.fn().mockResolvedValue(null), saveCloudApiKey: vi.fn() }))
vi.mock('../../utils/favouritesCloud', () => ({
    listCloudFavourites: vi.fn().mockResolvedValue([]),
    createCloudFavourite: vi.fn(),
    deleteCloudFavourites: vi.fn(),
}))

import { render } from '../../test/utils/testHelpers'
import Sidebar, { Page } from './Sidebar'
import { recordApiCalls } from '../../utils/apiUsage'

const renderSidebar = (page: Page = 'stock-table', onNavigate = vi.fn()) => {
    render(<Sidebar currentPage={page} onNavigate={onNavigate} />)
    return onNavigate
}

describe('Sidebar account card', () => {
    beforeEach(() => {
        localStorage.clear()
        vi.clearAllMocks()
        authState.status = 'signedOut'
    })

    it('shows today\'s API calls and keeps the count up to date', () => {
        recordApiCalls(6)
        renderSidebar()

        expect(screen.getByText('API calls today')).toBeInTheDocument()
        expect(screen.getByText('6 / 20')).toBeInTheDocument()

        act(() => recordApiCalls(1))

        expect(screen.getByText('7 / 20')).toBeInTheDocument()
    })

    it.each<AuthStatus>(['signedOut', 'disabled'])('opens the API key dialog when %s', async (status) => {
        const user = userEvent.setup()
        authState.status = status
        renderSidebar()

        await user.click(screen.getByRole('button', { name: 'API key settings' }))

        expect(await screen.findByRole('dialog', { name: 'EODHD API key' })).toBeInTheDocument()
    })

    it('offers sign-in only when signed out', async () => {
        const user = userEvent.setup()
        renderSidebar()

        await user.click(screen.getByRole('button', { name: 'Sign in to sync' }))

        expect(authState.openSignIn).toHaveBeenCalled()
    })

    it('links the signed-in user to Settings', async () => {
        const user = userEvent.setup()
        authState.status = 'signedIn'
        const onNavigate = renderSidebar()

        expect(screen.queryByRole('button', { name: 'API key settings' })).not.toBeInTheDocument()
        expect(screen.queryByRole('button', { name: 'Sign in to sync' })).not.toBeInTheDocument()
        await user.click(screen.getByRole('button', { name: /ansku@example\.com/ }))

        expect(onNavigate).toHaveBeenCalledWith('settings')
    })

    it('marks the Settings link as current on the Settings page', () => {
        authState.status = 'signedIn'
        renderSidebar('settings')

        expect(screen.getByRole('button', { name: /ansku@example\.com/ })).toHaveAttribute('aria-current', 'page')
        expect(screen.queryByRole('heading', { name: 'Watchlist' })).not.toBeInTheDocument()
    })
})
