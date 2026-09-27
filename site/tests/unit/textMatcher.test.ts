// @vitest-environment jsdom
import { expect, test } from 'vitest';
import { findTextInDOM } from '../../src/lib/textMatcher';

function container(html: string) {
  const node = document.createElement('div');
  node.innerHTML = html;
  return node;
}

test('matches text spanning inline elements', () => {
  const root = container('<p>Pay <em>close</em> attention.</p>');
  const range = findTextInDOM(root, { exact: 'close attention', prefix: '', suffix: '' });
  expect(range?.toString()).toBe('close attention');
  expect(range?.startContainer.parentElement?.tagName).toBe('EM');
});

test('uses context to distinguish repeated text', () => {
  const root = container('<p>First attention here.</p><p>Second attention there.</p>');
  const range = findTextInDOM(root, { exact: 'attention', prefix: 'Second ', suffix: ' there.' });
  expect(range?.startContainer.parentElement).toBe(root.lastElementChild);
  expect(range?.toString()).toBe('attention');
});

test('without context chooses the first occurrence', () => {
  const root = container('<p>attention</p><p>attention</p>');
  expect(findTextInDOM(root, { exact: 'attention', prefix: '', suffix: '' })?.startContainer.parentElement)
    .toBe(root.firstElementChild);
});

test.each(['', 'absent'])('no match for %j', (exact) => {
  expect(findTextInDOM(container('<p>attention</p>'), { exact, prefix: '', suffix: '' })).toBeNull();
});

test('handles Unicode and exact text-node boundaries', () => {
  const root = container('<span>🌱</span><strong>café</strong><span> — balance</span>');
  const range = findTextInDOM(root, { exact: 'café — balance', prefix: '🌱', suffix: '' });
  expect(range?.toString()).toBe('café — balance');
  expect(range?.startContainer.parentElement?.tagName).toBe('STRONG');
  expect(range?.startOffset).toBe(0);
});
