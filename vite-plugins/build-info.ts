import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import type { Plugin } from 'vite';

const readPackageVersion = (): string => {
  try {
    const raw = readFileSync('package.json', 'utf-8');
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && 'version' in parsed) {
      const value = (parsed as { version: unknown }).version;
      if (typeof value === 'string' && value.length > 0) return value;
    }
  } catch {
    // ignore — fall back to placeholder
  }
  return '0.0.0';
};

const readGitHash = (): string => {
  try {
    const hash = execSync('git rev-parse --short HEAD', {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
    return hash.length > 0 ? hash : 'unknown';
  } catch {
    return 'unknown';
  }
};

// Vite plugin that resolves the app version (from `package.json`) and the
// short git commit hash, and exposes them as `import.meta.env.VITE_*`
// values so the `src/version.ts` module can read them in both dev and
// production builds.
export const buildInfoPlugin = (): Plugin => ({
  name: 'build-info',
  config() {
    return {
      define: {
        'import.meta.env.VITE_APP_VERSION': JSON.stringify(readPackageVersion()),
        'import.meta.env.VITE_GIT_HASH': JSON.stringify(readGitHash()),
      },
    };
  },
});
