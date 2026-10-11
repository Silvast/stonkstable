import { describe, it, expect, vi } from 'vitest'

const configure = vi.hoisted(() => vi.fn())
vi.mock('aws-amplify', () => ({ Amplify: { configure } }))

import { cloudEnabled, configureAmplify } from './amplify'

describe('amplify config', () => {
    it('configures Amplify only when amplify_outputs.json exists', () => {
        configureAmplify()

        expect(configure).toHaveBeenCalledTimes(cloudEnabled ? 1 : 0)
    })
})
