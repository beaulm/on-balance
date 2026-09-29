import { afterEach, beforeEach, vi } from 'vitest';

beforeEach(() => {
  // No real network or inherited deployment credentials in unit/handler tests.
  vi.stubGlobal('fetch', vi.fn(async () => {
    throw new Error('Unexpected network request: provide a test response');
  }));
  vi.stubGlobal('Netlify', undefined);
  for (const key of ['GITHUB_TOKEN', 'CONTEXT', 'URL']) vi.stubEnv(key, '');
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
