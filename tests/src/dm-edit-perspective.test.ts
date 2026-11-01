// @vitest-environment happy-dom
import { assert, test } from 'vitest';

import { ActionId, AgentId } from '@ddd-qc/lit-happ';
import { ThreadsPerspectiveMutable } from '../../webcomponents/src/viewModels/threads.perspective';
import { Thread } from '../../webcomponents/src/viewModels/thread';
import { ThreadsEntryType } from '../../webcomponents/src/bindings/threads.types';

// An edited message shows the last bead of its EDIT thread. In a DM both the message and
// its edits are encrypted beads, so the text has to be read from the decrypted inner bead.

const alice = AgentId.empty(1);
const dmPpAh = ActionId.empty(10);
const editPpAh = ActionId.empty(11);
const msgAh = ActionId.empty(20);
const editAh = ActionId.empty(21);

function pp(purpose: string, subjectAddress: string, typeName: string) {
  return {
    purpose,
    subject: { address: subjectAddress, name: '', typeName, dnaHashB64: '', appletId: '' },
    moderation: { instructions: '', allowedFlags: 0, moderators: [], canDeleteThread: false },
    limitations: { canWal: true, canFile: null, canText: null, allowedAgents: [], maybeAgentRateLimiting: null },
  } as any;
}

function perspective(): ThreadsPerspectiveMutable {
  const p = new ThreadsPerspectiveMutable();
  p.threads.set(dmPpAh, new Thread(pp('Private conversation', alice.b64, 'AgentPubKey'), '', 0, 1, alice));
  p.threads.set(editPpAh, new Thread(pp('EDIT', msgAh.b64, 'TextBead'), '', 0, 2, alice));
  return p;
}

function storeText(p: ThreadsPerspectiveMutable, beadAh: ActionId, ppAh: ActionId, ts: number, value: string) {
  const bead = { ppAh, prevBeadAh: ppAh };
  const info = { creationTime: ts, author: alice, beadType: ThreadsEntryType.TextBead, bead } as any;
  p.storeTypedBeadWithMeta(beadAh, info, { value, bead } as any, false, 1 as any, false);
}

function storeEncryptedText(p: ThreadsPerspectiveMutable, beadAh: ActionId, ppAh: ActionId, ts: number, value: string) {
  const bead = { ppAh, prevBeadAh: ppAh };
  const outer = { creationTime: ts, author: alice, beadType: ThreadsEntryType.EncryptedBead, bead } as any;
  const inner = { creationTime: ts, author: alice, beadType: ThreadsEntryType.TextBead, bead } as any;
  const encrypted = { encData: new Uint8Array([1, 2, 3]) } as any;
  p.storeTypedBeadWithMeta(beadAh, outer, encrypted, false, 1 as any, false, [inner, { value, bead } as any]);
}

test('a plain text message shows its latest plain edit', () => {
  const p = perspective();
  storeText(p, msgAh, dmPpAh, 100, 'hi');
  storeText(p, editAh, editPpAh, 200, 'hi edited');
  assert.equal(p.getLatestEdit(msgAh), 'hi edited');
});

test('an encrypted DM message shows its latest encrypted edit', () => {
  const p = perspective();
  storeEncryptedText(p, msgAh, dmPpAh, 100, 'hi');
  storeEncryptedText(p, editAh, editPpAh, 200, 'hi edited');
  assert.equal(p.getLatestEdit(msgAh), 'hi edited');
});

test('an encrypted DM message without edits shows its own text', () => {
  const p = perspective();
  storeEncryptedText(p, msgAh, dmPpAh, 100, 'hi');
  assert.equal(p.getLatestEdit(msgAh), 'hi');
});
