import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { screen } from '@testing-library/react'
import type { AuthStatus } from '../../context/AuthContext'

vi.mock('../../context/AuthContext', async () => {
    const { createElement, Fragment } = await import('react')
    return {
        AuthProvider: ({ children }: { children: React.ReactNode }) => createElement(Fragment, null, children),
        useAuth: () => ({ status: 'signedIn' as AuthStatus }),
    }
})

const settings = vi.hoisted(() => ({
    loadCloudApiKey: vi.fn(),
    saveCloudApiKey: vi.fn(),
}))
vi.mock('../../utils/settingsCloud', () => settings)

vi.mock('../../utils/favouritesCloud', () => ({
    listCloudFavourites: vi.fn().mockResolvedValue([]),
    createCloudFavourite: vi.fn(),
    deleteCloudFavourites: vi.fn(),
}))

import { render } from '../../test/utils/testHelpers'
import StockSelector from './StockSelector'

describe('StockSelector API key when signed in', () => {
    beforeEach(() => {
        localStorage.clear()
        vi.clearAllMocks()
        settings.loadCloudApiKey.mockResolvedValue(null)
        settings.saveCloudApiKey.mockResolvedValue(undefined)
    })

    it('says the key is saved to the account', () => {
        render(<StockSelector />)

        expect(screen.getByText('Saved to your account')).toBeInTheDocument()
    })

    it('shows an error when the key could not be saved to the account', async () => {
        const user = userEvent.setup()
        settings.saveCloudApiKey.mockRejectedValue(new Error('Network error'))
        render(<StockSelector />)

        await user.type(screen.getByLabelText(/API Key/i), 'k')

        expect(await screen.findByText("Couldn't save the key to your account", {}, { timeout: 3000 })).toBeInTheDocument()
        expect(screen.queryByText('Saved to your account')).not.toBeInTheDocument()
    })
})
