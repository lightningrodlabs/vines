import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    pool: 'forks',
    // One file at a time (tryorama conductors share ports), each in a fresh process: the
    // @ddd-qc/lit-happ dist registers custom elements at import, and a registry shared
    // between two happy-dom files refuses the second definition.
    fileParallelism: false,
    testTimeout: 60 * 1000 * 3, // 3 mins
    // The perspective unit tests import @ddd-qc packages whose dist uses extensionless
    // imports; Vite resolves those, Node does not.
    server: { deps: { inline: [/@ddd-qc\//, /@holochain-open-dev\//, /@theweave\//] } },
  },
});
