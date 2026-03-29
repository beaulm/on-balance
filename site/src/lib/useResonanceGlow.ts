import { useEffect, useRef, type RefObject } from 'react';
import { findTextInDOM } from './textMatcher';
import type { ResonancePassage } from './useResonanceData';

export interface MatchResult {
  range: Range;
  count: number;
}

function getGlowTier(count: number): 'low' | 'medium' | 'strong' {
  if (count >= 10) return 'strong';
  if (count >= 3) return 'medium';
  return 'low';
}

function applyHighlightAPI(matches: MatchResult[]): void {
  const tiers: Record<string, Range[]> = { low: [], medium: [], strong: [] };

  for (const match of matches) {
    tiers[getGlowTier(match.count)].push(match.range);
  }

  for (const [tier, ranges] of Object.entries(tiers)) {
    const name = `resonance-${tier}`;
    if (ranges.length > 0) {
      CSS.highlights.set(name, new Highlight(...ranges));
    }
  }
}

function applyMarkFallback(matches: MatchResult[]): void {
  // Process in reverse document order to avoid offset shifts
  const sorted = [...matches].sort((a, b) => {
    const posA = a.range.compareBoundaryPoints(Range.START_TO_START, b.range);
    return -posA; // reverse order
  });

  for (const match of sorted) {
    const opacity = match.count >= 10 ? 0.3 : match.count >= 3 ? 0.2 : 0.1;
    try {
      const mark = document.createElement('mark');
      mark.setAttribute('data-resonance', String(match.count));
      mark.setAttribute('tabindex', '0');
      mark.setAttribute('aria-label',
        `${match.count} ${match.count === 1 ? 'person' : 'people'} resonated with this passage`,
      );
      mark.style.setProperty('--resonance-opacity', String(opacity));
      match.range.surroundContents(mark);
    } catch {
      // surroundContents fails if range spans multiple elements — skip gracefully
    }
  }
}

function clearHighlightAPI(): void {
  if ('highlights' in CSS) {
    CSS.highlights.delete('resonance-low');
    CSS.highlights.delete('resonance-medium');
    CSS.highlights.delete('resonance-strong');
  }
}

function clearMarkFallback(container: HTMLElement): void {
  const marks = container.querySelectorAll('mark[data-resonance]');
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
        matches.push({ range, count: passage.count });
      }
    }

    if (matches.length === 0) {
      matchesRef.current = [];
      return;
    }

    matchesRef.current = matches;

    if (useHighlightAPI) {
      applyHighlightAPI(matches);
    } else {
      applyMarkFallback(matches);
    }

    return () => {
      matchesRef.current = [];
      if (useHighlightAPI) {
        clearHighlightAPI();
      } else if (container) {
        clearMarkFallback(container);
      }
    };
  }, [containerRef, passages]);

  return matchesRef;
}
