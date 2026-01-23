import { useEffect, useRef, useCallback, type ReactNode } from 'react';

export interface SelectionData {
  exact: string;
  prefix: string;
  suffix: string;
  startOffset: number;
  endOffset: number;
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

  let prefix = fullText.slice(prefixStart, startOffset);
  let suffix = fullText.slice(endOffset, suffixEnd);

  // Add ellipsis if we're not at the boundaries
  if (prefixStart > 0) {
    prefix = '...' + prefix;
  }
  if (suffixEnd < fullText.length) {
    suffix = suffix + '...';
  }

  return { prefix, suffix };
}

export default function TextSelectionHandler({
  children,
  onSelection,
  contextLength = 50,
}: TextSelectionHandlerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSelectionChange = useCallback(() => {
    const selection = window.getSelection();

    // Check for empty or collapsed selection
    if (!selection || selection.isCollapsed || !selection.rangeCount) {
      onSelection?.(null);
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

    // Ignore empty selections
    if (!trimmedText) {
      onSelection?.(null);
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

    const selectionData: SelectionData = {
      exact: trimmedText,
      prefix,
      suffix,
      startOffset,
      endOffset,
    };

    // Debug logging (can be removed later)
    console.log('[TextSelectionHandler] Selection detected:', selectionData);

    onSelection?.(selectionData);
  }, [onSelection, contextLength]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Use mouseup for desktop
    const handleMouseUp = () => {
      // Small delay to ensure selection is complete
      requestAnimationFrame(handleSelectionChange);
    };

    // Use touchend for mobile
    const handleTouchEnd = () => {
      // Longer delay for mobile selection UI
      setTimeout(handleSelectionChange, 100);
    };

    // Handle keyboard selection (Shift+Arrow keys)
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.shiftKey) {
        requestAnimationFrame(handleSelectionChange);
      }
    };

    container.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      container.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleSelectionChange]);

  return (
    <div ref={containerRef} data-selection-container>
      {children}
    </div>
  );
}
