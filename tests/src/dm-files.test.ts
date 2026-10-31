import { assert, test } from 'vitest';

import { runScenario } from '@holochain-open-dev/tryorama';
import { ActionHash, AgentPubKey } from '@holochain/client';

// A DM thread carries files through the files module's private path, so the zome gives it
// file limits. The limit must be explicit: the integrity zome rejects any file larger than
// max_file_size, and FileLimits::default() is 0.

const happPath = () => process.cwd() + '/../artifacts/vines.happ';
const appSource = () => ({
  appBundleSource: { type: 'path' as const, value: happPath() },
});

const ZOME = 'zThreads';
const APPLET_ID = 'vines-test-applet';

test('a new DM thread allows files up to 16 MiB and asset links', async () => {
  await runScenario(async (scenario) => {
    const [alice, bob] = await scenario.addPlayersWithApps([appSource(), appSource()]);
    await scenario.shareAllAgents();
    const aliceCell = alice.namedCells.get('rVines')!;
    const bobKey: AgentPubKey = bob.namedCells.get('rVines')!.cell_id[1];

    const ppAh: ActionHash = await aliceCell.callZome({
      zome_name: ZOME,
      fn_name: 'publish_dm_thread',
      payload: { otherAgent: bobKey, appletId: APPLET_ID },
    });
    const pp: [any, number, AgentPubKey] | null = await aliceCell.callZome({
      zome_name: ZOME,
      fn_name: 'fetch_pp',
      payload: { ah: ppAh, strategy: 'Local' },
    });
    assert.ok(pp, 'Alice finds her DM thread');
    assert.deepEqual(pp![0].limitations.canFile, {
      allowedFileTypes: [],
      minFileSize: 0,
      maxFileSize: 16 * 1024 * 1024,
    });
    assert.equal(pp![0].limitations.canWal, true);
    assert.equal(pp![0].subject.typeName, 'AgentPubKey');
  });
});
