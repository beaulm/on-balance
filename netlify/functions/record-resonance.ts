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

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
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
  const decoded = atob(data.content.replace(/\n/g, ''));
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
    content: btoa(content),
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
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  if (!Netlify.env.get('GITHUB_TOKEN')) {
    return jsonResponse({ error: 'GitHub integration not configured' }, 503);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }

  if (!isValidBody(body)) {
    return jsonResponse({ error: 'Invalid payload: missing or malformed fields' }, 400);
  }

  try {
    await persistResonance(body);
  } catch (err) {
    console.error('[Resonance] GitHub API error:', err);
    return jsonResponse({ error: 'Failed to persist resonance' }, 500);
  }

  return jsonResponse({ status: 'success', message: 'Resonance recorded' }, 200);
};
