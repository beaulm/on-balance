import { getEnv } from './env';

const ALLOWED_ORIGINS: string[] = [
  'http://localhost:4321',
  'http://localhost:8888',
];

function getAllowedOrigins(): string[] {
  const origins = [...ALLOWED_ORIGINS];
  const siteUrl = getEnv('URL');
  if (siteUrl) origins.push(siteUrl);
  return origins;
}

function isAllowedOrigin(origin: string, requestUrl: string): boolean {
  if (getAllowedOrigins().includes(origin)) return true;

  // Allow same-origin requests (covers production, deploy previews, branch deploys)
  try {
    if (origin === new URL(requestUrl).origin) return true;
  } catch {
    // malformed URL — fall through
  }

  return false;
}

// Verify the request's Origin header is allowed. Returns a 403 Response if
// it isn't, or null if the request can proceed. A missing Origin header is
// treated as a non-browser caller and allowed through, matching the
// per-function behavior this was extracted from.
export function checkOrigin(
  request: Request,
  corsHeaders: Record<string, string>,
): Response | null {
  const origin = request.headers.get('Origin');
  if (origin && !isAllowedOrigin(origin, request.url)) {
    return new Response(
      JSON.stringify({ status: 'error', message: 'Forbidden', code: 'FORBIDDEN' }),
      {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
  return null;
}
