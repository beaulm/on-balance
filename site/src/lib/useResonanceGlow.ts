import { useEffect, useRef, type RefObject } from 'react';
import { findTextInDOM } from './textMatcher';
import { resonancePhrase } from './resonance';
import type { ResonancePassage } from './useResonanceData';

export interface MatchResult {
  range: Range;
  passageId: string;
  othersCount: number;
  youResonated: boolean;
}

// Total distinct resonators, for glow intensity: others plus the user if they
// resonated. othersCount and youResonated are kept separate (rather than a
// single total) so the tooltip can phrase "You and N other people" exactly.
function totalCount(m: { othersCount: number; youResonated: boolean }): number {
  return m.othersCount + (m.youResonated ? 1 : 0);
}

function getGlowTier(count: number): 'low' | 'medium' | 'strong' {
  if (count >= 10) return 'strong';
  if (count >= 3) return 'medium';
  return 'low';
}

function applyHighlightAPI(matches: MatchResult[]): void {
  const tiers: Record<string, Range[]> = { low: [], medium: [], strong: [] };

  for (const match of matches) {
    tiers[getGlowTier(totalCount(match))].push(match.range);
  }

  for (const [tier, ranges] of Object.entries(tiers)) {
    const name = `resonance-${tier}`;
    if (ranges.length > 0) {
      CSS.highlights.set(name, new Highlight(...ranges));
    }
  }
}

function applyMarkFallback(matches: MatchResult[]): MatchResult[] {
  const applied = new Set<MatchResult>();

  // Process in reverse document order to avoid offset shifts
  const sorted = [...matches].sort((a, b) => {
    const posA = a.range.compareBoundaryPoints(Range.START_TO_START, b.range);
    return -posA; // reverse order
  });

  for (const match of sorted) {
    const total = totalCount(match);
    const opacity = total >= 10 ? 0.3 : total >= 3 ? 0.2 : 0.1;
    try {
      const mark = document.createElement('mark');
      mark.setAttribute('data-others-count', String(match.othersCount));
      mark.setAttribute('data-you-resonated', match.youResonated ? 'true' : 'false');
      mark.setAttribute('tabindex', '0');
      mark.setAttribute('aria-label', resonancePhrase(match.othersCount, match.youResonated));
      mark.style.setProperty('--resonance-opacity', String(opacity));
      match.range.surroundContents(mark);
      applied.add(match);
    } catch {
      // surroundContents fails if range spans multiple elements — skip gracefully
    }
  }

  return matches.filter((m) => applied.has(m));
}

function clearHighlightAPI(): void {
  if ('highlights' in CSS) {
    CSS.highlights.delete('resonance-low');
    CSS.highlights.delete('resonance-medium');
    CSS.highlights.delete('resonance-strong');
  }
}

function clearMarkFallback(container: HTMLElement): void {
  const marks = container.querySelectorAll('mark[data-others-count]');
  for (const mark of marks) {
    const parent = mark.parentNode;
    if (!parent) continue;
    while (mark.firstChild) {
      parent.insertBefore(mark.firstChild, mark);
    }
    parent.removeChild(mark);
    parent.normalize();
  }
}

export function useResonanceGlow(
  containerRef: RefObject<HTMLDivElement | null>,
  passages: ResonancePassage[],
  resonatedIds: Set<string>,
): RefObject<MatchResult[]> {
  const matchesRef = useRef<MatchResult[]>([]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || passages.length === 0) {
      matchesRef.current = [];
      return;
    }

    const useHighlightAPI = 'highlights' in CSS;

    // Match passages to DOM ranges
    const matches: MatchResult[] = [];
    for (const passage of passages) {
      const range = findTextInDOM(container, passage.selector);
      if (range) {
        matches.push({
          range,
          passageId: passage.passageId,
          othersCount: passage.othersCount,
          // OR the server flag with the local floor: localStorage knows the user
          // resonated even when a stale read or another tab's write hasn't been
          // reflected in this fetch yet.
          youResonated: passage.youResonated || resonatedIds.has(passage.passageId),
        });
      }
    }

    if (matches.length === 0) {
      matchesRef.current = [];
      return;
    }

    if (useHighlightAPI) {
      applyHighlightAPI(matches);
      matchesRef.current = matches;
    } else {
      matchesRef.current = applyMarkFallback(matches);
    }

    return () => {
      matchesRef.current = [];
      if (useHighlightAPI) {
        clearHighlightAPI();
      } else if (container) {
        clearMarkFallback(container);
      }
    };
  }, [containerRef, passages, resonatedIds]);

  return matchesRef;
}
