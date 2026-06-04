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

// A passage the current user resonated with this session, and the count the
// user has observed for it (the count after their own optimistic +1). We can't
// trust server counts to reflect the user's submission immediately —
// get-resonance returns aggregate counts with no per-fingerprint data, and the
// post-write GitHub read can briefly still return the pre-write file — so we
// hold this as a floor. It's only ever a lower bound on the truth (the user
// plus the distinct others they'd already seen), and counts only grow, so
// flooring to it can never overcount; it just prevents a transient undercount.
interface OptimisticAddition {
  selector: ResonancePassage['selector'];
  minCount: number;
}

// Floor each of the user's resonated passages to the count they've observed:
// trust the server count when it already meets the floor (it caught up, or
// others have since pushed it higher), but never let a stale read drop a
// passage below the user's own contribution. Passages the result omits are
// re-added at the floor (e.g. a brand-new passage GitHub hasn't replicated).
function applyOptimisticFloor(
  passages: ResonancePassage[],
  optimistic: Map<string, OptimisticAddition>,
): ResonancePassage[] {
  if (optimistic.size === 0) return passages;
  const byId = new Map(passages.map((p) => [p.passageId, p]));
  for (const [id, local] of optimistic) {
    const existing = byId.get(id);
    if (!existing) {
      byId.set(id, { passageId: id, count: local.minCount, selector: local.selector });
    } else if (existing.count < local.minCount) {
      byId.set(id, { ...existing, count: local.minCount });
    }
  }
  return [...byId.values()];
}

// Overlay a partial fetch result onto what we already had. get-resonance drops
// passage files that fail to load and flags the response partial; those
// omissions are read failures, not removals (passages only grow), so we keep
// previously known passages and let the ones this read returned win.
function overlayPartial(
  previous: ResonancePassage[],
  fetched: ResonancePassage[],
): ResonancePassage[] {
  const byId = new Map(previous.map((p) => [p.passageId, p]));
  for (const f of fetched) byId.set(f.passageId, f);
  return [...byId.values()];
}

export function useResonanceData(moduleSlug: string) {
  const [passages, setPassages] = useState<ResonancePassage[]>(
    () => cache.get(moduleSlug) ?? [],
  );
  const [loading, setLoading] = useState(!cache.has(moduleSlug));
  const [error, setError] = useState<Error | null>(null);
  // The current user's resonated passages for this module, used to floor fetch
  // results to the count the user has observed. Cleared on module change
  // (entries are module-scoped, and the cache already carries them forward for
  // revisits).
  const optimisticRef = useRef<Map<string, OptimisticAddition>>(new Map());
  const controllerRef = useRef<AbortController | null>(null);
  // Monotonic id so a slow earlier request can't apply over a newer one.
  const fetchSeqRef = useRef(0);

  const runFetch = useCallback(() => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const seq = ++fetchSeqRef.current;
    const isLatest = () => seq === fetchSeqRef.current;

    setLoading(true);
    setError(null);

    (async () => {
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
        // A superseded request must not apply its (older) result or poison the
        // cache, even though its fetch wasn't aborted in time.
        if (!isLatest()) return;

        if (data.partial) {
          // Don't cache an incomplete view, and don't let dropped files reset
          // known counts (e.g. knock the user's passage back to the floor).
          setPassages((prev) =>
            applyOptimisticFloor(overlayPartial(prev, mapped), optimisticRef.current),
          );
        } else {
          const merged = applyOptimisticFloor(mapped, optimisticRef.current);
          cache.set(moduleSlug, merged);
          setPassages(merged);
        }
      } catch (err) {
        const name = (err as Error).name;
        if (name === 'AbortError') return;
        // HTTP errors are already logged at the !res.ok branch above; only
        // log here for network failures, JSON parse errors, and other
        // unexpected exceptions.
        if (name !== 'ResonanceHttpError') {
          logResonanceFailure('read request', 0, undefined, err);
        }
        if (isLatest()) setError(err as Error);
      } finally {
        if (isLatest()) setLoading(false);
      }
    })();
  }, [moduleSlug]);

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
    runFetch();
    return () => controllerRef.current?.abort();
  }, [moduleSlug, runFetch]);

  // Reflect a resonance the current user just submitted. The optimistic state
  // update makes the glow appear immediately; the refetch then reconciles the
  // count against the server. The refetch runs after the write persisted
  // (sendResonance resolved) and supersedes a still-pending mount fetch whose
  // pre-write count would otherwise clobber the glow — but it can still read a
  // briefly-stale file, so the optimistic floor (recorded below) keeps the
  // count from dipping under what the user observed. `bumpCount` is false for a
  // repeat resonance on the same passage, so the floor doesn't drift upward.
  const addLocalResonance = useCallback(
    (
      passageId: string,
      selector: ResonancePassage['selector'],
      bumpCount: boolean,
    ) => {
      setPassages((prev) => {
        const idx = prev.findIndex((p) => p.passageId === passageId);
        let next: ResonancePassage[];
        let minCount: number;
        if (idx === -1) {
          minCount = 1;
          next = [...prev, { passageId, count: minCount, selector }];
        } else if (bumpCount) {
          minCount = prev[idx].count + 1;
          next = prev.map((p, i) => (i === idx ? { ...p, count: minCount } : p));
        } else {
          // Repeat resonance: the count already includes the user, so the floor
          // is the existing count — don't add another.
          minCount = prev[idx].count;
          next = prev;
        }
        // Derived from prev inside the updater so the floor matches the count
        // the user sees; idempotent under StrictMode's double-invoked updater
        // (same prev → same minCount).
        optimisticRef.current.set(passageId, { selector, minCount });
        cache.set(moduleSlug, next);
        return next;
      });
      runFetch();
    },
    [moduleSlug, runFetch],
  );

  return { passages, loading, error, addLocalResonance };
}
