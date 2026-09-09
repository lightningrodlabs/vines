#!/usr/bin/env node
/**
 * Point a generated sandbox conductor at a local kitsune2-bootstrap-srv.
 *
 * Holochain 0.7 removed the `network ...` trailing subcommand from `hc sandbox`
 * (there are no bootstrap/signal CLI flags any more), so local-network dev setups
 * have to edit the generated conductor-config.yaml instead.
 *
 * One `kitsune2-bootstrap-srv` process serves both roles: bootstrap at `/` and the
 * iroh relay at `/relay`. There is no signal server in 0.7.
 *
 * Usage: node scripts/patch-conductor-network.js <bootstrapPort> [sandboxIndex]
 */
const fs = require('fs');
const path = require('path');

const port = process.argv[2];
const index = process.argv[3] === undefined ? null : Number(process.argv[3]);
if (!port) {
  console.error('Usage: node scripts/patch-conductor-network.js <bootstrapPort> [sandboxIndex]');
  process.exit(2);
}

/// `hc sandbox` records one sandbox directory per line in ./.hc
const hcFile = path.resolve(process.cwd(), '.hc');
if (!fs.existsSync(hcFile)) {
  console.error('No .hc file found - generate a sandbox first.');
  process.exit(1);
}
const dirs = fs.readFileSync(hcFile, 'utf8').split('\n').map((l) => l.trim()).filter(Boolean);
const targets = index === null ? dirs : [dirs[index]];

const bootstrapUrl = `http://127.0.0.1:${port}/`;
const relayUrl = `http://127.0.0.1:${port}/relay`;

for (const dir of targets) {
  if (!dir) continue;
  const cfgPath = path.join(dir, 'conductor-config.yaml');
  if (!fs.existsSync(cfgPath)) {
    console.error(`No conductor-config.yaml in ${dir}, skipping.`);
    continue;
  }
  let cfg = fs.readFileSync(cfgPath, 'utf8');
  cfg = cfg.replace(/^(\s*)bootstrap_url:.*$/m, `$1bootstrap_url: ${bootstrapUrl}`);
  cfg = cfg.replace(/^(\s*)relay_url:.*$/m, `$1relay_url: ${relayUrl}`);
  fs.writeFileSync(cfgPath, cfg);
  console.log(`Patched ${cfgPath} -> bootstrap ${bootstrapUrl} , relay ${relayUrl}`);
}
