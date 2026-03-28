export interface TextSelector {
  exact: string;
  prefix: string;
  suffix: string;
}

/**
 * Finds text matching a W3C TextQuoteSelector in the DOM and returns a Range.
 * Uses exact text search with prefix/suffix disambiguation.
 */
export function findTextInDOM(
  container: HTMLElement,
  selector: TextSelector,
): Range | null {
  const fullText = container.textContent || '';
  const { exact, prefix, suffix } = selector;

  if (!exact) return null;

  // Find all occurrences of the exact text
  const candidates: number[] = [];
  let searchFrom = 0;
  while (searchFrom < fullText.length) {
    const idx = fullText.indexOf(exact, searchFrom);
    if (idx === -1) break;
    candidates.push(idx);
    searchFrom = idx + 1;
  }

  if (candidates.length === 0) return null;

  // Score each candidate by prefix/suffix match quality
  let bestIdx = candidates[0];
  if (candidates.length > 1 && (prefix || suffix)) {
    let bestScore = -1;
    for (const idx of candidates) {
      let score = 0;
      if (prefix) {
        const textBefore = fullText.slice(Math.max(0, idx - prefix.length), idx);
        // Count matching characters from the end of prefix
        const minLen = Math.min(textBefore.length, prefix.length);
        for (let i = 0; i < minLen; i++) {
          if (textBefore[textBefore.length - 1 - i] === prefix[prefix.length - 1 - i]) {
            score++;
          } else {
            break;
          }
        }
      }
      if (suffix) {
        const textAfter = fullText.slice(idx + exact.length, idx + exact.length + suffix.length);
        const minLen = Math.min(textAfter.length, suffix.length);
        for (let i = 0; i < minLen; i++) {
          if (textAfter[i] === suffix[i]) {
            score++;
          } else {
            break;
          }
        }
      }
      if (score > bestScore) {
        bestScore = score;
        bestIdx = idx;
      }
    }
  }

  // Convert character offset to DOM Range using TreeWalker
  return createRangeFromOffsets(container, bestIdx, bestIdx + exact.length);
}

/**
 * Creates a DOM Range from character offsets within a container element.
 * Walks text nodes to find the correct start/end positions.
 */
function createRangeFromOffsets(
  container: HTMLElement,
  startOffset: number,
  endOffset: number,
): Range | null {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const range = document.createRange();

  let charCount = 0;
  let startSet = false;
  let node: Text | null;

  while ((node = walker.nextNode() as Text | null)) {
    const nodeLength = node.length;
    const nodeEnd = charCount + nodeLength;

    if (!startSet && nodeEnd > startOffset) {
      range.setStart(node, startOffset - charCount);
      startSet = true;
    }

    if (startSet && nodeEnd >= endOffset) {
      range.setEnd(node, endOffset - charCount);
      return range;
    }

    charCount = nodeEnd;
  }

  return null;
}
