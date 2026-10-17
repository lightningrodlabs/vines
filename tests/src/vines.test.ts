import { assert, test } from 'vitest';

import { dhtSync, runScenario } from '@holochain-open-dev/tryorama';
import { ActionHash, AgentPubKey, SignalType, encodeHashToBase64 } from '@holochain/client';

// Two-agent runtime check for the Holochain 0.7.1 line. The first zome call on each cell
// runs `init` for every coordinator, so a green run shows zThreads' "remote signals" cap
// grant commits on a 0.7.1 conductor. The synchronize_tip step at the end goes through
// Alice's `call_remote` into Bob's zThreads::recv_remote_signal, which only succeeds if
// Bob's unrestricted grant is in place.

const happPath = () => process.cwd() + '/../artifacts/vines.happ';
const appSource = () => ({
  appBundleSource: { type: 'path' as const, value: happPath() },
});

const ZOME = 'zThreads';
const APPLET_ID = 'vines-test-applet';

async function waitFor<T>(what: string, fn: () => T | Promise<T>, ok: (v: T) => boolean): Promise<T> {
  const deadline = Date.now() + 60_000;
  for (;;) {
    const v = await fn();
    if (ok(v)) return v;
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${what}`);
    await new Promise((r) => setTimeout(r, 500));
  }
}

test('topic, thread and text message written by Alice are read by Bob; remote signal reaches Bob', async () => {
  await runScenario(async (scenario) => {
    const [alice, bob] = await scenario.addPlayersWithApps([appSource(), appSource()]);
    await scenario.shareAllAgents();
    const aliceCell = alice.namedCells.get('rVines')!;
    const bobCell = bob.namedCells.get('rVines')!;
    const dnaHash = aliceCell.cell_id[0];
    const aliceKey: AgentPubKey = aliceCell.cell_id[1];
    const bobKey: AgentPubKey = bobCell.cell_id[1];

    const bobSignals: any[] = [];
    bob.appWs.on('signal', (signal) => {
      if (signal.type === SignalType.App) bobSignals.push(signal.value.payload);
    });

    // Alice: topic -> thread (ParticipationProtocol) on that topic -> text message in the thread.
    const title = 'hc071 upgrade';
    const topicAh: ActionHash = await aliceCell.callZome({
      zome_name: ZOME,
      fn_name: 'publish_semantic_topic',
      payload: { appletId: APPLET_ID, topic: { title } },
    });
    const pp = {
      purpose: 'comment',
      subject: {
        address: encodeHashToBase64(topicAh),
        name: title,
        typeName: 'SemanticTopic',
        dnaHashB64: encodeHashToBase64(dnaHash),
        appletId: APPLET_ID,
      },
      moderation: { instructions: '', allowedFlags: 0, moderators: [], canDeleteThread: false },
      limitations: {
        canWal: true,
        canFile: null,
        canText: { bannedWords: [], minTextLength: 0, maxTextLength: 0 },
        allowedAgents: [],
        maybeAgentRateLimiting: null,
      },
    };
    const [ppAh]: [ActionHash, number] = await aliceCell.callZome({
      zome_name: ZOME,
      fn_name: 'publish_participation_protocol',
      payload: pp,
    });
    const textBead = { bead: { ppAh, prevBeadAh: ppAh }, value: 'hello from alice' };
    const [beadAh]: [ActionHash, string, number] = await aliceCell.callZome({
      zome_name: ZOME,
      fn_name: 'publish_text_bead',
      payload: textBead,
    });

    await dhtSync([alice, bob], dnaHash);

    // Bob reads all three back from the network.
    const bobPp: [any, number, AgentPubKey] | null = await bobCell.callZome({
      zome_name: ZOME,
      fn_name: 'fetch_pp',
      payload: { ah: ppAh, strategy: 'Network' },
    });
    assert.ok(bobPp, 'Bob finds the thread');
    assert.deepEqual(bobPp![0], pp);
    assert.deepEqual(bobPp![2], aliceKey);

    const bobBead: [number, AgentPubKey, any] | null = await bobCell.callZome({
      zome_name: ZOME,
      fn_name: 'fetch_text_bead',
      payload: { ah: beadAh, strategy: 'Network' },
    });
    assert.ok(bobBead, 'Bob finds the text message');
    assert.deepEqual(bobBead![1], aliceKey);
    assert.deepEqual(bobBead![2], textBead);

    const bobTopics: [ActionHash, Uint8Array, string][] = await bobCell.callZome({
      zome_name: ZOME,
      fn_name: 'search_semantic_topics',
      payload: 'hc071',
    });
    assert.deepEqual(
      bobTopics.map(([ah, , t]) => [encodeHashToBase64(ah), t]),
      [[encodeHashToBase64(topicAh), title]],
    );

    // Alice -> Bob through call_remote into recv_remote_signal (needs Bob's cap grant).
    await aliceCell.callZome({
      zome_name: ZOME,
      fn_name: 'synchronize_tip',
      payload: { tip: { AppValue: ['ping', 'from alice'] }, recipient: bobKey, zomeName: ZOME },
    });
    const isTip = (s: any) =>
      s?.pulses?.some((p: any) => p?.Tip?.AppValue?.[0] === 'ping' && p.Tip.AppValue[1] === 'from alice');
    const tipSignals = await waitFor('the tip signal on Bob', () => bobSignals.filter(isTip), (v) => v.length > 0);
    assert.equal(tipSignals.length, 1);
    assert.deepEqual(tipSignals[0].from, aliceKey);
  });
});
