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
    // Snapshot the displayed count before the write — the others-count, since
    // no write has happened yet (a pre-existing self-resonance is handled by
    // inserted=false below). Deriving the floor from this snapshot, rather than
    // from a post-await prev that a concurrent fetch may have already advanced,
    // keeps the optimistic +1 from double-counting an insertion already in view.
    const baseCount =
      passages.find((p) => p.passageId === payload.passage_id)?.count ?? 0;
    const { inserted } = await sendResonance(payload);
    const { exact, prefix, suffix } = payload.selector;

    // Persist locally and mark this passage as the user's own, so the glow is
    // labeled "You resonated". Add it unconditionally rather than only when
    // markPassageResonated reports a new write: another tab may have already
    // recorded it (shared localStorage), leaving this tab's resonatedIds state
    // stale, and gating on the storage result would then mislabel the user's
    // own glow as someone else's. The has() check just avoids a no-op re-render.
    markPassageResonated(payload.passage_id);
    setResonatedIds((prev) => {
      if (prev.has(payload.passage_id)) return prev;
      const next = new Set(prev);
      next.add(payload.passage_id);
      return next;
    });

    // The observed-count floor: the pre-write snapshot plus the user's own entry
    // only if the server actually inserted one (false for a repeat or
    // pre-feature resonance the server already had). Floored at 1 since the user
    // is now a resonator regardless; the post-write refetch reconciles the rest.
    const observedCount = Math.max(1, baseCount + (inserted ? 1 : 0));
    addLocalResonance(payload.passage_id, { exact, prefix, suffix }, observedCount);
  }, [moduleSlug, passages, addLocalResonance]);

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
          count={tooltip.count}
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
