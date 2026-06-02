import { useLayoutEffect, useRef, useState } from 'react';
import { resonancePhrase } from '../lib/resonance';

interface ResonanceTooltipProps {
  count: number;
  youResonated: boolean;
  rect: DOMRect;
}

const MARGIN = 8;
const ARROW_SIZE = 6;
// Cap the width so long labels ("You and N other people resonated") wrap to a
// second line instead of running off a narrow viewport. Stays within the
// viewport on small screens via the calc().
const MAX_WIDTH = 'min(260px, calc(100vw - 16px))';

interface Placement {
  top: number;
  left: number;
  arrowLeft: number;
  showAbove: boolean;
}

export default function ResonanceTooltip({ count, youResonated, rect }: ResonanceTooltipProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<Placement | null>(null);

  const label = resonancePhrase(count, youResonated, 'here');

  // Position from the *rendered* size (which depends on label length, wrapping,
  // and the viewport-relative max-width) rather than hardcoded dimensions, so
  // the box never runs off-screen and the arrow stays pointed at the passage.
  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box) return;

    const { width, height } = box.getBoundingClientRect();
    const viewportWidth = window.innerWidth;

    const showAbove = rect.top > height + MARGIN + ARROW_SIZE;
    const top = showAbove ? rect.top - height - MARGIN : rect.bottom + MARGIN;

    let left = rect.left + rect.width / 2 - width / 2;
    left = Math.max(MARGIN, Math.min(left, viewportWidth - width - MARGIN));

    // Arrow points at the passage center, relative to the tooltip's left edge.
    const passageCenter = rect.left + rect.width / 2;
    const arrowLeft = Math.max(
      ARROW_SIZE + 4,
      Math.min(passageCenter - left, width - ARROW_SIZE - 4),
    );

    setPlacement({ top, left, arrowLeft, showAbove });
  }, [rect, label]);

  const showAbove = placement?.showAbove ?? true;

  return (
    <div
      role="tooltip"
      style={{
        position: 'fixed',
        top: placement?.top ?? 0,
        left: placement?.left ?? 0,
        zIndex: 999,
        pointerEvents: 'none',
        // Hide until measured so the pre-placement render doesn't flash at 0,0.
        visibility: placement ? 'visible' : 'hidden',
        animation: placement ? 'resonanceTooltipFadeIn 0.15s ease-out' : 'none',
      }}
    >
      <style>{`
        @keyframes resonanceTooltipFadeIn {
          from { opacity: 0; transform: translateY(${showAbove ? '4px' : '-4px'}); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div
        ref={boxRef}
        style={{
          position: 'relative',
          maxWidth: MAX_WIDTH,
          background: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '6px 10px',
          borderRadius: '4px',
          fontSize: '14px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          textAlign: 'center',
          // Allow wrapping for long labels, but don't break mid-word.
          whiteSpace: 'normal',
          overflowWrap: 'break-word',
        }}
      >
        {label}
        <div
          style={{
            position: 'absolute',
            left: placement?.arrowLeft ?? 0,
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            ...(showAbove
              ? {
                  bottom: -ARROW_SIZE,
                  borderLeft: `${ARROW_SIZE}px solid transparent`,
                  borderRight: `${ARROW_SIZE}px solid transparent`,
                  borderTop: `${ARROW_SIZE}px solid rgba(0, 0, 0, 0.8)`,
                }
              : {
                  top: -ARROW_SIZE,
                  borderLeft: `${ARROW_SIZE}px solid transparent`,
                  borderRight: `${ARROW_SIZE}px solid transparent`,
                  borderBottom: `${ARROW_SIZE}px solid rgba(0, 0, 0, 0.8)`,
                }),
          }}
        />
      </div>
    </div>
  );
}
