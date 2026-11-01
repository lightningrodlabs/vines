import { assert, test } from 'vitest';

import { dhtSync, runScenario } from '@holochain-open-dev/tryorama';
import { ActionHash, AgentPubKey, SignalType, encodeHashToBase64 } from '@holochain/client';

// A DM thread Alice creates must reach Bob: the thread entry validates on his conductor and
// his Dm link (base = his key) is found by probe_dm_threads, which attests it as a signal.

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

test('a DM thread created by Alice is found and validated by Bob', async () => {
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

    const ppAh: ActionHash = await aliceCell.callZome({
      zome_name: ZOME,
      fn_name: 'publish_dm_thread',
      payload: { otherAgent: bobKey, appletId: APPLET_ID },
    });
    await dhtSync([alice, bob], dnaHash);

    const bobPp: [any, number, AgentPubKey] | null = await bobCell.callZome({
      zome_name: ZOME,
      fn_name: 'fetch_pp',
      payload: { ah: ppAh, strategy: 'Network' },
    });
    assert.ok(bobPp, 'Bob fetches the DM thread');
    assert.deepEqual(bobPp![2], aliceKey);
    assert.equal(bobPp![0].subject.typeName, 'AgentPubKey');
    assert.equal(bobPp![0].subject.address, encodeHashToBase64(bobKey));

    await bobCell.callZome({ zome_name: ZOME, fn_name: 'probe_dm_threads', payload: 'Network' });
    const found = await waitFor(
      'Dm link signal on Bob',
      () => bobSignals.flatMap((s) => s?.pulses ?? []).filter((p: any) => p?.Link),
      (links) => links.some((p: any) => encodeHashToBase64(p.Link.link.target) === encodeHashToBase64(ppAh)),
    );
    assert.ok(found.length > 0);
  });
});
