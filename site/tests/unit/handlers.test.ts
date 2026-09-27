import { beforeEach, expect, test, vi } from 'vitest';

const selector = {
  type: 'TextQuoteSelector', exact: 'Attention matters — café', prefix: '', suffix: '',
  startOffset: 0, endOffset: 24,
};
const entry = (fp: string) => ({ user_fingerprint: fp, timestamp: new Date().toISOString(), selector });
const payload = () => ({ module: 'attention-as-lever', passage_id: 'attention-as-lever-abc', ...entry('reader') });
const json = (data: unknown, status = 200) => Response.json(data, { status });
const file = (fingerprints: string[], sha = 'sha-1') => json({
  sha, content: Buffer.from(JSON.stringify({ passage_id: 'attention-as-lever-abc', resonates: fingerprints.map(entry) })).toString('base64'),
});
const readRequest = (query = 'module=attention-as-lever&fp=reader') =>
  new Request(`https://onbalanceproject.com/.netlify/functions/get-resonance?${query}`);
const writeRequest = (body: unknown = payload()) => new Request('https://onbalanceproject.com/.netlify/functions/record-resonance', {
  method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' },
});
let read: typeof import('../../../netlify/functions/get-resonance').default;
let write: typeof import('../../../netlify/functions/record-resonance').default;

beforeEach(async () => {
  vi.resetModules(); // Reset per-process quota and deployment state between cases.
  vi.stubEnv('GITHUB_TOKEN', 'test-only-token');
  read = (await import('../../../netlify/functions/get-resonance')).default;
  write = (await import('../../../netlify/functions/record-resonance')).default;
});

test.each([
  ['production', 'deploy-preview', 'data/resonance'],
  ['deploy-preview', 'production', 'data/resonance-staging'],
  ['branch-deploy', 'production', 'data/resonance-staging'],
  [undefined, 'production', 'data/resonance'],
  [undefined, '', 'data/resonance-staging'],
])('read and write isolate context=%s env=%s to %s', async (context, env, branch) => {
  vi.stubEnv('CONTEXT', env);
  const fetch = vi.mocked(globalThis.fetch);
  fetch.mockResolvedValueOnce(json({}, 404));
  expect((await read(readRequest(), { deploy: { context } })).status).toBe(200);
  expect(new URL(String(fetch.mock.calls[0][0])).searchParams.get('ref')).toBe(branch);
  fetch.mockResolvedValueOnce(json({}, 404)).mockResolvedValueOnce(json({}));
  expect((await write(writeRequest(), { deploy: { context } })).status).toBe(200);
  expect(new URL(String(fetch.mock.calls[1][0])).searchParams.get('ref')).toBe(branch);
  const saved = JSON.parse(String(fetch.mock.calls[2][1]?.body));
  expect(saved.branch).toBe(branch);
  expect(JSON.parse(Buffer.from(saved.content, 'base64').toString()).resonates[0].selector.exact).toBe(selector.exact);
});

test.each([
  ['reader', 1, true], ['stranger', 2, false], [undefined, 2, false],
])('counts unique people relative to %s', async (fp, othersCount, youResonated) => {
  vi.mocked(fetch).mockResolvedValueOnce(json([{ name: 'abc.json', path: 'data/resonance/module/abc.json' }]))
    .mockResolvedValueOnce(file(['reader', 'reader', 'other']));
  const response = await read(readRequest(`module=attention-as-lever${fp ? `&fp=${fp}` : ''}`), {});
  expect(response.headers.get('Cache-Control')).toBe('no-store');
  expect((await response.json()).passages).toEqual([{
    passage_id: 'attention-as-lever-abc', othersCount, youResonated,
    selector: { exact: selector.exact, prefix: '', suffix: '' },
  }]);
});

test('marks failed passage reads as partial while retaining successful passages', async () => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.mocked(fetch).mockResolvedValueOnce(json([
    { name: 'a.json', path: 'a' }, { name: 'b.json', path: 'b' }, { name: 'README.md', path: 'readme' },
  ])).mockResolvedValueOnce(file(['other'])).mockResolvedValueOnce(json({}, 500));
  const body = await (await read(readRequest(), {})).json();
  expect(body.partial).toBe(true);
  expect(body.passages).toHaveLength(1);
  expect(fetch).toHaveBeenCalledTimes(3);
});

test('absent module data is an empty, non-cacheable result', async () => {
  vi.mocked(fetch).mockResolvedValueOnce(json({}, 404));
  const response = await read(readRequest(), {});
  expect(response.status).toBe(200);
  expect(response.headers.get('Cache-Control')).toBe('no-store');
  expect(await response.json()).toEqual({ module: 'attention-as-lever', passages: [] });
});

