// @vitest-environment jsdom
import { webcrypto } from 'node:crypto';
import { beforeEach, expect, test, vi } from 'vitest';
import {
  generatePassageId, getUserFingerprint, getResonatedPassageIds,
  markPassageResonated, resonatedStorageKey, resonancePhrase, sendResonance,
  type ResonancePayload,
} from '../../src/lib/resonance';

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('crypto', webcrypto);
});

test('identity persists, and resonance ownership is scoped to it', () => {
  const id = getUserFingerprint();
  expect(getUserFingerprint()).toBe(id);
  expect(markPassageResonated('module-a')).toBe(true);
  expect(markPassageResonated('module-a')).toBe(false);
  expect([...getResonatedPassageIds()]).toEqual(['module-a']);
  localStorage.removeItem('onbalance-user-id');
  expect(getUserFingerprint()).not.toBe(id);
  expect([...getResonatedPassageIds()]).toEqual([]);
});

test.each(['invalid JSON', '{}', '[42,null,"module-a"]'])('tolerates malformed stored IDs: %s', (raw) => {
  localStorage.setItem(resonatedStorageKey(), raw);
  expect([...getResonatedPassageIds()]).toEqual(raw.startsWith('[') ? ['module-a'] : []);
});

test('blocked storage reads yield an empty set and failed writes remain best effort', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
  expect([...getResonatedPassageIds()]).toEqual([]);

  vi.restoreAllMocks();
  getUserFingerprint(); // initialize user ID so setItem failure specifically exercises markPassageResonated
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
  expect(markPassageResonated('module-a')).toBe(true);
});

test('passage IDs are deterministic and distinguish module and context', async () => {
  const id = await generatePassageId('module', 'attention', 'before', 'after');
  expect(id).toMatch(/^module-[a-f0-9]{12}$/);
  expect(await generatePassageId('module', 'attention', 'before', 'after')).toBe(id);
  expect(await generatePassageId('module', 'attention', 'elsewhere', 'after')).not.toBe(id);
  expect(await generatePassageId('other', 'attention', 'before', 'after')).not.toBe(id);
});

test.each([
  [0, true, 'You resonated with this'],
  [1, true, 'You and 1 other person resonated'],
  [3, true, 'You and 3 other people resonated'],
  [1, false, '1 person resonated with this passage'],
  [3, false, '3 people resonated with this passage'],
])('phrases count=%s own=%s', (count, own, phrase) => {
  expect(resonancePhrase(count, own)).toBe(phrase);
});

const payload = { module: 'module', passage_id: 'module-a' } as ResonancePayload;

test('successful submission sends JSON to the local function', async () => {
  vi.mocked(fetch).mockResolvedValueOnce(Response.json({ status: 'success' }));
  await expect(sendResonance(payload)).resolves.toBeUndefined();
  expect(fetch).toHaveBeenCalledWith('/.netlify/functions/record-resonance', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  });
});

test.each([[400, false], [403, false], [404, false], [429, true], [500, true], [502, true], [503, false]])(
  'classifies HTTP %s as retriable=%s', async (status, retriable) => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({ code: 'TEST_ERROR' }, {
      status, headers: { 'Retry-After': '12' },
    }));
    await expect(sendResonance(payload)).rejects.toMatchObject({
      name: 'ResonanceError', status, retriable, code: 'TEST_ERROR', retryAfter: 12,
    });
  },
);

test('handles non-JSON failure bodies and invalid Retry-After', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.mocked(fetch).mockResolvedValueOnce(new Response('<html>Bad gateway</html>', {
    status: 502, headers: { 'Retry-After': 'invalid' },
  }));
  await expect(sendResonance(payload)).rejects.toMatchObject({ status: 502, retriable: true, retryAfter: undefined });
});

test('network failures remain retriable', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.mocked(fetch).mockRejectedValueOnce(new TypeError('offline'));
  await expect(sendResonance(payload)).rejects.toMatchObject({ status: 0, retriable: true });
});
