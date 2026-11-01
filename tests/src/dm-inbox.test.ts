import { assert, test } from 'vitest';

import { dhtSync, runScenario } from '@holochain-open-dev/tryorama';
import { ActionHash, AgentPubKey, SignalType, encodeHashToBase64 } from '@holochain/client';

// The live path of a new DM: the creator calls notify_peer, which hangs an Inbox link off the
// peer's key, and the peer's probe_inbox finds that link on the network and attests it as a
// signal. The client then fetches the thread from the link's target.

const happPath = () => process.cwd() + '/../artifacts/vines.happ';
const appSource = () => ({
  appBundleSource: { type: 'path' as const, value: happPath() },
});

const ZOME = 'zThreads';
const APPLET_ID = 'vines-test-applet';
const NEW_DM_THREAD_EVENT_INDEX = 4; // NotifiableEvent: NewBead, Mention, Reply, Fork, NewDmThread, ...

async function waitFor<T>(what: string, fn: () => T | Promise<T>, ok: (v: T) => boolean): Promise<T> {
  const deadline = Date.now() + 60_000;
  for (;;) {
    const v = await fn();
    if (ok(v)) return v;
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${what}`);
    await new Promise((r) => setTimeout(r, 500));
  }
}

test("a new-DM notification reaches Bob's inbox through the network", async () => {
  await runScenario(async (scenario) => {
    const [alice, bob] = await scenario.addPlayersWithApps([appSource(), appSource()]);
    await scenario.shareAllAgents();
    const aliceCell = alice.namedCells.get('rVines')!;
    const bobCell = bob.namedCells.get('rVines')!;
    const dnaHash = aliceCell.cell_id[0];
    const bobKey: AgentPubKey = bobCell.cell_id[1];

    const bobSignals: any[] = [];
    bob.appWs.on('signal', (signal) => {
      if (signal.type === SignalType.App) bobSignals.push(signal.value.payload);
    });

    const ppAh: ActionHash = await aliceCell.callZome({
      zome_name: ZOME,
      fn_name: 'publish_dm_thread',
      payload: { otherAgent: bobKey, appletId: APPLET_ID },
    });
    await aliceCell.callZome({
      zome_name: ZOME,
      fn_name: 'notify_peer',
      payload: { content: ppAh, who: bobKey, event_index: NEW_DM_THREAD_EVENT_INDEX },
    });
    await dhtSync([alice, bob], dnaHash);

    await bobCell.callZome({ zome_name: ZOME, fn_name: 'probe_inbox', payload: 'Network' });
    const inbox = await waitFor(
      "Inbox link signal on Bob",
      () => bobSignals.flatMap((s) => s?.pulses ?? []).filter((p: any) => p?.Link),
      (links) => links.some((p: any) => encodeHashToBase64(p.Link.link.target) === encodeHashToBase64(ppAh)),
    );
    const mine = inbox.find((p: any) => encodeHashToBase64(p.Link.link.target) === encodeHashToBase64(ppAh));
    assert.deepEqual(Array.from(mine.Link.link.tag), [NEW_DM_THREAD_EVENT_INDEX]);
  });
});
