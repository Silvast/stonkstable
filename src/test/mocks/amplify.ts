import { vi } from 'vitest'

export const okResult = <T>(data: T, nextToken: string | null = null) =>
    Promise.resolve({ data, errors: undefined, nextToken })

export const errorResult = (message = 'Not Authorized') =>
    Promise.resolve({ data: null, errors: [{ message }], nextToken: null })

export const makeModel = () => ({
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
})

export const makeDataClient = () => ({
    models: {
        Favourite: makeModel(),
        UserSettings: makeModel(),
    },
})
