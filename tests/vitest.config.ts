import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    testTimeout: 60 * 1000 * 3, // 3 mins
    // The perspective unit tests import @ddd-qc packages whose dist uses extensionless
    // imports; Vite resolves those, Node does not.
    server: { deps: { inline: [/@ddd-qc\//, /@holochain-open-dev\//] } },
  },
});
