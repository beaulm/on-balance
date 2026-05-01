import { useEffect, useRef, useState, useCallback, type RefObject } from 'react';
import type { MatchResult } from './useResonanceGlow';

interface TooltipState {
  count: number;
  rect: DOMRect;
}

function findMatchAtPoint(matches: MatchResult[], x: number, y: number): MatchResult | null {
  for (const match of matches) {
    try {
      const rects = match.range.getClientRects();
      for (const rect of rects) {
        if (x >= rect.left - 2 && x <= rect.right + 2 && y >= rect.top - 2 && y <= rect.bottom + 2) {
          return match;
        }
      }
    } catch {
      // Range may have become invalid
    }
  }
  return null;
}

export function useResonanceTooltip(
  containerRef: RefObject<HTMLDivElement | null>,
  matchesRef: RefObject<MatchResult[]>,
  isPopupVisible: boolean,
): { tooltip: TooltipState | null; ariaLiveText: string } {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [ariaLiveText, setAriaLiveText] = useState('');
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRangeRef = useRef<Range | null>(null);
  const rafRef = useRef<number | null>(null);

  const clearHoverTimeout = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  }, []);

  const hideTooltip = useCallback(() => {
    clearHoverTimeout();
    activeRangeRef.current = null;
    setTooltip(null);
    setAriaLiveText('');
    const container = containerRef.current;
    if (container) container.style.cursor = '';
  }, [clearHoverTimeout, containerRef]);

  const showTooltipForMatch = useCallback((match: MatchResult) => {
    activeRangeRef.current = match.range;
    const rect = match.range.getBoundingClientRect();
    setTooltip({ count: match.count, rect });
    const text = `${match.count} ${match.count === 1 ? 'person' : 'people'} resonated with this passage`;
    setAriaLiveText(text);
  }, []);

  // Suppress when popup is visible
  useEffect(() => {
    if (isPopupVisible) hideTooltip();
  }, [isPopupVisible, hideTooltip]);

  // Main event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (isPopupVisible) return;

      // Don't show tooltip while text is being selected
      const sel = window.getSelection();
      if (sel && !sel.isCollapsed) {
        hideTooltip();
        return;
      }

      // Throttle via requestAnimationFrame
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;

        const matches = matchesRef.current;
        if (matches.length === 0) return;

        const found = findMatchAtPoint(matches, e.clientX, e.clientY);

        if (found && found.range === activeRangeRef.current) {
          // Still hovering the same match
          return;
        }

        if (found) {
          // New match — start hover delay
          clearHoverTimeout();
          activeRangeRef.current = found.range;
          container.style.cursor = 'help';
          hoverTimeoutRef.current = setTimeout(() => {
            showTooltipForMatch(found);
          }, 300);
        } else if (activeRangeRef.current) {
          // Left highlighted area
          container.style.cursor = '';
          hideTooltip();
        }
      });
    };

    const handleMouseLeave = () => {
      container.style.cursor = '';
      hideTooltip();
    };

    // Keyboard: focus on mark elements (fallback path)
    const handleFocusIn = (e: FocusEvent) => {
      if (isPopupVisible) return;
      const target = e.target as HTMLElement;
      const countStr = target.getAttribute('data-resonance');
      if (countStr) {
        const count = parseInt(countStr, 10);
        if (!isNaN(count)) {
          const rect = target.getBoundingClientRect();
          activeRangeRef.current = null;
          setTooltip({ count, rect });
          const text = `${count} ${count === 1 ? 'person' : 'people'} resonated with this passage`;
          setAriaLiveText(text);
        }
      }
    };

    const handleFocusOut = () => {
      hideTooltip();
    };

    // Touch: defer tooltip to touchend so a synchronous React re-render
    // doesn't interrupt Chrome Mobile (Android)'s native long-press selection
    // when the touch starts inside an existing highlight (#89).
    let touchStartTime = 0;
    let touchStartMatch: MatchResult | null = null;
    let touchStartX = 0;
    let touchStartY = 0;
    let selectionChangedDuringTouch = false;
    const tapMaxDurationMs = 400;
    const moveThresholdPx = 10;

    const handleTouchStart = (e: TouchEvent) => {
      if (isPopupVisible) return;
      const touch = e.touches[0];
      if (!touch) return;
      const matches = matchesRef.current;

      touchStartTime = Date.now();
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      selectionChangedDuringTouch = false;
      touchStartMatch =
        matches.length > 0
          ? findMatchAtPoint(matches, touch.clientX, touch.clientY)
          : null;

      // Hide any visible tooltip when a touch starts outside a match.
      // Don't touch tooltip state when starting inside a match — that
      // re-render is what was breaking native selection on Chrome Mobile.
      if (!touchStartMatch) {
        hideTooltip();
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStartMatch) return;
      const touch = e.touches[0];
      if (!touch) return;
      const dx = touch.clientX - touchStartX;
      const dy = touch.clientY - touchStartY;
      // Movement past threshold means the user is scrolling/flicking, not
      // tapping — drop the pending match so touchend doesn't show a tooltip.
      if (dx * dx + dy * dy > moveThresholdPx * moveThresholdPx) {
        touchStartMatch = null;
      }
    };

    const handleTouchEnd = () => {
      if (touchStartTime === 0) return;
      const duration = Date.now() - touchStartTime;
      const match = touchStartMatch;
      touchStartTime = 0;
      touchStartMatch = null;

      // Skip tooltip on long-press or browser-initiated selection — the user
      // is selecting text, not requesting a count.
      if (!match) return;
      if (selectionChangedDuringTouch) return;
      if (duration > tapMaxDurationMs) return;
      if (isPopupVisible) return;

      showTooltipForMatch(match);
    };

    const handleTouchCancel = () => {
      touchStartTime = 0;
      touchStartMatch = null;
      selectionChangedDuringTouch = false;
    };

    const handleSelectionChangeDuringTouch = () => {
      if (touchStartTime > 0) {
        selectionChangedDuringTouch = true;
      }
    };

    // Dismiss on scroll
    const handleScroll = () => {
      // Cancel a pending tap-tooltip too, since scroll means the touch
      // turned into a flick.
      touchStartMatch = null;
      hideTooltip();
    };

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);
    container.addEventListener('focusin', handleFocusIn);
    container.addEventListener('focusout', handleFocusOut);
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    document.addEventListener('touchcancel', handleTouchCancel, { passive: true });
    document.addEventListener('selectionchange', handleSelectionChangeDuringTouch);
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
      container.removeEventListener('focusin', handleFocusIn);
      container.removeEventListener('focusout', handleFocusOut);
      container.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchCancel);
      document.removeEventListener('selectionchange', handleSelectionChangeDuringTouch);
      window.removeEventListener('scroll', handleScroll);
      container.style.cursor = '';
      clearHoverTimeout();
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [containerRef, matchesRef, isPopupVisible, clearHoverTimeout, hideTooltip, showTooltipForMatch]);

  // Touch: dismiss on tap outside container
  useEffect(() => {
    if (!tooltip) return;

    const handleDocumentTouch = (e: TouchEvent) => {
      const container = containerRef.current;
      if (container && !container.contains(e.target as Node)) {
        hideTooltip();
      }
    };

    document.addEventListener('touchstart', handleDocumentTouch, { passive: true });
    return () => document.removeEventListener('touchstart', handleDocumentTouch);
  }, [tooltip, containerRef, hideTooltip]);

  return { tooltip, ariaLiveText };
}
