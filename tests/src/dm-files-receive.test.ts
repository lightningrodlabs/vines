// @vitest-environment happy-dom
import { assert, test } from 'vitest';

import { ActionId, AgentId, AgentIdMap, EntryId } from '@ddd-qc/lit-happ';
import { DeliveryPerspectiveMutable, NoticeState } from '@ddd-qc/delivery';
import {
  acceptDmDeliveries,
  DM_RETRY_INTERVAL_MS,
  DmFilesPort,
  lookupParcel,
  resumeDmDeliveries,
  retryDmDelivery,
} from '../../webcomponents/src/viewModels/dm-files';

// Receiving a DM file: a delivery notice from a DM peer is accepted without the files
// inbox's Accept button; anyone else's still waits for it. The delivery zome only moves the
// bytes by direct message once the sender answers the reply, so a transfer that stalled while
// one side was offline is nudged again, but only while the sender is online and not on every
// render.

function fakeFilesDvm() {
  const p = new DeliveryPerspectiveMutable();
  const accepted: EntryId[] = [];
  const requested: EntryId[] = [];
  const dvm: DmFilesPort = {
    deliveryZvm: {
      perspective: p,
      acceptDelivery: async (noticeEh) => {
        accepted.push(noticeEh);
        return EntryId.empty(0);
      },
      requestMissingChunks: async (noticeEh) => {
        requested.push(noticeEh);
      },
    },
    startCommitPrivateAndSendFile: () => true,
  };
  return { dvm, p, accepted, requested };
}

const alice = AgentId.empty(1); // a DM peer
const carol = AgentId.empty(2); // not a DM peer
const dmAgents = new AgentIdMap<ActionId>();
dmAgents.set(alice, ActionId.empty(9));

const aManifestEh = EntryId.empty(3);
const cManifestEh = EntryId.empty(4);
const nAEh = EntryId.empty(5);
const nCEh = EntryId.empty(6);

const description = (name: string) =>
  ({ name, size: 10, zome_origin: 'files_integrity', visibility: 'Private', kind_info: { Manifest: 'text/plain' } }) as any;
const noticeFrom = (sender: AgentId, manifestEh: EntryId, name: string) =>
  ({
    distribution_ah: ActionId.empty(7).hash,
    sender: sender.hash,
    summary: { distribution_strategy: 'Normal', parcel_reference: { parcel_eh: manifestEh.hash, description: description(name) } },
    sender_summary_signature: new Uint8Array(),
  }) as any;
const nA = noticeFrom(alice, aManifestEh, 'a.txt');
const nC = noticeFrom(carol, cManifestEh, 'c.txt');
const aManifest = { description: description('a.txt'), data_hash: 'ha', chunks: [] } as any;

test('accepts an Unreplied notice from a DM peer, not from anyone else, and not twice', async () => {
  const { dvm, p, accepted } = fakeFilesDvm();
  p.notices.set(nAEh, [nA, 0, NoticeState.Unreplied, new Set()]);
  p.notices.set(nCEh, [nC, 0, NoticeState.Unreplied, new Set()]);
  const inFlight = new Set<string>();
  assert.deepEqual((await acceptDmDeliveries(dvm, dmAgents, inFlight)).map((e) => e.b64), [nAEh.b64]);
  assert.deepEqual((await acceptDmDeliveries(dvm, dmAgents, inFlight)).map((e) => e.b64), []);
  assert.deepEqual(accepted.map((e) => e.b64), [nAEh.b64]);
});

test('accept skips an Unreplied notice whose parcel is already on the chain (the zome rejects it itself)', async () => {
  const { dvm, p, accepted } = fakeFilesDvm();
  p.privateManifests.set(aManifestEh, [aManifest, 0]);
  p.notices.set(nAEh, [nA, 0, NoticeState.Unreplied, new Set()]);
  p.noticeByParcel.set(aManifestEh, nAEh);
  assert.deepEqual(await acceptDmDeliveries(dvm, dmAgents, new Set()), []);
  assert.equal(accepted.length, 0);
});

