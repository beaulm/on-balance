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

export default async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
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

  console.log('[Resonance] recorded:', JSON.stringify(body));

  return jsonResponse({ status: 'success', message: 'Resonance recorded' }, 200);
};
