import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeDataClient, okResult, errorResult } from '../test/mocks/amplify'

const generateClient = vi.hoisted(() => vi.fn())
vi.mock('aws-amplify/data', () => ({ generateClient }))

import { listCloudFavourites, createCloudFavourite, deleteCloudFavourites } from './favouritesCloud'
import { FavouriteStock } from './favouritesStorage'

const row = (id: string, code: string | null, exchange: string | null, extra: Record<string, unknown> = {}) => ({
    id,
    code,
    exchange,
    name: `${code} name`,
    currency: 'USD',
    addedAt: '2026-10-10T08:00:00.000Z',
    createdAt: '2026-10-10T08:00:01.000Z',
    ...extra,
})

const nokia: FavouriteStock = { code: 'NOKIA', exchange: 'HE', name: 'Nokia Oyj', currency: 'EUR', addedAt: '2026-10-08T08:00:00.000Z' }

describe('favouritesCloud', () => {
    let client: ReturnType<typeof makeDataClient>
    let favourites: ReturnType<typeof makeDataClient>['models']['Favourite']

    beforeEach(() => {
        client = makeDataClient()
        favourites = client.models.Favourite
        generateClient.mockReturnValue(client)
    })

    describe('listCloudFavourites', () => {
        it('follows nextToken until every page is read', async () => {
            favourites.list
                .mockReturnValueOnce(okResult([row('1', 'AAPL', 'US')], 'page-2'))
                .mockReturnValueOnce(okResult([row('2', 'NOKIA', 'HE')]))

            const result = await listCloudFavourites()

            expect(result.map(fav => fav.id)).toEqual(['1', '2'])
            expect(favourites.list).toHaveBeenNthCalledWith(1, { nextToken: undefined })
            expect(favourites.list).toHaveBeenNthCalledWith(2, { nextToken: 'page-2' })
        })

        it('maps rows to favourites with their row id', async () => {
            favourites.list.mockReturnValueOnce(okResult([row('1', 'AAPL', 'US', { name: 'Apple Inc' })]))

            expect(await listCloudFavourites()).toEqual([
                { id: '1', code: 'AAPL', exchange: 'US', name: 'Apple Inc', currency: 'USD', addedAt: '2026-10-10T08:00:00.000Z' },
            ])
        })

        it('falls back to empty strings and createdAt for missing optional fields', async () => {
            favourites.list.mockReturnValueOnce(okResult([row('1', 'AAPL', 'US', { name: null, currency: null, addedAt: null })]))

            expect(await listCloudFavourites()).toEqual([
                { id: '1', code: 'AAPL', exchange: 'US', name: '', currency: '', addedAt: '2026-10-10T08:00:01.000Z' },
            ])
        })

        it('drops rows without a code or with an unknown exchange', async () => {
            favourites.list.mockReturnValueOnce(okResult([
                row('1', 'AAPL', 'US'),
                row('2', null, 'US'),
                row('3', '', 'US'),
                row('4', 'X', null),
                row('5', 'Y', 'NASDAQ'),
                null,
            ]))

            expect((await listCloudFavourites()).map(fav => fav.id)).toEqual(['1'])
        })

        it('throws when the response has errors', async () => {
            favourites.list.mockReturnValueOnce(errorResult())

            await expect(listCloudFavourites()).rejects.toThrow('Not Authorized')
        })
    })

    describe('createCloudFavourite', () => {
        it('creates a row and returns it with its id', async () => {
            favourites.create.mockReturnValueOnce(okResult(row('new', 'NOKIA', 'HE', { name: 'Nokia Oyj', currency: 'EUR', addedAt: nokia.addedAt })))

            const created = await createCloudFavourite(nokia)

            expect(favourites.create).toHaveBeenCalledWith(nokia)
            expect(created).toEqual({ id: 'new', ...nokia })
        })

        it('throws when the response has errors', async () => {
            favourites.create.mockReturnValueOnce(errorResult('Conditional request failed'))

            await expect(createCloudFavourite(nokia)).rejects.toThrow('Conditional request failed')
        })

        it('throws when no row comes back', async () => {
            favourites.create.mockReturnValueOnce(okResult(null))

            await expect(createCloudFavourite(nokia)).rejects.toThrow()
        })
    })

    describe('deleteCloudFavourites', () => {
        it('deletes every given row', async () => {
            favourites.delete.mockImplementation(({ id }: { id: string }) => okResult({ id }))

            await deleteCloudFavourites(['a', 'b'])

            expect(favourites.delete).toHaveBeenCalledWith({ id: 'a' })
            expect(favourites.delete).toHaveBeenCalledWith({ id: 'b' })
        })

        it('throws when any delete fails', async () => {
            favourites.delete
                .mockReturnValueOnce(okResult({ id: 'a' }))
                .mockReturnValueOnce(errorResult())

            await expect(deleteCloudFavourites(['a', 'b'])).rejects.toThrow('Not Authorized')
        })
    })
})
