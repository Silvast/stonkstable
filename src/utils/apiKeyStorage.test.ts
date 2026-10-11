import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { API_KEY_STORAGE_KEY, clearDeviceApiKey, loadDeviceApiKey, saveDeviceApiKey } from './apiKeyStorage'

describe('apiKeyStorage', () => {
    beforeEach(() => {
        localStorage.clear()
        vi.spyOn(console, 'warn').mockImplementation(() => {})
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('returns null when no key is remembered', () => {
        expect(loadDeviceApiKey()).toBeNull()
    })

    it('remembers a key under the stonkstable api key entry', () => {
        saveDeviceApiKey('my-key')

        expect(localStorage.getItem('stonkstable:apikey:v1')).toBe('my-key')
        expect(API_KEY_STORAGE_KEY).toBe('stonkstable:apikey:v1')
        expect(loadDeviceApiKey()).toBe('my-key')
    })

    it('forgets the key', () => {
        saveDeviceApiKey('my-key')

        clearDeviceApiKey()

        expect(loadDeviceApiKey()).toBeNull()
    })

    it('treats an empty stored value as no key', () => {
        localStorage.setItem(API_KEY_STORAGE_KEY, '')

        expect(loadDeviceApiKey()).toBeNull()
    })

    it('returns null when localStorage cannot be read', () => {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('SecurityError')
        })

        expect(loadDeviceApiKey()).toBeNull()
    })

    it('does not throw when localStorage cannot be written or cleared', () => {
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('QuotaExceededError')
        })
        vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
            throw new Error('SecurityError')
        })

        expect(() => saveDeviceApiKey('my-key')).not.toThrow()
        expect(() => clearDeviceApiKey()).not.toThrow()
    })
})
