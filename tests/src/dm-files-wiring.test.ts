// @vitest-environment happy-dom
import { assert, test } from 'vitest';

import { ChatFile } from '../../webcomponents/src/features/chat-thread/chat-file';

// A view model's subscribe()/notifySubscribers() assign the same perspective object to the
// host property every time. Lit's default change check compares references, so such a
// property must declare hasChanged() as always true or the element never re-renders after
// the first assignment, and a DM file that finished arriving would stay a placeholder.

const sameObject = {};

test('<chat-file> re-renders on every delivery notification', () => {
  const options = (ChatFile as any).elementProperties.get('deliveryPerspective');
  assert.ok(options, 'deliveryPerspective is a declared property');
  assert.isTrue(options.hasChanged(sameObject, sameObject));
});
