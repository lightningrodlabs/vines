import { defineConfig } from '@theweave/cli';

/**
 * Moss dev config, matching the pattern the rest of the LRL fleet uses
 * (kando, talking-stickies, gamez, files, ...).
 *
 * The point of difference from this repo's older testdata/we.*.config.json
 * files is `source.type: 'localhost'`: the applet UI is served by a live vite
 * on `uiPort` rather than loaded from a packed, Retail-built webhapp. That
 * gives working devtools, source maps and hot reload, and removes the need to
 * re-run `dist:we` after every UI change.
 *
 * Drive it with `npm run start:moss` (both agents) or `npm run start:moss-1`;
 * `launch:moss` skips build:happ and runs whatever artifacts/vines.happ is.
 *
 * 0.6 line (Moss 0.15): tool curations come from the 0.15 lists.
 */
export default defineConfig({
  toolCurations: [
    {
      url: 'https://raw.githubusercontent.com/lightningrodlabs/weave-tool-curation/refs/heads/main/0.15/lists/curations-0.15.json',
      useLists: ['default'],
    },
  ],
  groups: [
    {
      name: 'Lightning Rod Labs',
      networkSeed: '098rc1m-09384u-crm-29384u-cmkj',
      icon: {
        type: 'filesystem',
        path: './testdata/cdric.png',
      },
      creatingAgent: {
        agentIdx: 1,
        agentProfile: {
          nickname: 'Alex',
          avatar: {
            type: 'filesystem',
            path: './testdata/alex.jpg',
          },
        },
      },
      joiningAgents: [
        {
          agentIdx: 2,
          agentProfile: {
            nickname: 'Billy',
            avatar: {
              type: 'filesystem',
              path: './testdata/billy.png',
            },
          },
        },
      ],
      applets: [
        {
          name: 'Vines Hot Reload',
          instanceName: 'Vines Hot Reload',
          registeringAgent: 1,
          joiningAgents: [2],
        },
      ],
    },
  ],
  applets: [
    {
      name: 'Vines Hot Reload',
      subtitle: 'Vines',
      description: 'Tooling for conversation in group spaces',
      icon: {
        type: 'filesystem',
        path: './webapp/icon.png',
      },
      source: {
        type: 'localhost',
        happPath: './artifacts/vines.happ',
        uiPort: 1420,
      },
    },
  ],
});
