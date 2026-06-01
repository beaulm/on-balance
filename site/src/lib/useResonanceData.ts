import { useState, useEffect, useCallback, useRef } from 'react';
import { logResonanceFailure } from './resonance';

export interface ResonancePassage {
  passageId: string;
  count: number;
  selector: {
    exact: string;
    prefix: string;
    suffix: string;
  };
}

interface ApiResponse {
  module: string;
  partial?: boolean;
  passages: Array<{
    passage_id: string;
    count: number;
    selector: {
      exact: string;
      prefix: string;
      suffix: string;
    };
  }>;
}

// Module-level cache to avoid refetching on re-renders
const cache = new Map<string, ResonancePassage[]>();

// Fold the current user's optimistic additions into a freshly fetched list so a
// slow initial read that resolves *after* a fast submission can't clobber the
// just-added glow. Also smooths over GitHub read staleness: max() never
// under-counts the user's own contribution, and once the server reflects the
// write its count wins.
function mergeOptimistic(
  fetched: ResonancePassage[],
  optimistic: Map<string, ResonancePassage>,
): ResonancePassage[] {
  if (optimistic.size === 0) return fetched;
  const byId = new Map(fetched.map((p) => [p.passageId, p]));
  for (const [id, local] of optimistic) {
    const server = byId.get(id);
    byId.set(id, server ? { ...server, count: Math.max(server.count, local.count) } : local);
  }
  return [...byId.values()];
}

export function useResonanceData(moduleSlug: string) {
  const [passages, setPassages] = useState<ResonancePassage[]>(
    () => cache.get(moduleSlug) ?? [],
  );
  const [loading, setLoading] = useState(!cache.has(moduleSlug));
  const [error, setError] = useState<Error | null>(null);
  // The current user's optimistic additions for this module, merged into any
  // fetch result. Cleared on module change (entries are module-scoped, and the
  // cache already carries them forward for revisits).
  const optimisticRef = useRef<Map<string, ResonancePassage>>(new Map());

  useEffect(() => {
    optimisticRef.current = new Map();

    // Sync state immediately when moduleSlug changes (cached or not)
    const cached = cache.get(moduleSlug);
    if (cached) {
      setPassages(cached);
      setLoading(false);
      setError(null);
      return;
    }

    setPassages([]);
    setLoading(true);
    setError(null);

    const controller = new AbortController();

    async function fetchData() {
      try {
        const res = await fetch(
          `/.netlify/functions/get-resonance?module=${encodeURIComponent(moduleSlug)}`,
          { signal: controller.signal },
        );

        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { code?: string };
          logResonanceFailure('read', res.status, body.code, body);
          const err = new Error(`Failed to fetch resonance data: ${res.status}`);
          err.name = 'ResonanceHttpError';
          throw err;
        }

        const data = (await res.json()) as ApiResponse;
        const mapped: ResonancePassage[] = data.passages.map((p) => ({
          passageId: p.passage_id,
          count: p.count,
          selector: p.selector,
        }));
        const merged = mergeOptimistic(mapped, optimisticRef.current);

        // Only cache complete responses; partial data should be refetched
        if (!data.partial) {
          cache.set(moduleSlug, merged);
        }
        setPassages(merged);
      } catch (err) {
        const name = (err as Error).name;
        if (name === 'AbortError') return;
        // HTTP errors are already logged at the !res.ok branch above; only
        // log here for network failures, JSON parse errors, and other
        // unexpected exceptions.
        if (name !== 'ResonanceHttpError') {
          logResonanceFailure('read request', 0, undefined, err);
        }
        setError(err as Error);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchData();
    return () => controller.abort();
  }, [moduleSlug]);

  // Optimistically reflect a resonance the current user just submitted, so the
  // glow appears immediately instead of only after a page reload. `bumpCount`
  // is false when the user had already resonated with this passage (so we don't
  // visually double-count their repeat); a brand-new passage always starts at 1.
  const addLocalResonance = useCallback(
    (
      passageId: string,
      selector: ResonancePassage['selector'],
      bumpCount: boolean,
    ) => {
      setPassages((prev) => {
        const idx = prev.findIndex((p) => p.passageId === passageId);
        let next: ResonancePassage[];
        if (idx === -1) {
          next = [...prev, { passageId, count: 1, selector }];
        } else if (bumpCount) {
          next = prev.map((p, i) =>
            i === idx ? { ...p, count: p.count + 1 } : p,
          );
        } else {
          return prev;
        }
        // Remember this addition so an in-flight fetch resolving later merges it
        // back in rather than overwriting it (idempotent under StrictMode's
        // double-invoked updater).
        const entry = next.find((p) => p.passageId === passageId);
        if (entry) optimisticRef.current.set(passageId, entry);
        cache.set(moduleSlug, next);
        return next;
      });
    },
    [moduleSlug],
  );

  return { passages, loading, error, addLocalResonance };
}
