import { StockData } from '../../utils/stockTable'

export const mockStockData: StockData[] = [
    {
        date: '2024-01-10',
        open: 150.00,
        close: 155.00,
        high: 156.00,
        low: 149.50,
        volume: 1000000
    },
    {
        date: '2024-01-09',
        open: 145.00,
        close: 150.00,
        high: 151.00,
        low: 144.00,
        volume: 950000
    },
    {
        date: '2024-01-08',
        open: 148.00,
        close: 145.00,
        high: 149.00,
        low: 143.00,
        volume: 1100000
    },
    {
        date: '2024-01-07',
        open: 150.00,
        close: 148.00,
        high: 152.00,
        low: 147.00,
        volume: 980000
    },
    {
        date: '2024-01-06',
        open: 152.00,
        close: 150.00,
        high: 153.00,
        low: 149.00,
        volume: 1050000
    }
]

export const mockEmptyData: StockData[] = []

export const mockSuccessResponse = (data: StockData[] = mockStockData) => {
    return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => data,
    } as Response)
}

export const mockErrorResponse = (status: number = 500, message: string = 'Internal Server Error') => {
    return Promise.resolve({
        ok: false,
        status,
        statusText: message,
        json: async () => ({ error: message }),
    } as Response)
}

export const mockEmptyResponse = () => {
    return mockSuccessResponse(mockEmptyData)
}

export const setupMockFetch = (mockImplementation: (...args: any[]) => Promise<Response>) => {
    global.fetch = vi.fn(mockImplementation)
}

export const resetMockFetch = () => {
    vi.clearAllMocks()
}
