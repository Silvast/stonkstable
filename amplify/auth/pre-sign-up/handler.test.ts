import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { Context, PreSignUpTriggerEvent } from 'aws-lambda'

const ssm = vi.hoisted(() => ({ send: vi.fn() }))
vi.mock('@aws-sdk/client-ssm', () => ({
    SSMClient: class {
        send = ssm.send
    },
    GetParameterCommand: class {
        constructor(public input: unknown) {}
    },
}))

const PARAMETER = '/stonkstable/allowed-signup-emails'
const REJECTED = 'Sign-up is by invitation only.'

const signUpEvent = (email: string | undefined, triggerSource = 'PreSignUp_SignUp'): PreSignUpTriggerEvent => ({
    version: '1',
    region: 'eu-north-1',
    userPoolId: 'pool',
    userName: 'user',
    callerContext: { awsSdkVersion: '3', clientId: 'client' },
    triggerSource,
    request: { userAttributes: email === undefined ? {} : { email } },
    response: { autoConfirmUser: false, autoVerifyEmail: false, autoVerifyPhone: false },
} as PreSignUpTriggerEvent)

const listReturns = (value: string) => ssm.send.mockResolvedValue({ Parameter: { Value: value } })

const loadHandler = async () => {
    vi.resetModules()
    const { handler } = await import('./handler')
    return (event: PreSignUpTriggerEvent) => handler(event, {} as Context, () => {})
}

describe('pre-sign-up allowlist', () => {
    beforeEach(() => {
        ssm.send.mockReset()
        vi.stubEnv('ALLOWED_EMAILS_PARAMETER', PARAMETER)
        vi.spyOn(console, 'error').mockImplementation(() => {})
    })

    afterEach(() => {
        vi.unstubAllEnvs()
        vi.restoreAllMocks()
    })

    it('allows an email on the list', async () => {
        listReturns('friend@example.com')
        const handler = await loadHandler()
        const event = signUpEvent('friend@example.com')

        await expect(handler(event)).resolves.toBe(event)
    })

    it('compares emails case-insensitively and ignores surrounding spaces', async () => {
        listReturns('  Friend@Example.com ')
        const handler = await loadHandler()
        const event = signUpEvent(' FRIEND@example.COM')

        await expect(handler(event)).resolves.toBe(event)
    })

    it('accepts a list separated by commas or new lines', async () => {
        listReturns('a@example.com, b@example.com\nc@example.com')
        const handler = await loadHandler()

        await expect(handler(signUpEvent('b@example.com'))).resolves.toBeDefined()
        await expect(handler(signUpEvent('c@example.com'))).resolves.toBeDefined()
    })

    it('rejects an email that is not on the list', async () => {
        listReturns('friend@example.com')
        const handler = await loadHandler()

        await expect(handler(signUpEvent('stranger@example.com'))).rejects.toThrow(REJECTED)
    })

    it('does not treat part of a listed address as a match', async () => {
        listReturns('friend@example.com')
        const handler = await loadHandler()

        await expect(handler(signUpEvent('friend@example.co'))).rejects.toThrow(REJECTED)
        await expect(handler(signUpEvent('example.com'))).rejects.toThrow(REJECTED)
    })

    it('rejects a sign-up without an email', async () => {
        listReturns('friend@example.com')
        const handler = await loadHandler()

        await expect(handler(signUpEvent(undefined))).rejects.toThrow(REJECTED)
        await expect(handler(signUpEvent(''))).rejects.toThrow(REJECTED)
    })

    it('rejects everyone when the list is empty', async () => {
        listReturns('  \n ')
        const handler = await loadHandler()

        await expect(handler(signUpEvent('friend@example.com'))).rejects.toThrow(REJECTED)
    })

    it('reads the configured parameter with decryption', async () => {
        listReturns('friend@example.com')
        const handler = await loadHandler()

        await handler(signUpEvent('friend@example.com'))

        expect(ssm.send).toHaveBeenCalledWith(expect.objectContaining({
            input: { Name: PARAMETER, WithDecryption: true },
        }))
    })

    it('fails closed when the list cannot be read', async () => {
        ssm.send.mockRejectedValue(new Error('ParameterNotFound'))
        const handler = await loadHandler()

        await expect(handler(signUpEvent('friend@example.com'))).rejects.toThrow(REJECTED)
        expect(console.error).toHaveBeenCalled()
    })

    it('fails closed when no parameter is configured', async () => {
        vi.stubEnv('ALLOWED_EMAILS_PARAMETER', '')
        const handler = await loadHandler()

        await expect(handler(signUpEvent('friend@example.com'))).rejects.toThrow(REJECTED)
        expect(ssm.send).not.toHaveBeenCalled()
    })

    it('keeps the list for a minute, then reads it again', async () => {
        let now = 1_000_000
        vi.spyOn(Date, 'now').mockImplementation(() => now)
        listReturns('friend@example.com')
        const handler = await loadHandler()

        await handler(signUpEvent('friend@example.com'))
        now += 30_000
        await handler(signUpEvent('friend@example.com'))
        expect(ssm.send).toHaveBeenCalledTimes(1)

        listReturns('other@example.com')
        now += 31_000
        await expect(handler(signUpEvent('friend@example.com'))).rejects.toThrow(REJECTED)
        expect(ssm.send).toHaveBeenCalledTimes(2)
    })

    it('does not cache a failed read', async () => {
        ssm.send.mockRejectedValueOnce(new Error('Throttled'))
        listReturns('friend@example.com')
        const handler = await loadHandler()

        await expect(handler(signUpEvent('friend@example.com'))).rejects.toThrow(REJECTED)
        await expect(handler(signUpEvent('friend@example.com'))).resolves.toBeDefined()
    })

    it('always allows users created by an admin in the Cognito console', async () => {
        const handler = await loadHandler()
        const event = signUpEvent('anyone@example.com', 'PreSignUp_AdminCreateUser')

        await expect(handler(event)).resolves.toBe(event)
        expect(ssm.send).not.toHaveBeenCalled()
    })
})
