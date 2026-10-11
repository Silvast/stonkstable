import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeDataClient, okResult, errorResult } from '../test/mocks/amplify'

const generateClient = vi.hoisted(() => vi.fn())
vi.mock('aws-amplify/data', () => ({ generateClient }))

import { loadCloudApiKey, saveCloudApiKey } from './settingsCloud'

describe('settingsCloud', () => {
    let settings: ReturnType<typeof makeDataClient>['models']['UserSettings']

    beforeEach(() => {
        const client = makeDataClient()
        settings = client.models.UserSettings
        generateClient.mockReturnValue(client)
    })

    describe('loadCloudApiKey', () => {
        it('returns the saved key', async () => {
            settings.list.mockReturnValueOnce(okResult([{ id: 's1', eodhdApiKey: 'saved-key' }]))

            expect(await loadCloudApiKey()).toBe('saved-key')
        })

        it('returns null when nothing is saved', async () => {
            settings.list.mockReturnValueOnce(okResult([]))

            expect(await loadCloudApiKey()).toBeNull()
        })

        it('returns null when the saved key is empty', async () => {
            settings.list.mockReturnValueOnce(okResult([{ id: 's1', eodhdApiKey: null }]))

            expect(await loadCloudApiKey()).toBeNull()
        })

        it('throws when the response has errors', async () => {
            settings.list.mockReturnValueOnce(errorResult())

            await expect(loadCloudApiKey()).rejects.toThrow('Not Authorized')
        })
    })

    describe('saveCloudApiKey', () => {
        it('updates the existing settings row', async () => {
            settings.list.mockReturnValueOnce(okResult([{ id: 's1', eodhdApiKey: 'old' }]))
            settings.update.mockReturnValueOnce(okResult({ id: 's1', eodhdApiKey: 'new' }))

            await saveCloudApiKey('new')

            expect(settings.update).toHaveBeenCalledWith({ id: 's1', eodhdApiKey: 'new' })
            expect(settings.create).not.toHaveBeenCalled()
        })

        it('creates the settings row when there is none', async () => {
            settings.list.mockReturnValueOnce(okResult([]))
            settings.create.mockReturnValueOnce(okResult({ id: 's1', eodhdApiKey: 'new' }))

            await saveCloudApiKey('new')

            expect(settings.create).toHaveBeenCalledWith({ eodhdApiKey: 'new' })
        })

        it('throws when saving fails', async () => {
            settings.list.mockReturnValueOnce(okResult([{ id: 's1', eodhdApiKey: 'old' }]))
            settings.update.mockReturnValueOnce(errorResult())

            await expect(saveCloudApiKey('new')).rejects.toThrow('Not Authorized')
        })
    })
})
