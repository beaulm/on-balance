import { useState, useEffect, useCallback, useRef } from 'react';
import { logResonanceFailure, getUserFingerprint } from './resonance';

export interface ResonancePassage {
  passageId: string;
  // Distinct resonators excluding the current user (server-authoritative).
  // Invariant under the user's own resonance, so the client never infers it.
  othersCount: number;
  // Whether the server's data shows the current user resonated. The reader ORs
  // this with the local floor (see useResonanceGlow) to bridge write lag.
  youResonated: boolean;
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
    othersCount: number;
    youResonated: boolean;
    selector: {
      exact: string;
      prefix: string;
      suffix: string;
    };
  }>;
}

// Module-level cache to avoid refetching on re-renders
const cache = new Map<string, ResonancePassage[]>();

// A passage the current user resonated with this session. We keep only the
// selector — never an optimistic count. othersCount is server-authoritative and
// unaffected by the user's own resonance, and youResonated is OR'd with the
// local floor at render, so the only thing the optimistic state must guarantee
// is that a brand-new passage stays visible until the server returns it.
interface OptimisticAddition {
  selector: ResonancePassage['selector'];
}

// Keep the user's just-resonated passages visible if the server doesn't list
// them yet (brief read-after-write lag for a brand-new passage): add a missing
// one at othersCount 0 / youResonated true ("You resonated with this"). A
// passage the server *does* return keeps its authoritative othersCount.
function applyPresenceFloor(
  passages: ResonancePassage[],
  optimistic: Map<string, OptimisticAddition>,
): ResonancePassage[] {
  if (optimistic.size === 0) return passages;
  const byId = new Map(passages.map((p) => [p.passageId, p]));
  for (const [id, local] of optimistic) {
    if (!byId.has(id)) {
      byId.set(id, { passageId: id, othersCount: 0, youResonated: true, selector: local.selector });
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
  // The current user's resonated passages for this module, used only as a
  // presence floor on fetch results. Cleared on module change (entries are
  // module-scoped, and the cache already carries them forward for revisits).
  const optimisticRef = useRef<Map<string, OptimisticAddition>>(new Map());
  const controllerRef = useRef<AbortController | null>(null);
  // Monotonic id so a slow earlier request can't apply over a newer one.
  const fetchSeqRef = useRef(0);

  // `reset` is for an identity change (the fingerprint changed in another tab):
  // the data we hold was computed for the old fingerprint, so drop it instead of
  // preserving it. Without this, a partial response would overlay onto — and
  // keep — old-identity othersCount/youResonated for any file it omitted.
  const runFetch = useCallback((reset = false) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const seq = ++fetchSeqRef.current;
    const isLatest = () => seq === fetchSeqRef.current;

    if (reset) {
      // Old-identity local state must not survive into the new identity's view.
      optimisticRef.current = new Map();
      cache.delete(moduleSlug);
    }

    setLoading(true);
    setError(null);

    (async () => {
      try {
        // Send the fingerprint so the server can report othersCount/youResonated
        // for this caller. If localStorage is blocked (privacy settings),
        // getUserFingerprint throws — fall back to an anonymous fetch so the
        // public community highlights still load; only the personal "You
        // resonated" label is unavailable.
        let fp: string | null = null;
        try {
          fp = getUserFingerprint();
        } catch {
          // anonymous view (no fp)
        }
        const query = fp
          ? `module=${encodeURIComponent(moduleSlug)}&fp=${encodeURIComponent(fp)}`
          : `module=${encodeURIComponent(moduleSlug)}`;
        const res = await fetch(
          `/.netlify/functions/get-resonance?${query}`,
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
          othersCount: p.othersCount,
          youResonated: p.youResonated,
          selector: p.selector,
        }));
        // A superseded request must not apply its (older) result or poison the
        // cache, even though its fetch wasn't aborted in time.
        if (!isLatest()) return;

        if (reset) {
          // Replace wholesale — never preserve previous (old-identity) passages,
          // even on a partial response. A file the partial omits simply
          // reappears on the next complete fetch instead of lingering with stale
          // othersCount/youResonated for the old fingerprint.
          const merged = applyPresenceFloor(mapped, optimisticRef.current);
          if (!data.partial) cache.set(moduleSlug, merged);
          setPassages(merged);
        } else if (data.partial) {
          // Don't cache an incomplete view, and don't let dropped files drop a
          // known passage; keep previously known ones and overlay what we read.
          setPassages((prev) =>
            applyPresenceFloor(overlayPartial(prev, mapped), optimisticRef.current),
          );
        } else {
          const merged = applyPresenceFloor(mapped, optimisticRef.current);
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

    // A module change must invalidate any request still in flight for the
    // previous module so it can't resolve and overwrite this module's data.
    // runFetch does this for the fetched branch below, but the cached branch
    // returns early without it. The seq bump matters as much as the abort: a
    // request that already resolved past its abort check would still pass
    // isLatest() and apply its (now wrong-module) result.
    controllerRef.current?.abort();
    fetchSeqRef.current++;

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

  // Reflect a resonance the current user just submitted. othersCount is
  // unaffected by the user's own resonance and youResonated is OR'd with the
  // local floor at render, so there's no count to bump here: we only ensure a
  // brand-new passage is present so it can glow immediately, then refetch to
  // pick up the authoritative selector/othersCount (and confirm youResonated).
  const addLocalResonance = useCallback(
    (passageId: string, selector: ResonancePassage['selector']) => {
      setPassages((prev) => {
        optimisticRef.current.set(passageId, { selector });
        if (prev.some((p) => p.passageId === passageId)) {
          // Already displayed — nothing to change (its othersCount stays, and
          // youResonated flips via the local floor at render).
          return prev;
        }
        const next: ResonancePassage[] = [
          ...prev,
          { passageId, othersCount: 0, youResonated: true, selector },
        ];
        cache.set(moduleSlug, next);
        return next;
      });
      runFetch();
    },
    [moduleSlug, runFetch],
  );

  return { passages, loading, error, addLocalResonance, refresh: runFetch };
}
