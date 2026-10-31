// @vitest-environment happy-dom
import { assert, test } from 'vitest';

import { ActionId, AgentId, EntryId } from '@ddd-qc/lit-happ';
import { DeliveryPerspectiveMutable, ParcelManifest } from '@ddd-qc/delivery';
import {
  commitFileCopy,
  commitPrivateFileForDm,
  DmFilesPort,
  FileCopyPort,
  findLocalCopies,
  sendPrivateCopyForDm,
} from '../../webcomponents/src/viewModels/dm-files';

// One chain never holds a file's bytes twice by default: the files module refuses a commit
// for a data hash it already has in either visibility. With the user's consent a second
// copy is allowed, written through the zome directly since the module's upload path stops
// as soon as a manifest for that data hash exists.

const file = new File(['x'], 'a.txt');
const bob = AgentId.empty(7);
const alice = AgentId.empty(3);
const privEh = EntryId.empty(1);
const pubEh = EntryId.empty(2);

function manifest(dataHash: string, visibility: 'Private' | 'Public'): ParcelManifest {
  return {
    data_hash: dataHash,
    chunks: [],
    description: {name: 'a.txt', size: 1, zome_origin: 'files', visibility, kind_info: {Manifest: 'file::text/plain'}},
  } as any;
}

function fakePort(maxChunkSize: number) {
  const p = new DeliveryPerspectiveMutable();
  const written: {isPrivate: boolean; count: number}[] = [];
  const manifests: {isPrivate: boolean; chunks: EntryId[]}[] = [];
  const sent: [EntryId, AgentId[]][] = [];
  const libraryCalls: AgentId[][] = [];
  let next = 10;
  const write = (isPrivate: boolean) => async (chunks: {data_hash: string; data: string}[]) => {
    written.push({isPrivate, count: chunks.length});
    return chunks.map(() => EntryId.empty(next++).hash);
  };
  const dvm: DmFilesPort & FileCopyPort = {
    deliveryZvm: {
      perspective: p,
      acceptDelivery: async () => EntryId.empty(0),
      requestMissingChunks: async () => {},
    },
    startCommitPrivateAndSendFile: (_file, _splitObj, recipients) => {
      libraryCalls.push(recipients);
      return false;
    },
    dnaProperties: {maxChunkSize} as any,
    filesZvm: {
      zomeProxy: {writePrivateFileChunks: write(true), writePublicFileChunks: write(false)} as any,
      commitPrivateManifest: async (_f, _h, chunks) => {
        manifests.push({isPrivate: true, chunks});
        return privEh;
      },
      publishFileManifest: async (_f, _h, chunks) => {
        manifests.push({isPrivate: false, chunks});
        return pubEh;
      },
      sendFile: async (manifestEh, recipients) => {
        sent.push([manifestEh, recipients]);
        return ActionId.empty(0);
      },
    },
  };
  return { dvm, p, written, manifests, sent, libraryCalls };
}

test('findLocalCopies: nothing stored', () => {
  const p = new DeliveryPerspectiveMutable();
  assert.deepEqual(findLocalCopies(p, 'h1'), {});
});

test('findLocalCopies: finds the private and the public copy by data hash', () => {
  const p = new DeliveryPerspectiveMutable();
  p.storeManifest(privEh, 1, alice, manifest('h1', 'Private'));
  p.storeManifest(pubEh, 2, alice, manifest('h1', 'Public'));
  p.storeManifest(EntryId.empty(5), 3, alice, manifest('other', 'Public'));
  const copies = findLocalCopies(p, 'h1');
  assert.equal(copies.privateEh?.b64, privEh.b64);
  assert.equal(copies.publicEh?.b64, pubEh.b64);
});

test('commitFileCopy (private): chunks go in websocket-sized batches, then the manifest lists them all in order', async () => {
  const { dvm, written, manifests } = fakePort(4 * 1024 * 1024);
  const splitObj = { dataHash: 'h1', numChunks: 5, chunks: ['a', 'b', 'c', 'd', 'e'] } as any;
  const eh = await commitFileCopy(dvm, file, splitObj, true);
  assert.equal(eh.b64, privEh.b64);
  assert.deepEqual(written, [{isPrivate: true, count: 2}, {isPrivate: true, count: 2}, {isPrivate: true, count: 1}]);
  assert.equal(manifests.length, 1);
  assert.isTrue(manifests[0]!.isPrivate);
  assert.deepEqual(manifests[0]!.chunks.map((id) => id.b64), [10, 11, 12, 13, 14].map((i) => EntryId.empty(i).b64));
});

test('commitFileCopy (public): uses the public chunk and manifest calls', async () => {
  const { dvm, written, manifests } = fakePort(4 * 1024 * 1024);
  const splitObj = { dataHash: 'h1', numChunks: 1, chunks: ['a'] } as any;
  const eh = await commitFileCopy(dvm, file, splitObj, false);
  assert.equal(eh.b64, pubEh.b64);
  assert.deepEqual(written, [{isPrivate: false, count: 1}]);
  assert.deepEqual(manifests.map((m) => m.isPrivate), [false]);
});

test('sendPrivateCopyForDm: commits the private copy and sends it to the one recipient', async () => {
  const { dvm, sent, libraryCalls } = fakePort(4 * 1024 * 1024);
  const splitObj = { dataHash: 'h1', numChunks: 1, chunks: ['a'] } as any;
  const eh = await sendPrivateCopyForDm(dvm, file, splitObj, bob);
  assert.equal(eh.b64, privEh.b64);
  assert.deepEqual(sent.map(([m, r]) => [m.b64, r.map((a) => a.b64)]), [[privEh.b64, [bob.b64]]]);
  assert.equal(libraryCalls.length, 0);
});

test('commitPrivateFileForDm with both copies on the chain: sends the private one, no new copy', async () => {
  const { dvm, p, sent, written, libraryCalls } = fakePort(4 * 1024 * 1024);
  p.storeManifest(pubEh, 1, alice, manifest('h1', 'Public'));
  p.storeManifest(privEh, 2, alice, manifest('h1', 'Private'));
  const splitObj = { dataHash: 'h1', numChunks: 1, chunks: ['a'] } as any;
  const eh = await commitPrivateFileForDm(dvm, file, splitObj, bob);
  assert.equal(eh.b64, privEh.b64);
  assert.deepEqual(sent.map(([m, r]) => [m.b64, r.map((a) => a.b64)]), [[privEh.b64, [bob.b64]]]);
  assert.equal(written.length, 0);
  assert.equal(libraryCalls.length, 0);
});
