declare const Netlify: {
  env: { get(key: string): string | undefined };
};

interface ResonanceBody {
  module: string;
  passage_id: string;
  timestamp: string;
  user_fingerprint: string;
  selector: {
    type: string;
    exact: string;
    prefix: string;
    suffix: string;
    startOffset: number;
    endOffset: number;
  };
}

interface ResonanceEntry {
  timestamp: string;
  user_fingerprint: string;
  selector: ResonanceBody['selector'];
}

interface ResonanceFile {
  passage_id: string;
  resonates: ResonanceEntry[];
}

interface ExistingFile {
  sha: string;
  resonates: ResonanceEntry[];
}

const REPO = 'beaulm/on-balance';
const BRANCH = 'data/resonance';
const API_BASE = `https://api.github.com/repos/${REPO}/contents`;

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 10;
const MAX_MAP_SIZE = 10_000;

const requestLog = new Map<string, number[]>();

function evictStale(): void {
  const cutoff = Date.now() - RATE_LIMIT_WINDOW_MS;
  for (const [key, timestamps] of requestLog) {
    const valid = timestamps.filter((t) => t > cutoff);
    if (valid.length === 0) {
      requestLog.delete(key);
    } else {
      requestLog.set(key, valid);
    }
  }
}

const ALLOWED_ORIGINS: string[] = [
  'http://localhost:4321',
  'http://localhost:8888',
];

