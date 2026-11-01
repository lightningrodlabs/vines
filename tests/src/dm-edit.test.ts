import { assert, test } from 'vitest';

import { dhtSync, runScenario } from '@holochain-open-dev/tryorama';
import { ActionHash, AgentPubKey, encodeHashToBase64 } from '@holochain/client';

// Editing a DM message reuses the public EDIT thread (subject = the message's hash, author
// only), with each version posted as an encrypted bead. This checks the zome side: the
// integrity zome accepts an encrypted bead in an EDIT thread, Bob finds the thread and its
// bead from the network and decrypts the new text with Alice as the other party.

const happPath = () => process.cwd() + '/../artifacts/vines.happ';
const appSource = () => ({
  appBundleSource: { type: 'path' as const, value: happPath() },
});

const ZOME = 'zThreads';
const APPLET_ID = 'vines-test-applet';

test('Alice edits an encrypted DM message through an EDIT thread; Bob reads the new text', async () => {
  await runScenario(async (scenario) => {
    const [alice, bob] = await scenario.addPlayersWithApps([appSource(), appSource()]);
    await scenario.shareAllAgents();
    const aliceCell = alice.namedCells.get('rVines')!;
    const bobCell = bob.namedCells.get('rVines')!;
    const dnaHash = aliceCell.cell_id[0];
    const aliceKey: AgentPubKey = aliceCell.cell_id[1];
    const bobKey: AgentPubKey = bobCell.cell_id[1];
    const call = (cell: typeof aliceCell, fn_name: string, payload: any) =>
      cell.callZome({ zome_name: ZOME, fn_name, payload });

    // Alice: DM thread, then an encrypted text message in it.
    const dmPpAh: ActionHash = await call(aliceCell, 'publish_dm_thread', { otherAgent: bobKey, appletId: APPLET_ID });
    const dmPp: [any, number, AgentPubKey] = await call(aliceCell, 'fetch_pp', { ah: dmPpAh, strategy: 'Local' });
    const message = { bead: { ppAh: dmPpAh, prevBeadAh: dmPpAh }, value: 'hi' };
    const encMessage = await call(aliceCell, 'encrypt_bead', { base: { TextBead: message }, otherAgent: bobKey });
    const [msgAh]: [ActionHash, string, number] = await call(aliceCell, 'publish_enc_bead', {
      encBead: encMessage, otherAgent: bobKey, creationTime: Date.now() * 1000,
    });

    // Alice: the EDIT thread off the message, as the client builds it, then an encrypted edit.
    const editPp = {
      purpose: 'EDIT',
      subject: {
        address: encodeHashToBase64(msgAh),
        name: '',
        typeName: 'TextBead',
        dnaHashB64: encodeHashToBase64(dnaHash),
        appletId: APPLET_ID,
      },
      moderation: { instructions: '', allowedFlags: 0, moderators: [], canDeleteThread: false },
      limitations: { ...dmPp[0].limitations, allowedAgents: [aliceKey] },
    };
    const [editPpAh]: [ActionHash, number] = await call(aliceCell, 'publish_participation_protocol', editPp);
    const edit = { bead: { ppAh: editPpAh, prevBeadAh: editPpAh }, value: 'hi edited' };
    const encEdit = await call(aliceCell, 'encrypt_bead', { base: { TextBead: edit }, otherAgent: bobKey });
    const [editAh]: [ActionHash, string, number] = await call(aliceCell, 'publish_enc_bead', {
      encBead: encEdit, otherAgent: bobKey, creationTime: Date.now() * 1000,
    });

    await dhtSync([alice, bob], dnaHash);

    // Bob: finds the EDIT thread, its one encrypted bead, and decrypts it with Alice as sender.
    const bobEditPp: [any, number, AgentPubKey] | null = await call(bobCell, 'fetch_pp', { ah: editPpAh, strategy: 'Network' });
    assert.ok(bobEditPp, 'Bob finds the EDIT thread');
    assert.equal(bobEditPp![0].purpose, 'EDIT');
    assert.equal(bobEditPp![0].subject.address, encodeHashToBase64(msgAh));

    const [, links]: [any, any[]] = await call(bobCell, 'find_latest_beads', {
      pp_ah: editPpAh, begin_time: null, end_time: null, target_limit: null, strategy: 'Network',
    });
    assert.deepEqual(
      links.map((l) => [encodeHashToBase64(l.bead_ah ?? l.beadAh), l.bead_type ?? l.beadType]),
      [[encodeHashToBase64(editAh), 'EncryptedBead']],
    );

    const bobEnc: [number, AgentPubKey, any] | null = await call(bobCell, 'fetch_enc_bead', { ah: editAh, strategy: 'Network' });
    assert.ok(bobEnc, 'Bob fetches the encrypted edit');
    assert.deepEqual(bobEnc![1], aliceKey);
    const decrypted = await call(bobCell, 'decrypt_bead', { encBead: bobEnc![2], otherAgent: aliceKey });
    assert.deepEqual(decrypted, { TextBead: edit });

    // Alice reads her own edit back without the other party.
    const mine = await call(aliceCell, 'decrypt_my_bead', encEdit);
    assert.deepEqual(mine, { TextBead: edit });
  });
});
