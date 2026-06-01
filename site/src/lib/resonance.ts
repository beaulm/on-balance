import type { SelectionData } from '../components/TextSelectionHandler';

export interface ResonancePayload {
  /** W3C Web Annotation motivation */
  motivation: 'highlighting';
  /** Module directory name, e.g. "attention-as-lever" */
  module: string;
  /** Deterministic hash: "${moduleSlug}-${first12OfSHA256}" */
  passage_id: string;
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Anonymous persistent UUID from localStorage */
  user_fingerprint: string;
  /** W3C-style text selector */
  selector: {
    type: 'TextQuoteSelector';
    exact: string;
    prefix: string;
    suffix: string;
    startOffset: number;
    endOffset: number;
  };
}

const STORAGE_KEY = 'onbalance-user-id';
const RESONATED_KEY_PREFIX = 'onbalance-resonated:';

export function getUserFingerprint(): string {
  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}

// Passage IDs this fingerprint has resonated with, persisted so "You resonated"
// survives a page reload. Keyed by fingerprint so clearing the user ID also
// resets the set. Server-side data is not deduped by fingerprint, so this is
// the only reliable signal for "did *I* resonate with this passage".
function resonatedStorageKey(): string {
  return `${RESONATED_KEY_PREFIX}${getUserFingerprint()}`;
}

export function getResonatedPassageIds(): Set<string> {
  try {
    const raw = localStorage.getItem(resonatedStorageKey());
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === 'string'));
  } catch {
    return new Set();
  }
}

/** Record that the current user resonated with a passage. Returns true if this
 *  was newly added (false if it was already recorded). */
export function markPassageResonated(passageId: string): boolean {
  const ids = getResonatedPassageIds();
  if (ids.has(passageId)) return false;
  ids.add(passageId);
  try {
    localStorage.setItem(resonatedStorageKey(), JSON.stringify([...ids]));
  } catch {
    // Storage full or unavailable — the in-memory optimistic update still
    // applies for this session; persistence is best-effort.
  }
  return true;
}

/**
 * Human-readable resonance count, accounting for whether the current user is
 * one of the resonators. `suffix` only affects the others-only phrasing
 * ("...here" for the hover tooltip vs "...with this passage" for screen
 * readers); the "you" phrasing reads naturally in both contexts.
 */
export function resonancePhrase(
  count: number,
  youResonated: boolean,
  suffix = 'with this passage',
): string {
  if (youResonated) {
    const others = count - 1;
    if (others <= 0) return 'You resonated with this';
    if (others === 1) return 'You and 1 other person resonated';
    return `You and ${others} other people resonated`;
  }
  return `${count} ${count === 1 ? 'person' : 'people'} resonated ${suffix}`;
}

export async function generatePassageId(
  moduleSlug: string,
  exact: string,
  prefix: string,
  suffix: string,
): Promise<string> {
  const input = `${exact}${prefix}${suffix}`;
  const encoded = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${moduleSlug}-${hashHex.slice(0, 12)}`;
}

export async function formatSelectionData(
  moduleSlug: string,
  selectionData: SelectionData,
): Promise<ResonancePayload> {
  const { exact, prefix, suffix, startOffset, endOffset } = selectionData;
  const [passageId, fingerprint] = await Promise.all([
    generatePassageId(moduleSlug, exact, prefix, suffix),
    Promise.resolve(getUserFingerprint()),
  ]);

  return {
    motivation: 'highlighting',
    module: moduleSlug,
    passage_id: passageId,
    timestamp: new Date().toISOString(),
    user_fingerprint: fingerprint,
    selector: {
      type: 'TextQuoteSelector',
      exact,
      prefix,
      suffix,
      startOffset,
      endOffset,
    },
  };
}

export class ResonanceError extends Error {
  readonly status: number;
  readonly code: string | undefined;
  readonly retryAfter: number | undefined;
  readonly retriable: boolean;

  constructor(opts: {
    message: string;
    status: number;
    code?: string;
    retryAfter?: number;
    retriable: boolean;
  }) {
    super(opts.message);
    this.name = 'ResonanceError';
    this.status = opts.status;
    this.code = opts.code;
    this.retryAfter = opts.retryAfter;
    this.retriable = opts.retriable;
  }
}

// status === 0 represents fetch rejection (network failure, abort, CORS),
// not an HTTP response. 429 and most 5xx are server-side transient
// failures. 503 is treated as terminal because record-resonance returns it
// specifically for SERVICE_UNAVAILABLE (missing GITHUB_TOKEN), a setup
// error retries cannot fix.
function isRetriableStatus(status: number): boolean {
  if (status === 0) return true;
  if (status === 429) return true;
  if (status === 503) return false;
  return status >= 500 && status < 600;
}

// A 404 on /.netlify/functions/* almost always means the user is browsing the
// Astro dev server on :4321, which doesn't serve functions. Surface this
// inline to save the next contributor a debugging trip.
const NETLIFY_DEV_HINT =
  '(404 on a Netlify Function usually means the dev server isn\'t serving it — ' +
  'run `npx netlify dev` from the repo root and browse :8888 instead of :4321.)';

export function logResonanceFailure(
  context: string,
  status: number,
  code: string | undefined,
  extra?: unknown,
): void {
  const hint = status === 404 ? ` ${NETLIFY_DEV_HINT}` : '';
  const codeStr = code ? ` ${code}` : '';
  console.error(`[Resonance] ${context} failed: ${status}${codeStr}${hint}`, extra ?? '');
}

export async function sendResonance(payload: ResonancePayload): Promise<void> {
  let response: Response;
  try {
    response = await fetch('/.netlify/functions/record-resonance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    logResonanceFailure('write request', 0, undefined, err);
    throw new ResonanceError({
      message: 'Network error while submitting resonance',
      status: 0,
      retriable: true,
    });
  }

  if (response.ok) return;

  const body = (await response.json().catch(() => ({}))) as { code?: string };
  const retryAfterHeader = response.headers.get('Retry-After');
  const retryAfterNum = retryAfterHeader ? Number(retryAfterHeader) : NaN;
  const retryAfter = Number.isFinite(retryAfterNum) ? retryAfterNum : undefined;

  logResonanceFailure('write', response.status, body.code, body);

  throw new ResonanceError({
    message: `Resonance request failed: ${response.status}`,
    status: response.status,
    code: body.code,
    retryAfter,
    retriable: isRetriableStatus(response.status),
  });
}
