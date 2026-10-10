import { describe, it, expect, beforeEach, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen, fireEvent } from '../../test/utils/testHelpers'
import FavouriteToggle from './FavouriteToggle'
import { StockEntry } from '../../context/StockSelectionContext'
import { loadFavourites } from '../../utils/favouritesStorage'

const apple: StockEntry = {
    Code: 'AAPL', Name: 'Apple Inc', Country: 'USA', Exchange: 'NASDAQ', Currency: 'USD', Type: 'Common Stock', Isin: null,
}

describe('FavouriteToggle', () => {
    beforeEach(() => {
        localStorage.clear()
    })

    it('flips its label and pressed state when clicked', async () => {
        const user = userEvent.setup()
        render(<FavouriteToggle stock={apple} exchange="US" />)

        const button = screen.getByRole('button', { name: 'Add AAPL to favourites' })
        expect(button).toHaveAttribute('aria-pressed', 'false')

        await user.click(button)

        const pressed = screen.getByRole('button', { name: 'Remove AAPL from favourites' })
        expect(pressed).toHaveAttribute('aria-pressed', 'true')
        expect(loadFavourites()).toEqual([expect.objectContaining({ code: 'AAPL', exchange: 'US' })])

        await user.click(pressed)

        expect(screen.getByRole('button', { name: 'Add AAPL to favourites' })).toHaveAttribute('aria-pressed', 'false')
        expect(loadFavourites()).toEqual([])
    })

    it('is disabled when no stock is selected', () => {
        render(<FavouriteToggle stock={null} exchange="US" />)

        expect(screen.getByRole('button', { name: 'Add to favourites' })).toBeDisabled()
    })

    it('stops click, mouse down and focus from reaching the parent when asked to', async () => {
        const user = userEvent.setup()
        const onClick = vi.fn()
        const onMouseDown = vi.fn()
        const onFocus = vi.fn()
        render(
            <div onClick={onClick} onMouseDown={onMouseDown} onFocus={onFocus}>
                <FavouriteToggle stock={apple} exchange="US" stopPropagation />
            </div>
        )

        const button = screen.getByRole('button', { name: 'Add AAPL to favourites' })
        await user.click(button)
        fireEvent.focus(button)

        expect(onClick).not.toHaveBeenCalled()
        expect(onMouseDown).not.toHaveBeenCalled()
        expect(onFocus).not.toHaveBeenCalled()
        expect(screen.getByRole('button', { name: 'Remove AAPL from favourites' })).toBeInTheDocument()
    })

    it('lets clicks reach the parent by default', async () => {
        const user = userEvent.setup()
        const onClick = vi.fn()
        render(
            <div onClick={onClick}>
                <FavouriteToggle stock={apple} exchange="US" />
            </div>
        )

        await user.click(screen.getByRole('button', { name: 'Add AAPL to favourites' }))

        expect(onClick).toHaveBeenCalled()
    })
})