test('directory errors do not masquerade as an empty module', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.mocked(fetch).mockResolvedValueOnce(json({}, 500));
  expect((await read(readRequest(), {})).status).toBe(500);
});

test('repeat submissions are successful without another write', async () => {
  vi.mocked(fetch).mockResolvedValueOnce(file(['reader']));
  expect((await write(writeRequest(), {})).status).toBe(200);
  expect(fetch).toHaveBeenCalledTimes(1);
});

test('conflict retry re-reads and preserves another reader’s entry', async () => {
  vi.mocked(fetch).mockResolvedValueOnce(json({}, 404)).mockResolvedValueOnce(json({}, 409))
    .mockResolvedValueOnce(file(['other'], 'updated-sha')).mockResolvedValueOnce(json({}));
  expect((await write(writeRequest(), {})).status).toBe(200);
  const saved = JSON.parse(String(vi.mocked(fetch).mock.calls[3][1]?.body));
  expect(saved.sha).toBe('updated-sha');
  expect(JSON.parse(Buffer.from(saved.content, 'base64').toString()).resonates.map((e: { user_fingerprint: string }) => e.user_fingerprint))
    .toEqual(['other', 'reader']);
});

test('conflict retry deduplicates a concurrent submission by the same reader', async () => {
  vi.mocked(fetch).mockResolvedValueOnce(json({}, 404)).mockResolvedValueOnce(json({}, 409))
    .mockResolvedValueOnce(file(['reader']));
  expect((await write(writeRequest(), {})).status).toBe(200);
  expect(fetch).toHaveBeenCalledTimes(3);
});

test('a second conflict fails without unbounded retries', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.mocked(fetch).mockResolvedValueOnce(json({}, 404)).mockResolvedValueOnce(json({}, 409))
    .mockResolvedValueOnce(file(['other'])).mockResolvedValueOnce(json({}, 409));
  expect((await write(writeRequest(), {})).status).toBe(500);
  expect(fetch).toHaveBeenCalledTimes(4);
});

test('quota counts successful requests, blocks the eleventh, then expires', async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-26T12:00:00Z'));
  vi.mocked(fetch).mockImplementation(async () => file(['reader']));
  for (let i = 0; i < 10; i++) expect((await write(writeRequest(), {})).status).toBe(200);
  const limited = await write(writeRequest(), {});
  expect(limited.status).toBe(429);
  expect(limited.headers.get('Retry-After')).toBe('3600');
  expect(fetch).toHaveBeenCalledTimes(10);
  vi.setSystemTime(new Date('2026-09-26T13:00:01Z'));
  expect((await write(writeRequest(), {})).status).toBe(200);
});

test('failed persistence does not consume quota', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.mocked(fetch).mockImplementation(async () => json({}, 500));
  for (let i = 0; i < 11; i++) expect((await write(writeRequest(), {})).status).toBe(500);
  vi.mocked(fetch).mockImplementation(async () => file(['reader']));
  expect((await write(writeRequest(), {})).status).toBe(200);
});

test('invalid payloads and expired timestamps fail before storage access', async () => {
  for (const body of [null, {}, { ...payload(), timestamp: '2000-01-01' }, { ...payload(), selector: {} }]) {
    expect((await write(writeRequest(body), {})).status).toBe(400);
  }
  expect((await read(readRequest('module=../private'), {})).status).toBe(400);
  expect(fetch).not.toHaveBeenCalled();
});

test('both handlers reject untrusted origins and missing configuration before network access', async () => {
  for (const [handler, request] of [[read, readRequest()], [write, writeRequest()]] as const) {
    request.headers.set('Origin', 'https://untrusted.example');
    expect((await handler(request, {})).status).toBe(403);
  }
  vi.stubEnv('GITHUB_TOKEN', '');
  expect((await read(readRequest(), {})).status).toBe(503);
  expect((await write(writeRequest(), {})).status).toBe(503);
  expect(fetch).not.toHaveBeenCalled();
});

test('both handlers answer preflight and reject unsupported methods', async () => {
  for (const handler of [read, write]) {
    expect((await handler(new Request('https://example.com', { method: 'OPTIONS' }), {})).status).toBe(204);
    expect((await handler(new Request('https://example.com', { method: 'DELETE' }), {})).status).toBe(405);
  }
  expect(fetch).not.toHaveBeenCalled();
});
