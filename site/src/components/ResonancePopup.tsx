import { useEffect, useRef, useState, useCallback } from 'react';
import type { SelectionData } from './TextSelectionHandler';

interface ResonancePopupProps {
  selection: SelectionData | null;
  onResonance: (selection: SelectionData) => void;
  onDismiss: () => void;
}

type SubmitState = 'idle' | 'submitting' | 'success' | 'error';

export default function ResonancePopup({
  selection,
  onResonance,
  onDismiss,
}: ResonancePopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dismissTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [showAbove, setShowAbove] = useState(true);

  // Clean up timeouts on unmount or selection change
  useEffect(() => {
    return () => {
      if (dismissTimeoutRef.current) clearTimeout(dismissTimeoutRef.current);
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    };
  }, [selection]);

  // Calculate popup position when selection changes
  useEffect(() => {
    // Clear any pending timeouts when selection changes
    if (dismissTimeoutRef.current) clearTimeout(dismissTimeoutRef.current);
    if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);

    // Reset state for each new selection (including when selection becomes null)
    setSubmitState('idle');

    if (!selection) {
      setPosition(null);
      return;
    }

    const { rect } = selection;
    const popupHeight = 48; // Approximate popup height
    const popupWidth = 140; // Approximate popup width
    const margin = 8;
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    // Detect mobile/touch device - native selection UI appears above on mobile,
    // so we prefer showing our popup below to avoid overlap
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isMobileWidth = viewportWidth < 768;
    const preferBelow = isTouchDevice || isMobileWidth;

    // Check if there's room above/below the selection
    // rect is already in viewport coordinates (for position: fixed)
    const spaceAbove = rect.top;
    const spaceBelow = viewportHeight - rect.bottom;

    let above: boolean;
    if (preferBelow) {
      // On mobile, prefer below unless there's really no room
      above = spaceBelow < popupHeight + margin && spaceAbove > popupHeight + margin;
    } else {
      // On desktop, prefer above if there's room
      above = spaceAbove > popupHeight + margin || spaceAbove > spaceBelow;
    }
    setShowAbove(above);

    // Calculate top position
    let top: number;
    if (above) {
      top = rect.top - popupHeight - margin;
    } else {
      top = rect.bottom + margin;
    }

    // Calculate left position (center on selection, but keep on screen)
    let left = rect.left + rect.width / 2 - popupWidth / 2;
    left = Math.max(margin, Math.min(left, viewportWidth - popupWidth - margin));

    setPosition({ top, left });
  }, [selection]);

  // Note: We intentionally don't auto-focus the button because that clears
  // the browser's text selection, which users need to see what they selected
  // and to copy text. Users can Tab to the button for keyboard access.

  // Handle resonance button click
  const handleResonance = useCallback(async () => {
    if (!selection || submitState === 'submitting') return;

    // Clear any existing timeouts
    if (dismissTimeoutRef.current) clearTimeout(dismissTimeoutRef.current);
    if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);

    setSubmitState('submitting');

    try {
      // For now, just call the callback - actual submission will be in later issues
      onResonance(selection);
      setSubmitState('success');

      // Auto-dismiss after success (timeout cleaned up on unmount)
      dismissTimeoutRef.current = setTimeout(() => {
        onDismiss();
      }, 800);
    } catch {
      setSubmitState('error');
      // Reset after error (timeout cleaned up on unmount)
      errorTimeoutRef.current = setTimeout(() => {
        setSubmitState('idle');
      }, 2000);
    }
  }, [selection, submitState, onResonance, onDismiss]);

  // Handle click outside to dismiss (left-click only, not right-click for context menu)
  useEffect(() => {
    if (!selection) return;

    const handleClickOutside = (e: MouseEvent) => {
      // Only dismiss on left-click (button 0), ignore right-click (button 2) for context menu
      if (e.button !== 0) return;
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onDismiss();
      }
    };

    // Delay adding listener to avoid immediate dismiss from the selection click
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [selection, onDismiss]);

  // Handle keyboard shortcuts: Escape to dismiss, Enter to submit
  useEffect(() => {
    if (!selection) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onDismiss();
      } else if (e.key === 'Enter' && submitState === 'idle') {
        e.preventDefault();
        handleResonance();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selection, onDismiss, submitState, handleResonance]);

  // Don't render if no selection or no position calculated
  if (!selection || !position) {
    return null;
  }

  const buttonLabel = {
    idle: '👍 Resonates',
    submitting: 'Saving...',
    success: '✓ Saved',
    error: 'Error - try again',
  }[submitState];

  return (
    <div
      ref={popupRef}
      role="dialog"
      aria-label="Resonance feedback"
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        zIndex: 1000,
        animation: 'resonancePopupFadeIn 0.15s ease-out',
      }}
    >
      <style>{`
        @keyframes resonancePopupFadeIn {
          from {
            opacity: 0;
            transform: translateY(${showAbove ? '4px' : '-4px'});
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
      <div
        style={{
          background: 'white',
          border: '1px solid #ddd',
          borderRadius: '6px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
          padding: '4px',
        }}
      >
        {/* Arrow pointing to selection */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            ...(showAbove
              ? {
                  bottom: '-6px',
                  borderLeft: '6px solid transparent',
                  borderRight: '6px solid transparent',
                  borderTop: '6px solid #ddd',
                }
              : {
                  top: '-6px',
                  borderLeft: '6px solid transparent',
                  borderRight: '6px solid transparent',
                  borderBottom: '6px solid #ddd',
                }),
            width: 0,
            height: 0,
          }}
        />
        {/* Arrow inner (white fill) */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            ...(showAbove
              ? {
                  bottom: '-5px',
                  borderLeft: '5px solid transparent',
                  borderRight: '5px solid transparent',
                  borderTop: '5px solid white',
                }
              : {
                  top: '-5px',
                  borderLeft: '5px solid transparent',
                  borderRight: '5px solid transparent',
                  borderBottom: '5px solid white',
                }),
            width: 0,
            height: 0,
          }}
        />
        <button
          ref={buttonRef}
          onClick={handleResonance}
          disabled={submitState === 'submitting' || submitState === 'success'}
          aria-label="Mark this text as resonating with you"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '10px 16px',
            fontSize: '14px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            color: submitState === 'success' ? '#16a34a' : submitState === 'error' ? '#dc2626' : '#333',
            background: submitState === 'success' ? '#f0fdf4' : 'transparent',
            border: 'none',
            borderRadius: '4px',
            cursor: submitState === 'submitting' || submitState === 'success' ? 'default' : 'pointer',
            minWidth: '120px',
            minHeight: '44px', // Touch-friendly target size
            justifyContent: 'center',
            transition: 'background-color 0.15s, color 0.15s',
          }}
          onMouseEnter={(e) => {
            if (submitState === 'idle') {
              e.currentTarget.style.backgroundColor = '#f5f5f5';
            }
          }}
          onMouseLeave={(e) => {
            if (submitState === 'idle') {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}
