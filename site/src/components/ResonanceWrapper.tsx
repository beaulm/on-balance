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
  userFingerprintStorageKey,
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
  // Latest passages, read inside the storage handler without making it a dep.
  const passagesRef = useRef(passages);
  passagesRef.current = passages;

  useEffect(() => {
    setResonatedIds(getResonatedPassageIds());

    // Sync when another tab records a resonance: localStorage is shared, but
    // this tab's resonatedIds state would otherwise stay stale until reload,
    // leaving an already-displayed passage labeled as someone else's. The
    // `storage` event fires only in other tabs, so this won't double-handle the
    // submitting tab. e.key is null on a full clear() — re-read in that case too.
    const retryTimers: ReturnType<typeof setTimeout>[] = [];
    const clearRetries = () => {
      for (const t of retryTimers) clearTimeout(t);
      retryTimers.length = 0;
    };

    const handleStorage = (e: StorageEvent) => {
      const key = e.key;
      // key === null means a full localStorage clear(); otherwise match either
      // of our two keys. The fingerprint key matters because othersCount /
      // youResonated are now computed relative to it.
      const fingerprintChanged = key === null || key === userFingerprintStorageKey();
      const resonatedChanged = key === null || key === resonatedStorageKey();
      if (!fingerprintChanged && !resonatedChanged) return;

      // Re-read ownership against the current fingerprint (which may itself have
      // just changed in another tab).
      const nextIds = getResonatedPassageIds();
      setResonatedIds((prev) =>
        nextIds.size === prev.size && [...nextIds].every((id) => prev.has(id))
          ? prev
          : nextIds,
      );

      clearRetries();

      // Identity changed in another tab (cleared/replaced): the passages we hold
      // were computed for the old fingerprint, so recompute othersCount /
      // youResonated. No GitHub write happened, so one refresh suffices — no
      // read-after-write lag to retry through.
      if (fingerprintChanged) {
        refresh();
        return;
      }

      // A resonated-id change only needs a fetch for a brand-new passage this
      // tab can't render locally (no selector); existing passages are already
      // correct (othersCount invariant, youResonated via the render-time OR).
      // Retry until the new passage is observed, backing off; skip if none are
      // missing, and ignore other modules' passages via the id prefix.
      const prefix = `${moduleSlug}-`;
      const hasMissing = () =>
        [...getResonatedPassageIds()].some(
          (id) =>
            id.startsWith(prefix) &&
            !passagesRef.current.some((p) => p.passageId === id),
        );
      let attempt = 0;
      const maxAttempts = 5;
      const tick = () => {
        if (!hasMissing()) return;
        refresh();
        attempt += 1;
        if (attempt >= maxAttempts) return;
        retryTimers.push(setTimeout(tick, 1000 * attempt));
      };
      tick();
    };
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      clearRetries();
    };
  }, [refresh, moduleSlug]);

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
