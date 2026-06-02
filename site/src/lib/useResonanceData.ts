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

// A passage the current user resonated with this session. We keep only the
// selector (for the glow), never an optimistic count: get-resonance returns
// aggregate counts with no per-fingerprint data, so the client can't tell
// whether a given server count already includes the user's own submission.
// Guessing a delta either over- or under-counts depending on read/write
// ordering, so instead we reconcile counts from an authoritative post-write
// refetch (see addLocalResonance) and use this only as a presence floor.
interface OptimisticAddition {
  selector: ResonancePassage['selector'];
}

// Apply a complete (authoritative) fetch result, keeping the user's
// just-resonated passages visible if the server doesn't list them yet (brief
// GitHub read-after-write lag): add a missing one at the glow's lowest tier.
// When the server already lists the passage its count is authoritative — the
// refetch was issued after the write persisted — so we leave it untouched. The
// count-1 floor is only safe here because a complete response can omit a
// passage solely when it's too new to have replicated (passages only ever
// grow), never because an existing count was dropped.
function withPresenceFloor(
  fetched: ResonancePassage[],
  optimistic: Map<string, OptimisticAddition>,
): ResonancePassage[] {
  if (optimistic.size === 0) return fetched;
  const byId = new Map(fetched.map((p) => [p.passageId, p]));
  for (const [id, local] of optimistic) {
    if (!byId.has(id)) {
      byId.set(id, { passageId: id, count: 1, selector: local.selector });
    }
  }
  return [...byId.values()];
}

// Apply a partial fetch result — one where get-resonance dropped passage files
// that failed to load and flagged the response partial. Those omissions are
// read failures, not removals (passages only grow), so we must not let them
// reset known counts: start from what we already had, overlay the passages this
// read did return (fresher), and floor any optimistic passage still missing.
function reconcilePartial(
  previous: ResonancePassage[],
  fetched: ResonancePassage[],
  optimistic: Map<string, OptimisticAddition>,
): ResonancePassage[] {
  const byId = new Map(previous.map((p) => [p.passageId, p]));
  for (const f of fetched) byId.set(f.passageId, f);
  for (const [id, local] of optimistic) {
    if (!byId.has(id)) {
      byId.set(id, { passageId: id, count: 1, selector: local.selector });
    }
  }
  return [...byId.values()];
}

export function useResonanceData(moduleSlug: string) {
  const [passages, setPassages] = useState<ResonancePassage[]>(
    () => cache.get(moduleSlug) ?? [],
  );
  const [loading, setLoading] = useState(!cache.has(moduleSlug));
  const [error, setError] = useState<Error | null>(null);
  // The current user's resonated passages for this module, used as a presence
  // floor on fetch results. Cleared on module change (entries are module-scoped,
  // and the cache already carries them forward for revisits).
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
            reconcilePartial(prev, mapped, optimisticRef.current),
          );
        } else {
          const merged = withPresenceFloor(mapped, optimisticRef.current);
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
  // count authoritatively. Because addLocalResonance runs only after the write
  // has persisted (sendResonance resolved), this refetch is guaranteed to read
  // the appended entry, so we can trust the server count outright instead of
  // adding a delta we couldn't reconcile against read/write ordering. It also
  // supersedes a still-pending mount fetch, whose pre-write count would
  // otherwise clobber the glow. `bumpCount` is false for a repeat resonance on
  // the same passage, so the interim count doesn't double up before the refetch.
  const addLocalResonance = useCallback(
    (
      passageId: string,
      selector: ResonancePassage['selector'],
      bumpCount: boolean,
    ) => {
      optimisticRef.current.set(passageId, { selector });
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
          next = prev;
        }
        cache.set(moduleSlug, next);
        return next;
      });
      runFetch();
    },
    [moduleSlug, runFetch],
  );

  return { passages, loading, error, addLocalResonance };
}
