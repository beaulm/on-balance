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

export function getUserFingerprint(): string {
  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
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

export async function sendResonance(payload: ResonancePayload): Promise<void> {
  const response = await fetch('/.netlify/functions/record-resonance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    console.error('[Resonance] server error:', response.status, body);
  }
}
