import { getEnv } from './_lib/env';
import { checkOrigin } from './_lib/origin';

interface NetlifyHandlerContext {
  deploy?: { context?: string };
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
  // Distinct resonators excluding the caller, so the client never has to infer
  // whether a total already includes the caller's own submission. Invariant
  // under the caller's own resonance, which only flips youResonated.
  othersCount: number;
  youResonated: boolean;
  selector: {
    exact: string;
    prefix: string;
    suffix: string;
  };
}

const REPO = 'beaulm/on-balance';
const API_BASE = `https://api.github.com/repos/${REPO}/contents`;

// Route non-production traffic (deploy previews, branch deploys, local dev)
// to a separate data branch so testing doesn't pollute production resonance
// counts (#90). Resolved at handler entry from the Netlify v2 context object,
// with an env-var fallback. Defaults to staging so detection failures fail
// safely (previews never accidentally read production data).
let currentDataBranch = 'data/resonance-staging';

function getDataBranch(): string {
  return currentDataBranch;
}

function resolveDataBranch(context: NetlifyHandlerContext): string {
  const deployContext = context.deploy?.context ?? getEnv('CONTEXT');
  return deployContext === 'production'
    ? 'data/resonance'
    : 'data/resonance-staging';
}

const SAFE_PATH_SEGMENT = /^[a-zA-Z0-9_-]+$/;

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
  return fetch(`${API_BASE}/${path}?ref=${getDataBranch()}`, {
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

export default async (request: Request, context: NetlifyHandlerContext) => {
  currentDataBranch = resolveDataBranch(context);

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (request.method !== 'GET') {
    return errorResponse('Method not allowed', 'METHOD_NOT_ALLOWED', 405);
  }

  const forbidden = checkOrigin(request, CORS_HEADERS);
  if (forbidden) return forbidden;

  if (!getEnv('GITHUB_TOKEN')) {
    return errorResponse('GitHub integration not configured', 'SERVICE_UNAVAILABLE', 503);
  }

  const url = new URL(request.url);
  const moduleSlug = url.searchParams.get('module');

  if (!moduleSlug || !SAFE_PATH_SEGMENT.test(moduleSlug)) {
    return errorResponse('Invalid or missing module parameter', 'INVALID_REQUEST', 400);
  }

  // The caller's anonymous fingerprint, used only to compute youResonated /
  // othersCount per passage (never written or used in a path). Optional: absent
  // means an anonymous view (youResonated false, othersCount = all resonators).
  const fingerprint = url.searchParams.get('fp');

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
          'Cache-Control': 'no-store',
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
    // Distinct fingerprints, split into the caller vs. everyone else. Using a
    // Set also collapses any legacy duplicate entries written before
    // record-resonance deduped by fingerprint, so the count is unique-by-person
    // regardless of stored data.
    const fingerprints = new Set(file.resonates.map((r) => r.user_fingerprint));
    const youResonated = fingerprint !== null && fingerprints.has(fingerprint);
    const othersCount = fingerprints.size - (youResonated ? 1 : 0);
    passages.push({
      passage_id: file.passage_id,
      othersCount,
      youResonated,
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
        'Cache-Control': 'no-store',
      },
    },
  );
};
