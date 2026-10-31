// @vitest-environment happy-dom
import { assert, expect, test } from 'vitest';

import { ActionId, AgentId, EntryId } from '@ddd-qc/lit-happ';
import { DeliveryPerspectiveMutable, ParcelManifest } from '@ddd-qc/delivery';
import {
  commitPrivateFileForDm,
  DmFilesPort,
  FileAlreadyPublicError,
  FileCopyPort,
  waitForLocalManifest,
} from '../../webcomponents/src/viewModels/dm-files';

// Sending a DM file: the files module commits it privately and sends it, but has no callback,
// so the manifest hash is read from the perspective once it lands. A file already on the
// chain is handled here, not by the module: its private path breaks when the data hash
// also has a public copy.

function fakeFilesDvm(started: boolean) {
  const p = new DeliveryPerspectiveMutable();
  const calls: AgentId[][] = [];
  const sent: [EntryId, AgentId[]][] = [];
  const dvm: DmFilesPort & FileCopyPort = {
    deliveryZvm: {
      perspective: p,
      acceptDelivery: async () => EntryId.empty(0),
      requestMissingChunks: async () => {},
    },
    startCommitPrivateAndSendFile: (_file, _splitObj, recipients) => {
      calls.push(recipients);
      return started;
    },
    dnaProperties: {maxChunkSize: 1024} as any,
    filesZvm: {
      zomeProxy: {} as any,
      commitPrivateManifest: async () => { throw new Error('not expected'); },
      publishFileManifest: async () => { throw new Error('not expected'); },
      sendFile: async (manifestEh, recipients) => {
        sent.push([manifestEh, recipients]);
        return ActionId.empty(0);
      },
    },
  };
  return { dvm, p, calls, sent };
}

function manifest(visibility: 'Private' | 'Public'): ParcelManifest {
  return {
    data_hash: 'h1',
    chunks: [],
    description: {name: 'a.txt', size: 1, zome_origin: 'files', visibility, kind_info: {Manifest: 'file::text/plain'}},
  } as any;
}

const file = new File(['x'], 'a.txt');
const splitObj = { dataHash: 'h1', numChunks: 1, chunks: ['eA=='] } as any;
const bob = AgentId.empty(7);
const alice = AgentId.empty(3);
const eh = EntryId.empty(1);

test('fresh file: sends to the one recipient and resolves once the private manifest lands', async () => {
  const { dvm, p, calls } = fakeFilesDvm(true);
  const pending = commitPrivateFileForDm(dvm, file, splitObj, bob, 1000);
  setTimeout(() => {
    p.localManifestByData['h1'] = [eh, true];
  }, 20);
  assert.equal((await pending).b64, eh.b64);
  assert.deepEqual(calls.map((r) => r.map((a) => a.b64)), [[bob.b64]]);
});

test('already private: the existing manifest is sent directly and its hash returned', async () => {
  const { dvm, p, calls, sent } = fakeFilesDvm(false);
  p.storeManifest(eh, 1, alice, manifest('Private'));
  assert.equal((await commitPrivateFileForDm(dvm, file, splitObj, bob)).b64, eh.b64);
  assert.equal(calls.length, 0);
  assert.deepEqual(sent.map(([m, r]) => [m.b64, r.map((a) => a.b64)]), [[eh.b64, [bob.b64]]]);
});

test('already public: refused without calling the files module', async () => {
  const { dvm, p, calls, sent } = fakeFilesDvm(false);
  p.storeManifest(eh, 1, alice, manifest('Public'));
  await expect(commitPrivateFileForDm(dvm, file, splitObj, bob)).rejects.toThrow(FileAlreadyPublicError);
  assert.equal(calls.length, 0);
  assert.equal(sent.length, 0);
});

test('commit refused with nothing stored: rejects', async () => {
  const { dvm } = fakeFilesDvm(false);
  await expect(commitPrivateFileForDm(dvm, file, splitObj, bob)).rejects.toThrow('File commit refused');
});

test('waitForLocalManifest times out', async () => {
  await expect(waitForLocalManifest(new DeliveryPerspectiveMutable(), 'h1', 30, 5)).rejects.toThrow('Timed out');
});
