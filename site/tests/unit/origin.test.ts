import { expect, test, vi } from 'vitest';
import { checkOrigin } from '../../../netlify/functions/_lib/origin';
import { getEnv } from '../../../netlify/functions/_lib/env';

// Netlify functions live one level above the site package.
test.each([
  [undefined, 'https://onbalanceproject.com/read', true],
  ['https://onbalanceproject.com', 'https://onbalanceproject.com/read', true],
  ['https://deploy-preview-12--on-balance.netlify.app', 'https://deploy-preview-12--on-balance.netlify.app/api', true],
  ['http://localhost:4321', 'http://localhost:8888/api', true],
  ['http://localhost:8888', 'http://localhost:8888/api', true],
  ['https://untrusted.example', 'https://onbalanceproject.com/api', false],
  ['https://onbalanceproject.com.evil.example', 'https://onbalanceproject.com/api', false],
])('origin %s on %s is allowed=%s', (origin, url, allowed) => {
  const request = new Request(url, { headers: origin ? { Origin: origin } : {} });
  const response = checkOrigin(request, {});
  if (allowed) expect(response).toBeNull();
  else expect(response?.status).toBe(403);
});

test('allows the configured production origin', () => {
  vi.stubEnv('URL', 'https://custom.example');
  expect(checkOrigin(new Request('https://function.example/api', {
    headers: { Origin: 'https://custom.example' },
  }), {})).toBeNull();
});

test('environment prefers Netlify and falls back to process.env', () => {
  vi.stubEnv('CONTEXT', 'dev');
  expect(getEnv('CONTEXT')).toBe('dev');
  vi.stubGlobal('Netlify', { env: { get: () => 'production' } });
  expect(getEnv('CONTEXT')).toBe('production');
  vi.stubGlobal('Netlify', { env: { get: () => undefined } });
  expect(getEnv('CONTEXT')).toBe('dev');
});
