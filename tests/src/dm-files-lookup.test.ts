// @vitest-environment happy-dom
import { assert, test } from 'vitest';

import { ActionId, AgentId, EntryId } from '@ddd-qc/lit-happ';
import { DeliveryPerspectiveMutable, NoticeState } from '@ddd-qc/delivery';
import { isParcelReady, lookupParcel } from '../../webcomponents/src/viewModels/dm-files';

// A DM file lives in the private store, a channel file in the public one, and a DM file
// that has not arrived yet is only known through its DeliveryNotice. The chat looks all
// three up through one function.

const manifestEh = EntryId.empty(1);
const noticeEh = EntryId.empty(2);
const alice = AgentId.empty(3);

const description = {
  name: 'cat.png',
  size: 1234,
  zome_origin: 'files_integrity',
  visibility: 'Private',
  kind_info: { Manifest: 'image/png' },
} as any;
const manifest = { description, data_hash: 'h1', chunks: [] } as any;
const notice = {
  distribution_ah: ActionId.empty(4).hash,
  sender: alice.hash,
  summary: { distribution_strategy: 'Normal', parcel_reference: { parcel_eh: manifestEh.hash, description } },
  sender_summary_signature: new Uint8Array(),
} as any;

test('private manifest on the local chain, no notice: ready', () => {
  const p = new DeliveryPerspectiveMutable();
  p.privateManifests.set(manifestEh, [manifest, 0]);
  const l = lookupParcel(p, manifestEh)!;
  assert.equal(l.isPrivate, true);
  assert.equal(l.manifest, manifest);
  assert.equal(l.noticeEh, undefined);
  assert.isTrue(isParcelReady(l));
});

test('notice only (private file not yet received): described, not ready', () => {
  const p = new DeliveryPerspectiveMutable();
  p.notices.set(noticeEh, [notice, 0, NoticeState.Accepted, new Set()]);
  p.noticeByParcel.set(manifestEh, noticeEh);
  const l = lookupParcel(p, manifestEh)!;
  assert.equal(l.description.name, 'cat.png');
  assert.equal(l.manifest, undefined);
  assert.equal(l.noticeEh!.b64, noticeEh.b64);
  assert.equal(l.noticeState, NoticeState.Accepted);
  assert.isFalse(isParcelReady(l));
});

test('private manifest with a notice: ready only once the notice is Received', () => {
  const p = new DeliveryPerspectiveMutable();
  p.privateManifests.set(manifestEh, [manifest, 0]);
  p.notices.set(noticeEh, [notice, 0, NoticeState.PartiallyReceived, new Set(['c1'])]);
  p.noticeByParcel.set(manifestEh, noticeEh);
  assert.isFalse(isParcelReady(lookupParcel(p, manifestEh)!));
  p.notices.get(noticeEh)![2] = NoticeState.Received;
  assert.isTrue(isParcelReady(lookupParcel(p, manifestEh)!));
});

test('private manifest present with a Refused notice (the zome auto-rejects a re-sent file we already hold): ready', () => {
  const p = new DeliveryPerspectiveMutable();
  p.privateManifests.set(manifestEh, [manifest, 0]);
  p.notices.set(noticeEh, [notice, 0, NoticeState.Refused, new Set()]);
  p.noticeByParcel.set(manifestEh, noticeEh);
  assert.isTrue(isParcelReady(lookupParcel(p, manifestEh)!));
});

test('private manifest present but the notice is still Accepted: not ready (chunks not pulled yet)', () => {
  const p = new DeliveryPerspectiveMutable();
  p.privateManifests.set(manifestEh, [manifest, 0]);
  p.notices.set(noticeEh, [notice, 0, NoticeState.Accepted, new Set()]);
  p.noticeByParcel.set(manifestEh, noticeEh);
  assert.isFalse(isParcelReady(lookupParcel(p, manifestEh)!));
});

test('public parcel without a local manifest (a channel file from someone else): ready, no manifest', () => {
  const p = new DeliveryPerspectiveMutable();
  p.publicParcels.set(manifestEh, {
    prEh: EntryId.empty(5),
    parcelEh: manifestEh,
    description: { ...description, visibility: 'Public' },
  });
  const l = lookupParcel(p, manifestEh)!;
  assert.equal(l.isPrivate, false);
  assert.equal(l.manifest, undefined);
  assert.isTrue(isParcelReady(l));
});

test('local public manifest: ready with manifest', () => {
  const p = new DeliveryPerspectiveMutable();
  p.localPublicManifests.set(manifestEh, [{ ...manifest, description: { ...description, visibility: 'Public' } }, 0, alice]);
  const l = lookupParcel(p, manifestEh)!;
  assert.equal(l.isPrivate, false);
  assert.ok(l.manifest);
  assert.isTrue(isParcelReady(l));
});

test('unknown hash: undefined', () => {
  assert.equal(lookupParcel(new DeliveryPerspectiveMutable(), manifestEh), undefined);
});
