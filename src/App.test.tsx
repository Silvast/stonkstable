import { describe, it, expect, beforeEach, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen, waitFor } from './test/utils/testHelpers'
import App from './App'
import { mockStockData, mockSuccessResponse } from './test/mocks/stockApi'

describe('App Component', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.stubGlobal('fetch', vi.fn(() => mockSuccessResponse(mockStockData)))
    })

    it('renders navigation buttons at the top', () => {
        render(<App />)
        expect(screen.getByRole('button', { name: /Stock Table/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /Analysis/i })).toBeInTheDocument()
    })

    it('renders title and subtitle', () => {
        render(<App />)
        expect(screen.getByRole('heading', { name: /Stonksei taulukkona/i })).toBeInTheDocument()
        expect(screen.getByText(/Viimeisen 20 päivän osakekurssit/i)).toBeInTheDocument()
    })

    it('defaults to Stock Table page', async () => {
        render(<App />)

        await waitFor(() => {
            expect(screen.getByText(/Stock Search Options/i)).toBeInTheDocument()
        })

        const stockTableButton = screen.getByRole('button', { name: /Stock Table/i })
        expect(stockTableButton).toHaveAttribute('aria-current', 'page')
    })

    it('navigates to Analysis page and back', async () => {
        const user = userEvent.setup()
        render(<App />)

        // Stock table visible by default
        await waitFor(() => {
            expect(screen.getByText(/Stock Search Options/i)).toBeInTheDocument()
        })

        const analysisButton = screen.getByRole('button', { name: /Analysis/i })
        await user.click(analysisButton)

        expect(analysisButton).toHaveAttribute('aria-current', 'page')
        expect(screen.getByText(/Content coming soon\./i)).toBeInTheDocument()
        expect(screen.queryByText(/Stock Search Options/i)).not.toBeInTheDocument()

        // Buttons remain visible on Analysis page
        expect(screen.getByRole('button', { name: /Stock Table/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /Analysis/i })).toBeInTheDocument()

        const stockTableButton = screen.getByRole('button', { name: /Stock Table/i })
        await user.click(stockTableButton)

        expect(stockTableButton).toHaveAttribute('aria-current', 'page')
        await waitFor(() => {
            expect(screen.getByText(/Stock Search Options/i)).toBeInTheDocument()
        })
    })
})

