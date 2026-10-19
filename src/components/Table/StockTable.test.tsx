import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import dayjs from 'dayjs'
import { render, chooseExchange, exchangeButton } from '../../test/utils/testHelpers'
import StockTable from './StockTable'
import { mockStockData, mockSuccessResponse, mockErrorResponse, mockEmptyResponse } from '../../test/mocks/stockApi'
import { pricesToCsv } from '../../utils/priceStats'
import usStocks from '../../assets/us.json'

const getStockInput = () => screen.getByRole('combobox', { name: /Stock Symbol/i })
const dataRows = () => within(screen.getByRole('table', { name: /Daily prices/ })).getAllByRole('row').slice(1)

const readBlob = (blob: Blob) => new Promise<string>(resolve => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.readAsText(blob)
})

const waitForData = () => screen.findByRole('heading', { level: 2, name: 'Daily prices' })

describe('StockTable Component', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        localStorage.clear()
        vi.stubGlobal('fetch', vi.fn(() => mockSuccessResponse(mockStockData)))
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    describe('Toolbar', () => {
        it('shows the stock search with AAPL selected and US as the exchange', () => {
            render(<StockTable />)

            expect(getStockInput()).toHaveValue('Apple Inc (AAPL)')
            expect(exchangeButton('US')).toHaveAttribute('aria-pressed', 'true')
            expect(exchangeButton('HE')).toHaveAttribute('aria-pressed', 'false')
            expect(screen.getByRole('button', { name: 'Fetch' })).toBeInTheDocument()
        })

        it('no longer shows the API key or an accordion', () => {
            render(<StockTable />)

            expect(screen.queryByLabelText(/API Key/i)).not.toBeInTheDocument()
            expect(screen.queryByText(/Stock Search Options/i)).not.toBeInTheDocument()
        })

        it('switches exchange with the segmented control', async () => {
            const user = userEvent.setup()
            render(<StockTable />)

            await chooseExchange(user, 'LSE')

            expect(exchangeButton('LSE')).toHaveAttribute('aria-pressed', 'true')
            expect(exchangeButton('US')).toHaveAttribute('aria-pressed', 'false')
        })

        it('shows the date range on a button that opens the date pickers', async () => {
            const user = userEvent.setup()
            render(<StockTable />)
            const start = dayjs().subtract(6, 'week')
            const end = dayjs().subtract(1, 'day')
            const label = `${start.format(start.year() === end.year() ? 'D MMM' : 'D MMM YYYY')} – ${end.format('D MMM YYYY')}`

            await user.click(screen.getByRole('button', { name: `Date range ${label}` }))

            expect(await screen.findByLabelText(/From Date/i)).toBeInTheDocument()
            expect(screen.getByLabelText(/To Date/i)).toBeInTheDocument()
        })

        it('defaults the from-date to six weeks before today', async () => {
            const fetchSpy = vi.fn((_url: string) => mockSuccessResponse(mockStockData))
            vi.stubGlobal('fetch', fetchSpy)
            render(<StockTable />)
            await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1))

            const expectedFrom = dayjs().subtract(6, 'week').format('YYYY-MM-DD')
            const expectedTo = dayjs().subtract(1, 'day').format('YYYY-MM-DD')
            const calledUrl = fetchSpy.mock.calls[0][0] as string
            expect(calledUrl).toContain(`from=${expectedFrom}`)
            expect(calledUrl).toContain(`to=${expectedTo}`)

            // sanity check: the from-date must be more than 14 days back
            const daysBetween = dayjs(expectedTo).diff(dayjs(expectedFrom), 'day')
            expect(daysBetween).toBeGreaterThan(14)
        })

        it('fetches once on load and again when Fetch is pressed', async () => {
            const user = userEvent.setup()
            const fetchSpy = vi.fn(() => mockSuccessResponse(mockStockData))
            vi.stubGlobal('fetch', fetchSpy)
            render(<StockTable />)
            await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1))

            await user.click(screen.getByRole('button', { name: 'Fetch' }))

            await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2))
        })

        it('fetches the chosen stock on the chosen exchange', async () => {
            const user = userEvent.setup()
            const fetchSpy = vi.fn((_url: string) => mockSuccessResponse(mockStockData))
            vi.stubGlobal('fetch', fetchSpy)
            render(<StockTable />)
            await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1))

            await chooseExchange(user, 'HE')
            await user.type(getStockInput(), 'NOKIA')
            await user.click(await screen.findByRole('option', { name: /Nokia Oyj \(NOKIA\)/i }))
            await user.click(screen.getByRole('button', { name: 'Fetch' }))

            await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2))
            expect(fetchSpy.mock.calls[1][0]).toContain('/api/eodhd/eod/NOKIA.HE?')
        })
    })

    describe('Performance Fix - Critical Regression Test', () => {
        it('limits autocomplete results to 100 items for performance', async () => {
            const user = userEvent.setup()
            render(<StockTable />)

            expect(usStocks.length).toBeGreaterThan(50000)

            await user.clear(getStockInput())
            await user.click(getStockInput())

            const listbox = await screen.findByRole('listbox')
            expect(within(listbox).getAllByRole('option')).toHaveLength(100)
        })
    })

    describe('Stock header', () => {
        it('shows the fetched stock with its code, currency, last close and change', async () => {
            render(<StockTable />)

            expect(await screen.findByRole('heading', { level: 1, name: 'Apple Inc' })).toBeInTheDocument()
            expect(screen.getByText('AAPL.US')).toBeInTheDocument()
            expect(screen.getByText('USD')).toBeInTheDocument()
            expect(screen.getAllByText('155.00')[0]).toBeInTheDocument()
            expect(screen.getByText('+5.00 · +3.33%')).toBeInTheDocument()
            expect(screen.getByText('Wed 10 Jan close')).toBeInTheDocument()
        })

        it('keeps showing the fetched stock until the new one is fetched', async () => {
            const user = userEvent.setup()
            render(<StockTable />)
            await screen.findByRole('heading', { level: 1, name: 'Apple Inc' })

            await chooseExchange(user, 'HE')
            await user.type(getStockInput(), 'NOKIA')
            await user.click(await screen.findByRole('option', { name: /Nokia Oyj \(NOKIA\)/i }))

            expect(screen.getByRole('heading', { level: 1, name: 'Apple Inc' })).toBeInTheDocument()
        })

        it('stars the fetched stock from the header', async () => {
            const user = userEvent.setup()
            render(<StockTable />)
            await screen.findByRole('heading', { level: 1, name: 'Apple Inc' })
            const header = screen.getByRole('region', { name: 'Apple Inc' })

            await user.click(within(header).getByRole('button', { name: 'Add AAPL to favourites' }))

            expect(within(header).getByRole('button', { name: 'Remove AAPL from favourites' })).toHaveAttribute('aria-pressed', 'true')
        })
    })

    describe('KPI tiles', () => {
        it('summarises the fetched rows', async () => {
            render(<StockTable />)
            await waitForData()

            const tile = (label: string) => screen.getByText(label).parentElement!
            expect(tile('Period change')).toHaveTextContent('+3.33%')
            expect(tile('42-day high')).toHaveTextContent('156.00')
            expect(tile('42-day low')).toHaveTextContent('143.00')
            expect(tile('Avg. volume')).toHaveTextContent('1M')
            expect(tile('Up days')).toHaveTextContent('2 / 5')
        })
    })

    describe('Chart', () => {
        it('draws the close and volume chart with a description', async () => {
            render(<StockTable />)
            await waitForData()

            expect(screen.getByRole('heading', { name: 'Close and volume' })).toBeInTheDocument()
            expect(screen.getByRole('img', { name: 'Closing price from 150.00 to 155.00 over 5 trading days, with daily volume bars' })).toBeInTheDocument()
        })
    })

    describe('Layout', () => {
        it('shows the daily prices table above the chart', async () => {
            render(<StockTable />)
            await waitForData()

            const table = screen.getByRole('heading', { name: 'Daily prices' })
            const chart = screen.getByRole('heading', { name: 'Close and volume' })
            expect(table.compareDocumentPosition(chart) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
        })
    })

    describe('Full-screen table', () => {
        const openFullScreen = async (user: ReturnType<typeof userEvent.setup>) => {
            await user.click(screen.getByRole('button', { name: 'Open table in full screen' }))
            return screen.findByRole('dialog', { name: 'Daily prices for AAPL.US' })
        }

        it('opens the table in a full-screen view with every row and the CSV button', async () => {
            const user = userEvent.setup()
            render(<StockTable />)
            await waitForData()

            const dialog = await openFullScreen(user)

            const rows = within(within(dialog).getByRole('table')).getAllByRole('row').slice(1)
            expect(rows).toHaveLength(5)
            expect(within(dialog).getByRole('button', { name: 'CSV' })).toBeInTheDocument()
            expect(within(dialog).queryByRole('button', { name: 'Open table in full screen' })).not.toBeInTheDocument()
        })

        it('closes back to the page', async () => {
            const user = userEvent.setup()
            render(<StockTable />)
            await waitForData()
            const dialog = await openFullScreen(user)

            await user.click(within(dialog).getByRole('button', { name: 'Close full screen' }))

            await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
            expect(screen.getByRole('button', { name: 'Open table in full screen' })).toBeInTheDocument()
        })

        it('shows every column in full screen even on a phone', async () => {
            const user = userEvent.setup()
            const matchMedia = window.matchMedia
            window.matchMedia = vi.fn().mockImplementation((query: string) => ({
                ...matchMedia(query),
                matches: query.includes('max-width:599.95px'),
            }))
            try {
                render(<StockTable />)
                await waitForData()
                const pageHeaders = within(screen.getByRole('table', { name: /Daily prices/ })).getAllByRole('columnheader')
                expect(pageHeaders).toHaveLength(5)

                const dialog = await openFullScreen(user)

                expect(within(within(dialog).getByRole('table')).getAllByRole('columnheader')).toHaveLength(8)
            } finally {
                window.matchMedia = matchMedia
            }
        })

        it('keeps the same sort order on the page and in full screen', async () => {
            const user = userEvent.setup()
            render(<StockTable />)
            await waitForData()

            await user.click(screen.getByRole('button', { name: /^Close/ }))
            const dialog = await openFullScreen(user)

            const closes = within(within(dialog).getByRole('table')).getAllByRole('row').slice(1)
                .map(row => within(row).getAllByRole('cell')[4].textContent)
            expect(closes).toEqual(['145.00', '148.00', '150.00', '150.00', '155.00'])
        })
    })

    describe('Daily prices table', () => {
        it('shows one row per day, newest first, with formatted dates and volumes', async () => {
            render(<StockTable />)
            await waitForData()

            const rows = dataRows()
            expect(rows).toHaveLength(5)
            expect(within(rows[0]).getByText('Wed 10 Jan 2024')).toBeInTheDocument()
            expect(within(rows[0]).getByText('1M')).toBeInTheDocument()
            expect(within(rows[1]).getByText('950K')).toBeInTheDocument()
        })

        it('has the redesigned column headers', async () => {
            render(<StockTable />)
            await waitForData()

            const headers = within(screen.getByRole('table', { name: /Daily prices/ })).getAllByRole('columnheader')
            expect(headers.map(header => header.textContent?.replace(/sorted (ascending|descending)/, '').trim())).toEqual([
                'Date', 'Change', 'Prev. day', 'Open', 'Close', 'High', 'Low', 'Volume',
            ])
        })

        it('sorts by a column when its header is clicked', async () => {
            const user = userEvent.setup()
            render(<StockTable />)
            await waitForData()

            await user.click(screen.getByRole('button', { name: /^Close/ }))

            const closes = dataRows().map(row => within(row).getAllByRole('cell')[4].textContent)
            expect(closes).toEqual(['145.00', '148.00', '150.00', '150.00', '155.00'])
        })

        it('downloads the rows as CSV', async () => {
            const user = userEvent.setup()
            const createObjectURL = vi.fn((_blob: Blob) => 'blob:prices')
            const revokeObjectURL = vi.fn()
            vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL }))
            const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
            render(<StockTable />)
            await waitForData()

            await user.click(screen.getByRole('button', { name: 'CSV' }))

            expect(click).toHaveBeenCalled()
            const anchor = click.mock.contexts[0] as HTMLAnchorElement
            expect(anchor.download).toBe('AAPL.US-prices.csv')
            expect(await readBlob(createObjectURL.mock.calls[0][0])).toBe(pricesToCsv(mockStockData))
            expect(revokeObjectURL).toHaveBeenCalledWith('blob:prices')
        })

        it('shows the data source caption', async () => {
            render(<StockTable />)
            await waitForData()

            expect(screen.getByText('End-of-day data from EODHD. Not investment advice.')).toBeInTheDocument()
        })
    })

    describe('Loading and errors', () => {
        it('shows a loading indicator during the fetch', async () => {
            let resolveFetch: (value: Response) => void = () => {}
            vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(resolve => { resolveFetch = resolve })))
            render(<StockTable />)

            expect(await screen.findByRole('progressbar')).toBeInTheDocument()

            resolveFetch(await mockSuccessResponse(mockStockData))
            await waitFor(() => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument())
        })

        it('shows the error when the API fails', async () => {
            vi.spyOn(console, 'error').mockImplementation(() => {})
            vi.stubGlobal('fetch', vi.fn(() => mockErrorResponse(500, 'Internal Server Error')))
            render(<StockTable />)

            expect(await screen.findByText(/Failed to load stock data/i)).toBeInTheDocument()
            expect(screen.queryByRole('heading', { name: 'Daily prices' })).not.toBeInTheDocument()
        })

        it('says when there is no data', async () => {
            vi.stubGlobal('fetch', vi.fn(() => mockEmptyResponse()))
            render(<StockTable />)

            expect(await screen.findByText(/No data available for the selected parameters/i)).toBeInTheDocument()
        })
    })

    it('does not nest buttons inside buttons', async () => {
        render(<StockTable />)
        await waitForData()

        expect(document.querySelectorAll('button button')).toHaveLength(0)
    })
})