function getAllowedOrigins(): string[] {
  const siteUrl = Netlify.env.get('URL');
  if (siteUrl) {
    return [...ALLOWED_ORIGINS, siteUrl];
  }
  return ALLOWED_ORIGINS;
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function errorResponse(
  message: string,
  code: string,
  status: number,
  extraHeaders?: Record<string, string>,
): Response {
  return new Response(
    JSON.stringify({ status: 'error', message, code }),
    {
      status,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json', ...extraHeaders },
    },
  );
}

function successResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

function checkRateLimit(fingerprint: string): { limited: boolean; retryAfter?: number } {
  if (requestLog.size >= MAX_MAP_SIZE) {
    evictStale();
  }

  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;

  const timestamps = (requestLog.get(fingerprint) ?? []).filter((t) => t > cutoff);
  if (timestamps.length === 0) {
    requestLog.delete(fingerprint);
  } else {
    requestLog.set(fingerprint, timestamps);
  }

  if (timestamps.length >= RATE_LIMIT_MAX) {
    const oldest = timestamps[0];
    const retryAfter = Math.ceil((oldest + RATE_LIMIT_WINDOW_MS - now) / 1000);
    return { limited: true, retryAfter };
  }

  return { limited: false };
}

function recordRequest(fingerprint: string): void {
  const timestamps = requestLog.get(fingerprint) ?? [];
  timestamps.push(Date.now());
  requestLog.set(fingerprint, timestamps);
}

function isValidTimestamp(timestamp: string): boolean {
  const parsed = Date.parse(timestamp);
  if (isNaN(parsed)) return false;
  const drift = Math.abs(Date.now() - parsed);
  return drift <= 5 * 60 * 1000; // 5 minutes
}

function isValidBody(data: unknown): data is ResonanceBody {
  if (typeof data !== 'object' || data === null) return false;
  const d = data as Record<string, unknown>;

  if (typeof d.module !== 'string' || d.module === '') return false;
  if (typeof d.passage_id !== 'string' || d.passage_id === '') return false;
  if (typeof d.timestamp !== 'string' || d.timestamp === '') return false;
  if (typeof d.user_fingerprint !== 'string' || d.user_fingerprint === '') return false;

  if (typeof d.selector !== 'object' || d.selector === null) return false;
  const s = d.selector as Record<string, unknown>;
  if (s.type !== 'TextQuoteSelector') return false;
  if (typeof s.exact !== 'string' || s.exact === '') return false;
  if (typeof s.prefix !== 'string') return false;
  if (typeof s.suffix !== 'string') return false;
  if (typeof s.startOffset !== 'number') return false;
  if (typeof s.endOffset !== 'number') return false;

  return true;
}

const SAFE_PATH_SEGMENT = /^[a-zA-Z0-9_-]+$/;

function isSafePathSegment(segment: string): boolean {
  return SAFE_PATH_SEGMENT.test(segment);
}

function toBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function fromBase64(b64: string): string {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

async function githubFetch(
  path: string,
  options: RequestInit = {},
): Promise<globalThis.Response> {
  const token = Netlify.env.get('GITHUB_TOKEN');
  return fetch(`${API_BASE}/${path}?ref=${BRANCH}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> | undefined),
    },
  });
}

async function getExistingFile(
  filePath: string,
): Promise<ExistingFile | null> {
  const res = await githubFetch(filePath);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub GET ${res.status}: ${await res.text()}`);

  const data = (await res.json()) as { sha: string; content: string };
  const decoded = fromBase64(data.content.replace(/\n/g, ''));
  const parsed = JSON.parse(decoded) as ResonanceFile;
  return { sha: data.sha, resonates: parsed.resonates };
}

async function writeFile(
  filePath: string,
  message: string,
  content: string,
  sha?: string,
): Promise<globalThis.Response> {
  const payload: Record<string, string> = {
    message,
    content: toBase64(content),
    branch: BRANCH,
  };
  if (sha) payload.sha = sha;

  return fetch(`${API_BASE}/${filePath}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${Netlify.env.get('GITHUB_TOKEN')}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

async function persistResonance(body: ResonanceBody): Promise<void> {
  if (!isSafePathSegment(body.module) || !isSafePathSegment(body.passage_id)) {
    throw new Error('Invalid module or passage_id');
  }
  const filePath = `data/resonance/${body.module}/${body.passage_id}.json`;
  const entry: ResonanceEntry = {
    timestamp: body.timestamp,
    user_fingerprint: body.user_fingerprint,
    selector: body.selector,
  };

  const attempt = async (): Promise<globalThis.Response> => {
    const existing = await getExistingFile(filePath);

    let fileContent: ResonanceFile;
    let sha: string | undefined;

    if (existing) {
      existing.resonates.push(entry);
      fileContent = { passage_id: body.passage_id, resonates: existing.resonates };
      sha = existing.sha;
    } else {
      fileContent = { passage_id: body.passage_id, resonates: [entry] };
    }

    const json = JSON.stringify(fileContent, null, 2) + '\n';
    const message = existing
      ? `data: append resonance to ${body.passage_id}`
      : `data: create resonance for ${body.passage_id}`;

    return writeFile(filePath, message, json, sha);
  };

  const res = await attempt();

  if (res.status === 409) {
    const retry = await attempt();
    if (!retry.ok) {
      throw new Error(`GitHub PUT conflict retry ${retry.status}: ${await retry.text()}`);
    }
    return;
  }

  if (!res.ok) {
    throw new Error(`GitHub PUT ${res.status}: ${await res.text()}`);
  }
}

export default async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 'METHOD_NOT_ALLOWED', 405);
  }

  // Origin check: block requests from unknown origins, allow missing Origin (non-browser)
  const origin = request.headers.get('Origin');
  if (origin && !getAllowedOrigins().includes(origin)) {
    return errorResponse('Forbidden', 'FORBIDDEN', 403);
  }

  if (!Netlify.env.get('GITHUB_TOKEN')) {
    return errorResponse('GitHub integration not configured', 'SERVICE_UNAVAILABLE', 503);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON', 'INVALID_REQUEST', 400);
  }

  if (!isValidBody(body)) {
    return errorResponse(
      'Invalid payload: missing or malformed fields',
      'INVALID_REQUEST',
      400,
    );
  }

  if (!isValidTimestamp(body.timestamp)) {
    return errorResponse(
      'Timestamp must be a valid ISO 8601 date within 5 minutes of server time',
      'INVALID_REQUEST',
      400,
    );
  }

  // Rate limiting per user_fingerprint
  const rateCheck = checkRateLimit(body.user_fingerprint);
  if (rateCheck.limited) {
    return errorResponse(
      'Too many requests',
      'RATE_LIMIT_EXCEEDED',
      429,
      { 'Retry-After': String(rateCheck.retryAfter) },
    );
  }

  try {
    await persistResonance(body);
  } catch (err) {
    console.error('[Resonance] GitHub API error:', err);
    return errorResponse('Failed to persist resonance', 'STORAGE_ERROR', 500);
  }

  // Record quota only after successful persistence
  recordRequest(body.user_fingerprint);

  return successResponse({ status: 'success', message: 'Resonance recorded' });
};
