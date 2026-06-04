import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import TextSelectionHandler, { type SelectionData } from './TextSelectionHandler';
import ResonancePopup from './ResonancePopup';
import ResonanceTooltip from './ResonanceTooltip';
import {
  formatSelectionData,
  sendResonance,
  getResonatedPassageIds,
  markPassageResonated,
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

  useEffect(() => {
    setResonatedIds(getResonatedPassageIds());
  }, []);

  const { passages, addLocalResonance } = useResonanceData(moduleSlug);
  const matchesRef = useResonanceGlow(contentRef, passages, resonatedIds);
  const { tooltip, ariaLiveText } = useResonanceTooltip(contentRef, matchesRef, !!selection);

  const handleSelection = useCallback((newSelection: SelectionData | null) => {
    setSelection(newSelection);
  }, []);

  const handleResonance = useCallback(async (selectionData: SelectionData) => {
    const payload = await formatSelectionData(moduleSlug, selectionData);
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

    // Only bump the count when the server actually wrote a new entry. Local
    // history can be absent (pre-feature or cleared) while the fingerprint is
    // already counted server-side; trusting it would optimistically count an
    // increment that never happened, and the floor would then preserve it.
    addLocalResonance(payload.passage_id, { exact, prefix, suffix }, inserted);
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
