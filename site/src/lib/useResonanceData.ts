import { useState, useEffect } from 'react';

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

export function useResonanceData(moduleSlug: string) {
  const [passages, setPassages] = useState<ResonancePassage[]>(
    () => cache.get(moduleSlug) ?? [],
  );
  const [loading, setLoading] = useState(!cache.has(moduleSlug));
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (cache.has(moduleSlug)) return;

    const controller = new AbortController();

    async function fetchData() {
      try {
        const res = await fetch(
          `/.netlify/functions/get-resonance?module=${encodeURIComponent(moduleSlug)}`,
          { signal: controller.signal },
        );

        if (!res.ok) {
          throw new Error(`Failed to fetch resonance data: ${res.status}`);
        }

        const data = (await res.json()) as ApiResponse;
        const mapped: ResonancePassage[] = data.passages.map((p) => ({
          passageId: p.passage_id,
          count: p.count,
          selector: p.selector,
        }));

        cache.set(moduleSlug, mapped);
        setPassages(mapped);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('[Resonance] Failed to load data:', err);
          setError(err as Error);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchData();
    return () => controller.abort();
  }, [moduleSlug]);

  return { passages, loading, error };
}
