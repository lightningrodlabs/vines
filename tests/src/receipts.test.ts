// @vitest-environment happy-dom
import { assert, test } from 'vitest';

import { ValidatedBy } from '@ddd-qc/cell-proxy';
import { validationFromReceipts } from '../../webcomponents/src/utils';

// The state shown on my own message comes from its validation receipts, the same rule as the
// zome's determine_validation: complete StoreRecord receipts mean the network validated it, a
// valid receipt without completeness means a peer did, anything else is still only me.

const set = (opType: string, receiptsComplete: boolean, statuses: number[]) => ({
  opHash: new Uint8Array(),
  opType,
  receiptsComplete,
  receipts: statuses.map((validationStatus) => ({ validationStatus, validators: [new Uint8Array()] })),
}) as any;

test('no receipts: still only me', () => {
  assert.equal(validationFromReceipts([]), ValidatedBy.Me);
  assert.equal(validationFromReceipts([set('StoreEntry', true, [0])]), ValidatedBy.Me);
});

test('a valid StoreRecord receipt, not complete: a peer', () => {
  assert.equal(validationFromReceipts([set('StoreRecord', false, [0])]), ValidatedBy.Peer);
});

test('complete StoreRecord receipts: the network', () => {
  assert.equal(validationFromReceipts([set('StoreRecord', true, [0, 0, 0])]), ValidatedBy.Network);
});

test('only rejected receipts, not complete: still only me', () => {
  assert.equal(validationFromReceipts([set('StoreRecord', false, [1])]), ValidatedBy.Me);
});