test('a failing accept neither blocks the other notices nor the next pass', async () => {
  const { dvm, p, accepted } = fakeFilesDvm();
  const dave = AgentId.empty(8);
  const peers = new AgentIdMap<ActionId>();
  peers.set(alice, ActionId.empty(9));
  peers.set(dave, ActionId.empty(10));
  const nDEh = EntryId.empty(11);
  p.notices.set(nAEh, [nA, 0, NoticeState.Unreplied, new Set()]);
  p.notices.set(nDEh, [noticeFrom(dave, EntryId.empty(12), 'd.txt'), 0, NoticeState.Unreplied, new Set()]);
  let failOnce = true;
  dvm.deliveryZvm.acceptDelivery = async (noticeEh) => {
    if (failOnce && noticeEh.equals(nAEh)) {
      failOnce = false;
      throw new Error('zome call failed');
    }
    accepted.push(noticeEh);
    return EntryId.empty(0);
  };
  const inFlight = new Set<string>();
  assert.deepEqual((await acceptDmDeliveries(dvm, peers, inFlight)).map((e) => e.b64), [nDEh.b64]);
  assert.deepEqual((await acceptDmDeliveries(dvm, peers, inFlight)).map((e) => e.b64), [nAEh.b64]);
  assert.deepEqual(accepted.map((e) => e.b64), [nDEh.b64, nAEh.b64]);
});

test('resume: Accepted without manifest re-accepts only while the sender is online, at most once per interval', async () => {
  const { dvm, p, accepted } = fakeFilesDvm();
  p.notices.set(nAEh, [nA, 0, NoticeState.Accepted, new Set()]);
  const last = new Map<string, number>();
  assert.equal((await resumeDmDeliveries(dvm, dmAgents, [], last, 1000)).length, 0);
  assert.equal((await resumeDmDeliveries(dvm, dmAgents, [alice], last, 1000)).length, 1);
  assert.equal((await resumeDmDeliveries(dvm, dmAgents, [alice], last, 1000 + DM_RETRY_INTERVAL_MS - 1)).length, 0);
  assert.equal((await resumeDmDeliveries(dvm, dmAgents, [alice], last, 1000 + DM_RETRY_INTERVAL_MS)).length, 1);
  assert.equal(accepted.length, 2);
});

test('resume: PartiallyReceived requests missing chunks even when the sender looks offline', async () => {
  const { dvm, p, requested } = fakeFilesDvm();
  p.privateManifests.set(aManifestEh, [aManifest, 0]);
  p.noticeByParcel.set(aManifestEh, nAEh);
  p.notices.set(nAEh, [nA, 0, NoticeState.PartiallyReceived, new Set(['c1'])]);
  await resumeDmDeliveries(dvm, dmAgents, [], new Map(), 0);
  assert.deepEqual(requested.map((e) => e.b64), [nAEh.b64]);
});

test('resume ignores Received, Refused and non-peer notices', async () => {
  const { dvm, p, accepted, requested } = fakeFilesDvm();
  p.notices.set(nAEh, [nA, 0, NoticeState.Received, new Set()]);
  p.notices.set(nCEh, [nC, 0, NoticeState.Accepted, new Set()]);
  await resumeDmDeliveries(dvm, dmAgents, [alice, carol], new Map(), 0);
  assert.equal(accepted.length + requested.length, 0);
});

test('retryDmDelivery acts on the lookup state', async () => {
  const { dvm, p, accepted, requested } = fakeFilesDvm();
  p.notices.set(nAEh, [nA, 0, NoticeState.Accepted, new Set()]);
  p.noticeByParcel.set(aManifestEh, nAEh);
  await retryDmDelivery(dvm, lookupParcel(p, aManifestEh)!);
  assert.equal(accepted.length, 1);
  p.notices.get(nAEh)![2] = NoticeState.PartiallyReceived;
  p.privateManifests.set(aManifestEh, [aManifest, 0]);
  await retryDmDelivery(dvm, lookupParcel(p, aManifestEh)!);
  assert.equal(requested.length, 1);
});
