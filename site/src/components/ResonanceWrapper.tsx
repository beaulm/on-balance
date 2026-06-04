import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import TextSelectionHandler, { type SelectionData } from './TextSelectionHandler';
import ResonancePopup from './ResonancePopup';
import ResonanceTooltip from './ResonanceTooltip';
import {
  formatSelectionData,
  sendResonance,
  getResonatedPassageIds,
  markPassageResonated,
  resonatedStorageKey,
} from '../lib/resonance';
import { useResonanceData } from '../lib/useResonanceData';
import { useResonanceGlow } from '../lib/useResonanceGlow';
import { useResonanceTooltip } from '../lib/useResonanceTooltip';

interface ResonanceWrapperProps {
  children: ReactNode;
  moduleSlug: string;
}

export default function ResonanceWrapper({ children, moduleSlug }: ResonanceWrapperProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<SelectionData | null>(null);
  // Passage IDs the current user has resonated with. Empty on first render so
  // SSR/hydration match; loaded from localStorage on mount.
  const [resonatedIds, setResonatedIds] = useState<Set<string>>(() => new Set());

  const { passages, addLocalResonance, refresh } = useResonanceData(moduleSlug);

  useEffect(() => {
    setResonatedIds(getResonatedPassageIds());

    // Sync when another tab records a resonance: localStorage is shared, but
    // this tab's resonatedIds state would otherwise stay stale until reload,
    // leaving an already-displayed passage labeled as someone else's. The
    // `storage` event fires only in other tabs, so this won't double-handle the
    // submitting tab. e.key is null on a full clear() — re-read in that case too.
    const handleStorage = (e: StorageEvent) => {
      if (e.key !== null && e.key !== resonatedStorageKey()) return;
      const nextIds = getResonatedPassageIds();
      setResonatedIds((prev) =>
        nextIds.size === prev.size && [...nextIds].every((id) => prev.has(id))
          ? prev
          : nextIds,
      );
      // Another tab changed who resonated — refresh the data so this tab's
      // counts reflect the new total (and any newly-resonated passage appears),
      // not just the ownership label. This tab didn't submit, so its optimistic
      // floor is empty and the authoritative server counts apply directly.
      refresh();
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [refresh]);

  const matchesRef = useResonanceGlow(contentRef, passages, resonatedIds);
  const { tooltip, ariaLiveText } = useResonanceTooltip(contentRef, matchesRef, !!selection);

  const handleSelection = useCallback((newSelection: SelectionData | null) => {
    setSelection(newSelection);
  }, []);

  const handleResonance = useCallback(async (selectionData: SelectionData) => {
    const payload = await formatSelectionData(moduleSlug, selectionData);
    await sendResonance(payload);
    const { exact, prefix, suffix } = payload.selector;

    // Mark this passage as the user's own so the glow reads "You resonated" —
    // true even when the server deduped or another tab recorded it first. There
    // is no count to adjust: othersCount is unaffected by the user's own
    // resonance, and the glow ORs youResonated with this local floor at render.
    // The has() check just avoids a no-op re-render.
    markPassageResonated(payload.passage_id);
    setResonatedIds((prev) => {
      if (prev.has(payload.passage_id)) return prev;
      const next = new Set(prev);
      next.add(payload.passage_id);
      return next;
    });

    // Ensure a brand-new passage is present so it glows immediately; the refetch
    // inside reconciles the authoritative selector/othersCount.
    addLocalResonance(payload.passage_id, { exact, prefix, suffix });
  }, [moduleSlug, addLocalResonance]);

  const handleDismiss = useCallback(() => {
    setSelection(null);
    // Clear the browser's text selection
    window.getSelection()?.removeAllRanges();
  }, []);

  return (
    <div ref={contentRef}>
      <TextSelectionHandler onSelection={handleSelection}>
        {children}
      </TextSelectionHandler>
      <ResonancePopup
        key={selection ? `${selection.startOffset}-${selection.endOffset}` : 'none'}
        selection={selection}
        onResonance={handleResonance}
        onDismiss={handleDismiss}
      />
      {tooltip && (
        <ResonanceTooltip
          othersCount={tooltip.othersCount}
          youResonated={tooltip.youResonated}
          rect={tooltip.rect}
        />
      )}
      <div
        aria-live="polite"
        role="status"
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
        }}
      >
        {ariaLiveText}
      </div>
    </div>
  );
}
