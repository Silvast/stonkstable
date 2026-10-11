import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen, waitFor } from '../../test/utils/testHelpers'
import AppShell from './AppShell'

const SIDEBAR_KEY = 'stonkstable:sidebar:v1'

const renderShell = () => render(
    <AppShell currentPage="stock-table" onNavigate={vi.fn()}>
        <p>Page content</p>
    </AppShell>
)

describe('AppShell sidebar', () => {
    beforeEach(() => {
        localStorage.clear()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('shows the sidebar with a Hide sidebar button by default', () => {
        renderShell()

        expect(screen.getByRole('complementary')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Hide sidebar' })).toHaveAttribute('aria-expanded', 'true')
        expect(screen.queryByRole('button', { name: 'Show sidebar' })).not.toBeInTheDocument()
        expect(screen.getByText('Page content')).toBeInTheDocument()
    })

    it('hides the sidebar and shows it again', async () => {
        const user = userEvent.setup()
        renderShell()

        await user.click(screen.getByRole('button', { name: 'Hide sidebar' }))

        expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
        expect(screen.queryByRole('navigation', { name: 'Sections' })).not.toBeInTheDocument()
        const show = screen.getByRole('button', { name: 'Show sidebar' })
        expect(show).toHaveAttribute('aria-expanded', 'false')
        expect(screen.getByText('Stonkstable')).toBeInTheDocument()
        expect(screen.getByText('Page content')).toBeInTheDocument()

        await user.click(show)

        expect(screen.getByRole('complementary')).toBeInTheDocument()
    })

    it('moves focus to the button that brings the sidebar back', async () => {
        const user = userEvent.setup()
        renderShell()

        await user.click(screen.getByRole('button', { name: 'Hide sidebar' }))
        await waitFor(() => expect(screen.getByRole('button', { name: 'Show sidebar' })).toHaveFocus())

        await user.click(screen.getByRole('button', { name: 'Show sidebar' }))
        await waitFor(() => expect(screen.getByRole('button', { name: 'Hide sidebar' })).toHaveFocus())
    })

    it('remembers the choice in this browser', async () => {
        const user = userEvent.setup()
        const first = renderShell()
        await user.click(screen.getByRole('button', { name: 'Hide sidebar' }))
        expect(localStorage.getItem(SIDEBAR_KEY)).toBe('hidden')
        first.unmount()

        renderShell()

        expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Show sidebar' })).toBeInTheDocument()
    })

    it('forgets the choice when the sidebar is shown again', async () => {
        const user = userEvent.setup()
        localStorage.setItem(SIDEBAR_KEY, 'hidden')
        renderShell()

        await user.click(screen.getByRole('button', { name: 'Show sidebar' }))

        expect(localStorage.getItem(SIDEBAR_KEY)).toBeNull()
    })

    it('still works when localStorage is blocked', async () => {
        const user = userEvent.setup()
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('SecurityError')
        })
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('SecurityError')
        })
        renderShell()

        await user.click(screen.getByRole('button', { name: 'Hide sidebar' }))

        expect(screen.getByRole('button', { name: 'Show sidebar' })).toBeInTheDocument()
    })

    it('keeps the drawer on narrow screens, without the hide button', async () => {
        const user = userEvent.setup()
        const matchMedia = window.matchMedia
        window.matchMedia = vi.fn().mockImplementation((query: string) => ({
            ...matchMedia(query),
            matches: query.includes('max-width:959.95px'),
        }))
        try {
            localStorage.setItem(SIDEBAR_KEY, 'hidden')
            renderShell()

            await user.click(screen.getByRole('button', { name: 'Open navigation' }))

            expect(await screen.findByRole('navigation', { name: 'Sections' })).toBeInTheDocument()
            expect(screen.queryByRole('button', { name: 'Hide sidebar' })).not.toBeInTheDocument()
        } finally {
            window.matchMedia = matchMedia
        }
    })
})
