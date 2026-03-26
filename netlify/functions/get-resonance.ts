declare const Netlify: {
  env: { get(key: string): string | undefined };
};

function getEnv(key: string): string | undefined {
  try {
    const value = Netlify.env.get(key);
    if (value !== undefined) return value;
  } catch {
    // Netlify global not available in local dev
  }
  return process.env[key];
}

interface ResonanceEntry {
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

interface ResonanceFile {
  passage_id: string;
  resonates: ResonanceEntry[];
}

interface PassageSummary {
  passage_id: string;
  count: number;
  selector: {
    exact: string;
    prefix: string;
    suffix: string;
  };
}

const REPO = 'beaulm/on-balance';
const BRANCH = 'data/resonance';
const API_BASE = `https://api.github.com/repos/${REPO}/contents`;

const SAFE_PATH_SEGMENT = /^[a-zA-Z0-9_-]+$/;

const ALLOWED_ORIGINS: string[] = [
  'http://localhost:4321',
  'http://localhost:8888',
];

function getAllowedOrigins(): string[] {
  const siteUrl = getEnv('URL');
  if (siteUrl) {
    return [...ALLOWED_ORIGINS, siteUrl];
  }
  return ALLOWED_ORIGINS;
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function errorResponse(message: string, code: string, status: number): Response {
  return new Response(
    JSON.stringify({ status: 'error', message, code }),
    { status, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
  );
}

function fromBase64(b64: string): string {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

async function githubFetch(path: string): Promise<globalThis.Response> {
  const token = getEnv('GITHUB_TOKEN');
  return fetch(`${API_BASE}/${path}?ref=${BRANCH}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
    },
  });
}

async function fetchFileContent(filePath: string): Promise<ResonanceFile | null> {
  try {
    const res = await githubFetch(filePath);
    if (!res.ok) {
      console.warn(`[get-resonance] Failed to fetch ${filePath}: ${res.status}`);
      return null;
    }

    const data = (await res.json()) as { content: string };
    const decoded = fromBase64(data.content.replace(/\n/g, ''));
    return JSON.parse(decoded) as ResonanceFile;
  } catch (err) {
    console.warn(`[get-resonance] Failed to decode ${filePath}:`, err);
    return null;
  }
}

export default async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (request.method !== 'GET') {
    return errorResponse('Method not allowed', 'METHOD_NOT_ALLOWED', 405);
  }

  const origin = request.headers.get('Origin');
  if (origin && !getAllowedOrigins().includes(origin)) {
    return errorResponse('Forbidden', 'FORBIDDEN', 403);
  }

  if (!getEnv('GITHUB_TOKEN')) {
    return errorResponse('GitHub integration not configured', 'SERVICE_UNAVAILABLE', 503);
  }

  const url = new URL(request.url);
  const moduleSlug = url.searchParams.get('module');

  if (!moduleSlug || !SAFE_PATH_SEGMENT.test(moduleSlug)) {
    return errorResponse('Invalid or missing module parameter', 'INVALID_REQUEST', 400);
  }

  // List directory contents for this module
  const dirPath = `data/resonance/${moduleSlug}`;
  const listRes = await githubFetch(dirPath);

  if (listRes.status === 404) {
    // No resonance data for this module yet — return empty
    return new Response(
      JSON.stringify({ module: moduleSlug, passages: [] }),
      {
        status: 200,
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300',
        },
      },
    );
  }

  if (!listRes.ok) {
    console.error('[get-resonance] GitHub directory listing failed:', listRes.status);
    return errorResponse('Failed to fetch resonance data', 'STORAGE_ERROR', 500);
  }

  const files = (await listRes.json()) as Array<{ path: string; name: string }>;
  const jsonFiles = files.filter((f) => f.name.endsWith('.json'));

  // Fetch all file contents in parallel
  const fileContents = await Promise.all(
    jsonFiles.map((f) => fetchFileContent(f.path)),
  );

  // Build summarized response: passage_id, count, and first selector
  const passages: PassageSummary[] = [];
  let failed = 0;
  for (const file of fileContents) {
    if (!file) {
      failed++;
      continue;
    }
    if (file.resonates.length === 0) continue;
    const first = file.resonates[0];
    passages.push({
      passage_id: file.passage_id,
      count: file.resonates.length,
      selector: {
        exact: first.selector.exact,
        prefix: first.selector.prefix,
        suffix: first.selector.suffix,
      },
    });
  }

  if (failed > 0) {
    console.warn(`[get-resonance] ${failed}/${jsonFiles.length} file fetches failed for ${moduleSlug}`);
  }

  const body: Record<string, unknown> = { module: moduleSlug, passages };
  if (failed > 0) body.partial = true;

  return new Response(
    JSON.stringify(body),
    {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300',
      },
    },
  );
};
