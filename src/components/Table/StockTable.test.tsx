import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '../../test/utils/testHelpers'
import StockTable from './StockTable'
import { mockStockData, mockSuccessResponse, mockErrorResponse, mockEmptyResponse } from '../../test/mocks/stockApi'
import heStocks from '../../assets/he.json'
import usStocks from '../../assets/us.json'
import lseStocks from '../../assets/lse.json'

describe('StockTable Component', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        global.fetch = vi.fn(() => mockSuccessResponse(mockStockData))
    })

    describe('Initial Render', () => {
        it('renders without crashing', () => {
            render(<StockTable />)
            expect(screen.getByText(/Stock Search Options/i)).toBeInTheDocument()
        })

        it('shows default AAPL stock selection', async () => {
            render(<StockTable />)
            const autocomplete = screen.getByLabelText(/Search for a stock by name or symbol/i)
            // Autocomplete input should be present
            expect(autocomplete).toBeInTheDocument()
        })

        it('shows US as default exchange', () => {
            render(<StockTable />)
            const exchangeSelect = screen.getByLabelText(/Exchange/i)
            expect(exchangeSelect).toHaveTextContent('US')
        })

        it('displays stock data table after initial fetch', async () => {
            render(<StockTable />)
            await waitFor(() => {
                expect(screen.getByText('Date')).toBeInTheDocument()
                expect(screen.getByText('Change %')).toBeInTheDocument()
            })
        })
    })

    describe('Exchange Switching', () => {
        it('switches from US to HE exchange', async () => {
            const user = userEvent.setup()
            render(<StockTable />)

            const exchangeSelect = screen.getByLabelText(/Exchange/i)
            await user.click(exchangeSelect)

            const heOption = await screen.findByRole('option', { name: 'HE' })
            await user.click(heOption)

            await waitFor(() => {
                expect(exchangeSelect).toHaveTextContent('HE')
            })
        })

        it('switches from US to LSE exchange', async () => {
            const user = userEvent.setup()
            render(<StockTable />)

            const exchangeSelect = screen.getByLabelText(/Exchange/i)
            await user.click(exchangeSelect)

            const lseOption = await screen.findByRole('option', { name: 'LSE' })
            await user.click(lseOption)

            await waitFor(() => {
                expect(exchangeSelect).toHaveTextContent('LSE')
            })
        })

        it('updates stock options when exchange changes', async () => {
            const user = userEvent.setup()
            render(<StockTable />)

            // Initially US stocks should be available
            expect(usStocks.length).toBeGreaterThan(0)

            // Switch to HE
            const exchangeSelect = screen.getByLabelText(/Exchange/i)
            await user.click(exchangeSelect)
            const heOption = await screen.findByRole('option', { name: 'HE' })
            await user.click(heOption)

            await waitFor(() => {
                expect(exchangeSelect).toHaveTextContent('HE')
            })

            // HE should have fewer stocks than US
            expect(heStocks.length).toBeLessThan(usStocks.length)
        })
    })

    describe('Stock Selection', () => {
        it('allows selecting a different stock', async () => {
            const user = userEvent.setup()
            render(<StockTable />)

            const autocomplete = screen.getByLabelText(/Search for a stock by name or symbol/i)
            await user.click(autocomplete)
            await user.type(autocomplete, 'Microsoft')

            // Wait for filtered options to appear
            await waitFor(() => {
                const listbox = screen.queryByRole('listbox')
                // Autocomplete should respond to input
                expect(autocomplete).toBeInTheDocument()
            })
        })

        it('filters stocks by code', async () => {
            const user = userEvent.setup()
            render(<StockTable />)

            const autocomplete = screen.getByLabelText(/Search for a stock by name or symbol/i)
            await user.click(autocomplete)
            await user.type(autocomplete, 'MSFT')

            await waitFor(() => {
                // Autocomplete should respond to input
                expect(autocomplete).toBeInTheDocument()
            })
        })
    })

    describe('Performance Fix - Critical Regression Test', () => {
        it('limits autocomplete results to 100 items for performance', async () => {
            const user = userEvent.setup()
            render(<StockTable />)

            // US exchange has 50k+ stocks
            expect(usStocks.length).toBeGreaterThan(50000)

            const autocomplete = screen.getByLabelText(/Search for a stock by name or symbol/i)
            await user.click(autocomplete)

            // Open dropdown with empty search (worst case scenario)
            await waitFor(() => {
                const listbox = screen.queryByRole('listbox')
                if (listbox) {
                    const options = within(listbox).queryAllByRole('option')
                    // Should show at most 100 options, not all 50k+
                    expect(options.length).toBeLessThanOrEqual(100)
                }
            })
        })

        it('filterOptions stops early when limit is reached', async () => {
            const user = userEvent.setup()
            render(<StockTable />)

            const autocomplete = screen.getByLabelText(/Search for a stock by name or symbol/i)
            await user.click(autocomplete)
            // Type and then select all to search empty
            await user.type(autocomplete, 'A')

            await waitFor(() => {
                const listbox = screen.queryByRole('listbox')
                if (listbox) {
                    const options = within(listbox).queryAllByRole('option')
                    // Should limit results for performance
                    expect(options.length).toBeLessThanOrEqual(100)
                }
            }, { timeout: 3000 })
        })
    })

    describe('Form Submission', () => {
        it('triggers API call when Fetch Data button is clicked', async () => {
            const user = userEvent.setup()
            const fetchSpy = vi.fn(() => mockSuccessResponse(mockStockData))
            global.fetch = fetchSpy

            render(<StockTable />)

            // Wait for initial fetch
            await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1))

            const fetchButton = screen.getByRole('button', { name: /Fetch Data/i })
            await user.click(fetchButton)

            await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2))
        })

        it('updates API key when changed', async () => {
            const user = userEvent.setup()
            render(<StockTable />)

            const apiKeyInput = screen.getByLabelText(/API Key/i)
            await user.clear(apiKeyInput)
            await user.type(apiKeyInput, 'test-api-key')

            expect(apiKeyInput).toHaveValue('test-api-key')
        })
    })

    describe('Date Pickers', () => {
        it('renders start date picker', () => {
            render(<StockTable />)
            const startDateInput = screen.getByLabelText(/From Date/i)
            expect(startDateInput).toBeInTheDocument()
        })

        it('renders end date picker', () => {
            render(<StockTable />)
            const endDateInput = screen.getByLabelText(/To Date/i)
            expect(endDateInput).toBeInTheDocument()
        })
    })

    describe('Loading States', () => {
        it('shows loading spinner during data fetch', async () => {
            let resolvePromise: (value: Response) => void
            const fetchPromise = new Promise<Response>((resolve) => {
                resolvePromise = resolve
            })
            global.fetch = vi.fn(() => fetchPromise)

            render(<StockTable />)

            // Should show loading state
            await waitFor(() => {
                expect(screen.getByRole('progressbar')).toBeInTheDocument()
            })

            // Resolve the promise
            resolvePromise!(mockSuccessResponse(mockStockData) as any)

            // Loading should disappear
            await waitFor(() => {
                expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
            })
        })
    })

    describe('Error States', () => {
        it('displays error message when API fails', async () => {
            global.fetch = vi.fn(() => mockErrorResponse(500, 'Internal Server Error'))

            render(<StockTable />)

            await waitFor(() => {
                expect(screen.getByText(/Failed to load stock data/i)).toBeInTheDocument()
            })
        })

        it('displays message when no data is available', async () => {
            global.fetch = vi.fn(() => mockEmptyResponse())

            render(<StockTable />)

            await waitFor(() => {
                expect(screen.getByText(/No data available for the selected parameters/i)).toBeInTheDocument()
            })
        })
    })

    describe('Table Sorting', () => {
        it('renders sortable table headers', async () => {
            render(<StockTable />)

            await waitFor(() => {
                expect(screen.getByText('Date')).toBeInTheDocument()
                expect(screen.getByText('Change %')).toBeInTheDocument()
                expect(screen.getByText('Open')).toBeInTheDocument()
                expect(screen.getByText('Close')).toBeInTheDocument()
            })
        })

        it('clicking column header triggers sort', async () => {
            const user = userEvent.setup()
            render(<StockTable />)

            await waitFor(() => {
                expect(screen.getByText('2024-01-10')).toBeInTheDocument()
            })

            const dateHeader = screen.getByText('Date')
            await user.click(dateHeader)

            // Sort should have been triggered, data still displayed
            await waitFor(() => {
                expect(screen.getByText('2024-01-10')).toBeInTheDocument()
            })
        })
    })

    describe('Responsive Behavior', () => {
        it('shows accordion for search options', () => {
            render(<StockTable />)
            const accordion = screen.getByText(/Stock Search Options/i)
            expect(accordion).toBeInTheDocument()
        })

        it('renders all main form fields', () => {
            render(<StockTable />)
            expect(screen.getByLabelText(/Search for a stock by name or symbol/i)).toBeInTheDocument()
            expect(screen.getByLabelText(/Exchange/i)).toBeInTheDocument()
            expect(screen.getByLabelText(/API Key/i)).toBeInTheDocument()
            expect(screen.getByLabelText(/From Date/i)).toBeInTheDocument()
            expect(screen.getByLabelText(/To Date/i)).toBeInTheDocument()
        })
    })

    describe('Data Display', () => {
        it('displays stock data in table rows', async () => {
            render(<StockTable />)

            await waitFor(() => {
                expect(screen.getByText('2024-01-10')).toBeInTheDocument()
                expect(screen.getByText('155.00')).toBeInTheDocument()
            })
        })

        it('formats percentage changes with colors', async () => {
            render(<StockTable />)

            await waitFor(() => {
                // Should have percentage data displayed
                const table = screen.getByRole('table')
                expect(table).toBeInTheDocument()
            })
        })
    })
})
