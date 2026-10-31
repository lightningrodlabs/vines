// @vitest-environment happy-dom
import { assert, test } from 'vitest';

import { isWeaveScheme, md } from '../../webcomponents/src/markdown/md';

// Moss builds asset links as `weave-<protocol version>://`, so the renderer must accept any
// version, not a fixed list; a new Moss release otherwise leaves the link as plain text.

const wal = 'hrl/uhC0kAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/uhCEkBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB?context=x';

test('isWeaveScheme accepts any weave protocol version and the bare schemes', () => {
  assert.isTrue(isWeaveScheme('we:'));
  assert.isTrue(isWeaveScheme('weave:'));
  assert.isTrue(isWeaveScheme('weave-0.12:'));
  assert.isTrue(isWeaveScheme('weave-0.16:'));
  assert.isTrue(isWeaveScheme('weave-1.0:'));
  assert.isFalse(isWeaveScheme('https:'));
  assert.isFalse(isWeaveScheme('weave-:'));
});

test('a bare weave-0.16 link renders as a wurl-link', () => {
  const html = md.render(`look at weave-0.16://${wal} please`);
  assert.include(html, `<wurl-link wurl="weave-0.16://${wal}">`);
  assert.include(html, '</wurl-link>');
  assert.notInclude(html, '<a ');
});

test('an older weave-0.12 link still renders as a wurl-link', () => {
  const html = md.render(`weave-0.12://${wal}`);
  assert.include(html, `<wurl-link wurl="weave-0.12://${wal}">`);
});

test('an https link is still a plain anchor', () => {
  const html = md.render('see https://example.org/x');
  assert.include(html, '<a href="https://example.org/x"');
  assert.notInclude(html, 'wurl-link');
});
