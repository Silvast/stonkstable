// The values are populated at build time by the `buildInfoPlugin`
// (see `vite-plugins/build-info.ts`) via Vite's `define` option, so they
// end up as inlined string literals in the production bundle. In local dev
// the same Vite plugin provides them through `import.meta.env`.
const pickString = (value: unknown, fallback: string): string =>
  typeof value === 'string' && value.length > 0 ? value : fallback;

export const APP_VERSION: string = pickString(import.meta.env.VITE_APP_VERSION, 'dev');

export const GIT_HASH: string = pickString(import.meta.env.VITE_GIT_HASH, 'dev');

export const VERSION_LABEL: string = `${APP_VERSION} (${GIT_HASH})`;
