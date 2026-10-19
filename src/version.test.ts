import { describe, it, expect } from 'vitest';
import { APP_VERSION, GIT_HASH, VERSION_LABEL } from './version';

describe('version constants', () => {
    it('exposes a non-empty APP_VERSION', () => {
        expect(typeof APP_VERSION).toBe('string');
        expect(APP_VERSION.length).toBeGreaterThan(0);
    });

    it('exposes a non-empty GIT_HASH', () => {
        expect(typeof GIT_HASH).toBe('string');
        expect(GIT_HASH.length).toBeGreaterThan(0);
    });

    it('combines version and hash into a human-readable label', () => {
        expect(VERSION_LABEL).toBe(`${APP_VERSION} (${GIT_HASH})`);
    });
});
