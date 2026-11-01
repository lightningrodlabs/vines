// @vitest-environment happy-dom
import { assert, test } from 'vitest';

import { fetchBeadOfAnyKind } from '../../webcomponents/src/viewModels/threads.zvm';

// A bead of unknown kind is looked up as text, then file, then asset, then encrypted (DM).
// Each lookup that finds the record emits the pulse that stores it and answers validation
// requests. The chain used to stop after the text lookup, so a DM message, a file or an asset
// was never fetched this way.

function fakeProxy(found: string | null, throttled: string[] = []) {
  const calls: string[] = [];
  const make = (name: string) => async () => {
    calls.push(name);
    if (throttled.includes(name)) {
      throw { throttled: true };
    }
    return name == found ? [0, new Uint8Array(), {}] : null;
  };
  return {
    calls,
    proxy: {
      fetchTextBead: make('text'),
      fetchEntryBead: make('entry'),
      fetchAnyBead: make('any'),
      fetchEncBead: make('enc'),
    } as any,
  };
}

const input = { ah: new Uint8Array(), strategy: 'Local' } as any;

test('a text bead is found by the first lookup', async () => {
  const { proxy, calls } = fakeProxy('text');
  assert.equal(await fetchBeadOfAnyKind(proxy, input), 'text');
  assert.deepEqual(calls, ['text']);
});

test('an encrypted DM bead is reached after the other kinds miss', async () => {
  const { proxy, calls } = fakeProxy('enc');
  assert.equal(await fetchBeadOfAnyKind(proxy, input), 'enc');
  assert.deepEqual(calls, ['text', 'entry', 'any', 'enc']);
});

test('a throttled lookup counts as a miss and the next kind is tried', async () => {
  const { proxy, calls } = fakeProxy('entry', ['text']);
  assert.equal(await fetchBeadOfAnyKind(proxy, input), 'entry');
  assert.deepEqual(calls, ['text', 'entry']);
});

test('nothing found anywhere', async () => {
  const { proxy } = fakeProxy(null);
  assert.isNull(await fetchBeadOfAnyKind(proxy, input));
});
