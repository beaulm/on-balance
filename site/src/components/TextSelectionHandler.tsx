import { useEffect, useRef, useCallback, type ReactNode } from 'react';

export interface SelectionRect {
  top: number;
  left: number;
  bottom: number;
  right: number;
  width: number;
  height: number;
}

export interface SelectionData {
  exact: string;
  prefix: string;
  suffix: string;
  startOffset: number;
  endOffset: number;
  rect: SelectionRect;
}

interface TextSelectionHandlerProps {
  children: ReactNode;
  onSelection?: (selection: SelectionData | null) => void;
  contextLength?: number;
}

/**
 * Calculates the character offset of a point within a container element.
 * Uses Range API to handle both Text nodes (offset = character position)
 * and Element nodes (offset = child index, happens at selection boundaries).
 */
function getAbsoluteOffset(container: Element, node: Node, offset: number): number {
  try {
    const range = document.createRange();
    range.selectNodeContents(container);
    range.setEnd(node, offset);
    return range.toString().length;
  } catch {
    // Fallback if range creation fails (e.g., node not in container)
    return 0;
  }
}

/**
 * Extracts all text content from an element.
 */
function getTextContent(element: Element): string {
  return element.textContent || '';
}

/**
 * Gets context (prefix/suffix) around a selection.
 */
function getContext(
  fullText: string,
  startOffset: number,
  endOffset: number,
  contextLength: number
): { prefix: string; suffix: string } {
  const prefixStart = Math.max(0, startOffset - contextLength);
  const suffixEnd = Math.min(fullText.length, endOffset + contextLength);

  const prefix = fullText.slice(prefixStart, startOffset);
  const suffix = fullText.slice(endOffset, suffixEnd);

  return { prefix, suffix };
}

export default function TextSelectionHandler({
  children,
  onSelection,
  contextLength = 50,
}: TextSelectionHandlerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastSelectionRef = useRef<{ startOffset: number; endOffset: number } | null>(null);

  const handleSelectionChange = useCallback(() => {
    const selection = window.getSelection();

    // Check for empty or collapsed selection
    if (!selection || selection.isCollapsed || !selection.rangeCount) {
      if (lastSelectionRef.current !== null) {
        lastSelectionRef.current = null;
        onSelection?.(null);
      }
      return;
    }

    const range = selection.getRangeAt(0);
    const container = containerRef.current;

    if (!container) {
      return;
    }

    // Verify selection is within our container
    if (!container.contains(range.commonAncestorContainer)) {
      return;
    }

    const rawSelectedText = selection.toString();
    const trimmedText = rawSelectedText.trim();

    // Ignore empty/whitespace-only selections
    if (!trimmedText) {
      if (lastSelectionRef.current !== null) {
        lastSelectionRef.current = null;
        onSelection?.(null);
      }
      return;
    }

    // Calculate absolute offsets within the container
    const rawStartOffset = getAbsoluteOffset(container, range.startContainer, range.startOffset);
    const rawEndOffset = getAbsoluteOffset(container, range.endContainer, range.endOffset);

    // Adjust offsets to account for trimmed whitespace so exact matches substring at offsets
    const leadingWhitespace = rawSelectedText.length - rawSelectedText.trimStart().length;
    const trailingWhitespace = rawSelectedText.length - rawSelectedText.trimEnd().length;
    const startOffset = rawStartOffset + leadingWhitespace;
    const endOffset = rawEndOffset - trailingWhitespace;

    // Get full text content for context extraction
    const fullText = getTextContent(container);
    const { prefix, suffix } = getContext(fullText, startOffset, endOffset, contextLength);

    // Get bounding rect for popup positioning (viewport coordinates for position: fixed)
    const boundingRect = range.getBoundingClientRect();
    const rect: SelectionRect = {
      top: boundingRect.top,
      left: boundingRect.left,
      bottom: boundingRect.bottom,
      right: boundingRect.right,
      width: boundingRect.width,
      height: boundingRect.height,
    };

    // Only trigger onSelection if the selection actually changed
    const lastSelection = lastSelectionRef.current;
    if (
      lastSelection &&
      lastSelection.startOffset === startOffset &&
      lastSelection.endOffset === endOffset
    ) {
      // Selection hasn't changed, don't trigger update
      return;
    }

    lastSelectionRef.current = { startOffset, endOffset };

    const selectionData: SelectionData = {
      exact: trimmedText,
      prefix,
      suffix,
      startOffset,
      endOffset,
      rect,
    };

    // Debug logging (can be removed later)
    console.log('[TextSelectionHandler] Selection detected:', selectionData);

    onSelection?.(selectionData);
  }, [onSelection, contextLength]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let selectionChangeTimeout: ReturnType<typeof setTimeout> | null = null;

    // Track active touch gestures so we don't show the popup mid-gesture.
    // Firefox Mobile interrupts native selection extension when DOM changes
    // occur during a touch (e.g., popup rendering). Deferring selectionchange
    // processing to touchend fixes this without affecting other browsers.
    let touchActive = false;
    let pendingSelectionChange = false;

    const handleTouchStart = () => {
      touchActive = true;
      pendingSelectionChange = false;
    };

    const handleTouchEnd = () => {
      touchActive = false;
      if (pendingSelectionChange) {
        pendingSelectionChange = false;
        // Skip single-word selections on touch — they're almost always the
        // browser's initial long-press before the user extends with handles.
        // Showing the popup here blocks handle-dragging. Once the user
        // extends via handles, selectionchange fires through the normal
        // debounced path (touchActive is false) and the popup appears.
        const sel = window.getSelection();
        const text = sel?.toString().trim();
        if (text && !/\s/.test(text)) {
          return;
        }
        requestAnimationFrame(handleSelectionChange);
      }
    };

    const debounceMs = 200;

    // Use mouseup for desktop - listen on document to catch selections
    // that start inside container but end outside (common with long blocks)
    const handleMouseUp = () => {
      // Small delay to ensure selection is complete
      requestAnimationFrame(handleSelectionChange);
    };

    // Handle keyboard selection (Shift+Arrow keys)
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.shiftKey) {
        requestAnimationFrame(handleSelectionChange);
      }
    };

    // Use selectionchange for more reliable detection, especially on mobile
    // Debounce to avoid rapid re-triggering during drag selection
    const handleSelectionChangeEvent = () => {
      if (selectionChangeTimeout) clearTimeout(selectionChangeTimeout);
      if (touchActive) {
        // Don't process during active touch — wait for touchend
        pendingSelectionChange = true;
        return;
      }
      selectionChangeTimeout = setTimeout(() => {
        handleSelectionChange();
      }, debounceMs);
    };

    // Listen on document to catch selections that end outside the container
    // The handler already verifies the selection is within our container
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('keyup', handleKeyUp);
    document.addEventListener('selectionchange', handleSelectionChangeEvent);
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    document.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      if (selectionChangeTimeout) clearTimeout(selectionChangeTimeout);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('selectionchange', handleSelectionChangeEvent);
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [handleSelectionChange]);

  return (
    <div ref={containerRef} data-selection-container>
      {children}
    </div>
  );
}
