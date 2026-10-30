// @vitest-environment happy-dom
import { assert, expect, test } from 'vitest';

import { AgentId, EntryId } from '@ddd-qc/lit-happ';
import { DeliveryPerspectiveMutable } from '@ddd-qc/delivery';
import {
  commitPrivateFileForDm,
  DmFilesPort,
  FileAlreadyPublicError,
  waitForLocalManifest,
} from '../../webcomponents/src/viewModels/dm-files';

// Sending a DM file: the files module commits it privately and sends it, but has no callback,
// so the manifest hash is read from the perspective once it lands. The "already stored"
// branches of the files module return false and need their own handling.

function fakeFilesDvm(started: boolean) {
  const p = new DeliveryPerspectiveMutable();
  const calls: AgentId[][] = [];
  const dvm: DmFilesPort = {
    deliveryZvm: {
      perspective: p,
      acceptDelivery: async () => EntryId.empty(0),
      requestMissingChunks: async () => {},
    },
    startCommitPrivateAndSendFile: (_file, _splitObj, recipients) => {
      calls.push(recipients);
      return started;
    },
  };
  return { dvm, p, calls };
}

const file = new File(['x'], 'a.txt');
const splitObj = { dataHash: 'h1', numChunks: 1, chunks: ['eA=='] } as any;
const bob = AgentId.empty(7);
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

test('already private: the module re-sends and the existing manifest hash is returned', async () => {
  const { dvm, p, calls } = fakeFilesDvm(false);
  p.localManifestByData['h1'] = [eh, true];
  assert.equal((await commitPrivateFileForDm(dvm, file, splitObj, bob)).b64, eh.b64);
  assert.equal(calls.length, 1);
});

test('already public: refused without calling the files module', async () => {
  const { dvm, p, calls } = fakeFilesDvm(false);
  p.localManifestByData['h1'] = [eh, false];
  await expect(commitPrivateFileForDm(dvm, file, splitObj, bob)).rejects.toThrow(FileAlreadyPublicError);
  assert.equal(calls.length, 0);
});

test('commit refused with nothing stored: rejects', async () => {
  const { dvm } = fakeFilesDvm(false);
  await expect(commitPrivateFileForDm(dvm, file, splitObj, bob)).rejects.toThrow('File commit refused');
});

test('waitForLocalManifest times out', async () => {
  await expect(waitForLocalManifest(new DeliveryPerspectiveMutable(), 'h1', 30, 5)).rejects.toThrow('Timed out');
});
