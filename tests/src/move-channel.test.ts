import { assert, expect, test } from 'vitest';

import { dhtSync, runScenario } from '@holochain-open-dev/tryorama';
import { ActionHash, AgentPubKey, encodeHashToBase64 } from '@holochain/client';

// Moving a channel between categories re-files its "Threads" link: the old category stops
// listing it, the new one lists it, and the entry itself is untouched. Who may move follows
// the channel's moderation: anyone when it has no moderators, otherwise the author or a
// moderator.

const happPath = () => process.cwd() + '/../artifacts/vines.happ';
const appSource = () => ({
  appBundleSource: { type: 'path' as const, value: happPath() },
});

const ZOME = 'zThreads';
const APPLET_ID = 'vines-test-applet';

const b64s = (ahs: [ActionHash, number][]) => ahs.map(([ah]) => encodeHashToBase64(ah)).sort();

test('a channel moves between categories; moderation decides who may move it', async () => {
  await runScenario(async (scenario) => {
    const [alice, bob] = await scenario.addPlayersWithApps([appSource(), appSource()]);
    await scenario.shareAllAgents();
    const aliceCell = alice.namedCells.get('rVines')!;
    const bobCell = bob.namedCells.get('rVines')!;
    const dnaHash = aliceCell.cell_id[0];
    const aliceKey: AgentPubKey = aliceCell.cell_id[1];

    const publishTopic = (title: string): Promise<ActionHash> =>
      aliceCell.callZome({ zome_name: ZOME, fn_name: 'publish_semantic_topic', payload: { appletId: APPLET_ID, topic: { title } } });

    const publishChannel = async (topicAh: ActionHash, title: string, moderators: AgentPubKey[]): Promise<ActionHash> => {
      const pp = {
        purpose: title,
        subject: {
          address: encodeHashToBase64(topicAh),
          name: 'category',
          typeName: 'SemanticTopic',
          dnaHashB64: encodeHashToBase64(dnaHash),
          appletId: APPLET_ID,
        },
        moderation: { instructions: '', allowedFlags: 0, moderators, canDeleteThread: false },
        limitations: {
          canWal: true,
          canFile: null,
          canText: { bannedWords: [], minTextLength: 0, maxTextLength: 0 },
          allowedAgents: [],
          maybeAgentRateLimiting: null,
        },
      };
      const [ppAh]: [ActionHash, number] = await aliceCell.callZome({ zome_name: ZOME, fn_name: 'publish_participation_protocol', payload: pp });
      return ppAh;
    };

    const channelsOf = (cell: typeof aliceCell, topicAh: ActionHash): Promise<[ActionHash, number][]> =>
      cell.callZome({ zome_name: ZOME, fn_name: 'probe_pps_from_subject_hash', payload: { lh: topicAh, strategy: 'Network' } });

    const move = (cell: typeof aliceCell, ppAh: ActionHash, from: ActionHash, to: ActionHash): Promise<ActionHash> =>
      cell.callZome({ zome_name: ZOME, fn_name: 'move_participation_protocol', payload: { ppAh, from, to } });

    const topicA = await publishTopic('category A');
    const topicB = await publishTopic('category B');
    const open = await publishChannel(topicA, 'open channel', []);
    const moderated = await publishChannel(topicA, 'moderated channel', [bobKey()]);
    function bobKey(): AgentPubKey { return bobCell.cell_id[1]; }

    await dhtSync([alice, bob], dnaHash);
    assert.deepEqual(b64s(await channelsOf(bobCell, topicA)), b64s([[open, 0], [moderated, 0]]));
    assert.deepEqual(await channelsOf(bobCell, topicB), []);

    // An unmoderated channel: Bob, neither author nor moderator, may move it.
    const [, openIndexTime] = (await channelsOf(bobCell, topicA)).find(([ah]) => encodeHashToBase64(ah) == encodeHashToBase64(open))!;
    await move(bobCell, open, topicA, topicB);
    await dhtSync([alice, bob], dnaHash);
    assert.deepEqual(b64s(await channelsOf(aliceCell, topicA)), b64s([[moderated, 0]]));
    const inB = await channelsOf(aliceCell, topicB);
    assert.deepEqual(b64s(inB), b64s([[open, 0]]));
    assert.equal(inB[0][1], openIndexTime, 'the index-time travels with the channel');

    // The entry is untouched: its subject still says where it was created.
    const fetched: [any, number, AgentPubKey] | null = await bobCell.callZome({ zome_name: ZOME, fn_name: 'fetch_pp', payload: { ah: open, strategy: 'Network' } });
    assert.equal(fetched![0].subject.address, encodeHashToBase64(topicA));

    // Moving from a category the channel is not in is refused.
    await expect(move(bobCell, open, topicA, topicB)).rejects.toThrow(/not filed under/);

    // A moderated channel: a moderator (Bob) may move it, so may the author (Alice) even
    // though she is not a moderator. Carol, neither, may not.
    await move(bobCell, moderated, topicA, topicB);
    await dhtSync([alice, bob], dnaHash);
    assert.deepEqual(b64s(await channelsOf(aliceCell, topicB)), b64s([[open, 0], [moderated, 0]]));
    await move(aliceCell, moderated, topicB, topicA);
    await dhtSync([alice, bob], dnaHash);
    assert.deepEqual(b64s(await channelsOf(bobCell, topicA)), b64s([[moderated, 0]]));

    const [carol] = await scenario.addPlayersWithApps([appSource()]);
    await scenario.shareAllAgents();
    const carolCell = carol.namedCells.get('rVines')!;
    await dhtSync([alice, bob, carol], dnaHash);
    assert.deepEqual(b64s(await channelsOf(carolCell, topicA)), b64s([[moderated, 0]]));
    await expect(move(carolCell, moderated, topicA, topicB)).rejects.toThrow(/author or a moderator/);
    assert.deepEqual(b64s(await channelsOf(carolCell, topicA)), b64s([[moderated, 0]]));
    assert.notEqual(encodeHashToBase64(aliceKey), encodeHashToBase64(carolCell.cell_id[1]));
  });
});
