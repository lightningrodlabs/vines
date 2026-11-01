// @vitest-environment happy-dom
import { assert, test } from 'vitest';

import { deepActiveElement, isTypingElsewhere } from '../../webcomponents/src/elements/focus';

// The input bar refocuses its own input after every re-render. That must not pull the caret
// out of another editable element, such as a message being edited, across shadow roots.

function hostWithInput(kind: 'input' | 'textarea' | 'div'): [HTMLElement, HTMLElement] {
  const host = document.createElement('div');
  const root = host.attachShadow({ mode: 'open' });
  const inner = document.createElement(kind);
  if (kind === 'div') {
    inner.setAttribute('tabindex', '0');
  }
  root.appendChild(inner);
  document.body.appendChild(host);
  return [host, inner];
}

test('deepActiveElement follows focus into a shadow root', () => {
  const [, inner] = hostWithInput('input');
  inner.focus();
  assert.strictEqual(deepActiveElement(), inner);
});

test('typing in another textarea counts as elsewhere', () => {
  const [own] = hostWithInput('textarea');
  const [, other] = hostWithInput('textarea');
  other.focus();
  assert.isTrue(isTypingElsewhere(own));
});

test('focus inside the own element does not count', () => {
  const [own, mine] = hostWithInput('textarea');
  mine.focus();
  assert.isFalse(isTypingElsewhere(own));
});

test('nothing focused, or a non-editable element focused, does not count', () => {
  const [own] = hostWithInput('textarea');
  (deepActiveElement() as HTMLElement | null)?.blur();
  assert.isFalse(isTypingElsewhere(own));
  const [, plain] = hostWithInput('div');
  plain.focus();
  assert.isFalse(isTypingElsewhere(own));
});
