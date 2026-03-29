interface ResonanceTooltipProps {
  count: number;
  rect: DOMRect;
}

export default function ResonanceTooltip({ count, rect }: ResonanceTooltipProps) {
  const tooltipHeight = 32;
  const tooltipWidth = 180;
  const margin = 8;
  const arrowSize = 6;
  const viewportWidth = window.innerWidth;

  const showAbove = rect.top > tooltipHeight + margin + arrowSize;

  let top: number;
  if (showAbove) {
    top = rect.top - tooltipHeight - margin;
  } else {
    top = rect.bottom + margin;
  }

  let left = rect.left + rect.width / 2 - tooltipWidth / 2;
  left = Math.max(margin, Math.min(left, viewportWidth - tooltipWidth - margin));

  // Arrow should point at the center of the passage, relative to tooltip left edge
  const passageCenter = rect.left + rect.width / 2;
  const arrowLeft = Math.max(
    arrowSize + 4,
    Math.min(passageCenter - left, tooltipWidth - arrowSize - 4),
  );

  const label = count === 1 ? '1 person resonated here' : `${count} people resonated here`;

  return (
    <div
      role="tooltip"
      style={{
        position: 'fixed',
        top,
        left,
        zIndex: 999,
        pointerEvents: 'none',
        animation: 'resonanceTooltipFadeIn 0.15s ease-out',
      }}
    >
      <style>{`
        @keyframes resonanceTooltipFadeIn {
          from { opacity: 0; transform: translateY(${showAbove ? '4px' : '-4px'}); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div
        style={{
          position: 'relative',
          background: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '6px 10px',
          borderRadius: '4px',
          fontSize: '14px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
        <div
          style={{
            position: 'absolute',
            left: arrowLeft,
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            ...(showAbove
              ? {
                  bottom: -arrowSize,
                  borderLeft: `${arrowSize}px solid transparent`,
                  borderRight: `${arrowSize}px solid transparent`,
                  borderTop: `${arrowSize}px solid rgba(0, 0, 0, 0.8)`,
                }
              : {
                  top: -arrowSize,
                  borderLeft: `${arrowSize}px solid transparent`,
                  borderRight: `${arrowSize}px solid transparent`,
                  borderBottom: `${arrowSize}px solid rgba(0, 0, 0, 0.8)`,
                }),
          }}
        />
      </div>
    </div>
  );
}
