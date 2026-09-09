# Holochain 0.6 → 0.7 upgrade status

This branch (`hdk-7.0`) moves Vines to Holochain 0.7 — **DNA, UI, and Tauri**.

## Hard break: no data migration

0.7 cannot read 0.6 databases and the **DNA hash has changed**, so 0.6 and 0.7 agents
form **disjoint networks**. There is no migration path — this is by design.

Every environment needs its conductor state cleared before running:

```bash
npm run clean:hc      # or: bin/hc s clean
```

Shipped installs need a fresh profile directory. Treat this as a fresh-start release.

## What was upgraded

| layer | state |
|---|---|
| Rust zomes (integrity + coordinator) | hdi 0.8 / hdk 0.7 |
| DNA + happ + webhapp manifests | pack cleanly with `hc` 0.7.0 |
| nix flake | `holonix/main-0.7` (holochain 0.7.0, lair 0.7.1, kitsune2 0.5.0, nixpkgs 26.05) |
| `hc` / `holochain` binaries | `hc_version` is now `0.7.0` |
| sandbox / bootstrap scripts | rewritten for the 0.7 network model |
| UI / TypeScript | `@holochain/client` ^0.21.0, `@holochain-open-dev/*` ^0.700.0 |
| Tauri desktop + Android | now `holochain/android-service-runtime` (p2p-shipyard dropped) |

Verified: all 8 zome wasms build and link; `hc 0.7` packs both DNAs, the happ and the
webhapp; the happ **installs and runs in a real 0.7 conductor** (default networking and
a local `kitsune2-bootstrap-srv-iroh-relay`); `webcomponents` and `webapp` both build
against client 0.21 with exactly one client copy in the tree.

## Sibling repos upgraded alongside

Vines' stack depends on four repos with no published 0.7 line. Each now has a 0.7 branch
and is consumed **locally** until those are published:

| repo | branch | consumed as |
|---|---|---|
| `ddd-mtl/zdk` | `main-0.7` | Cargo path deps (`../zdk/...`) |
| `ddd-mtl/delivery-zome` | `hdk-7.0` | Cargo path deps + `file:` npm dep |
| `lightningrodlabs/files` | `hdk-7.0` | Cargo path deps + `file:` npm dep |
| `ddd-mtl/lit-happ` | `hdk-7.0` | `file:` npm deps (5 `@ddd-qc` packages) |

The git-dependency form is commented out directly above each Cargo path dep. **Once the
branches are published, swap the path/`file:` deps back to git/registry versions.** If
`ddd-mtl` is not writable, fork to `lightningrodlabs` and update the URLs at the same time.

`npm install` in this repo (and in `files` / `delivery-zome`) needs `--install-links`:
npm cannot resolve the chain of `file:` links between the lit-happ packages otherwise
(`Cannot destructure property 'package' of 'node.target'`).

## Tauri: p2p-shipyard → android-service-runtime

`darksoil-studio/tauri-plugin-holochain` has no 0.7 line. Desktop and Android now both
use `holochain/android-service-runtime`'s FFI-free `tauri-plugin-holochain`, whose single
`devShells.default` replaces the old `holochainTauriDev` / `holochainTauriAndroidDev`.

Plugin API differences that required porting `src-tauri`:

- `async_init(pass, config)` on the builder → `init(pass, config)` registered inside
  `setup()` (mobile needs a live `AppHandle` for its data dir).
- `"holochain://setup-completed"` → `EVENT_READY`; `"holochain://setup-failed"` →
  `EVENT_SETUP_FAILED`.
- `plugin.holochain_runtime` field → `plugin.runtime()` / `plugin.try_runtime()`.
- `admin_websocket().list_apps(None)` → `runtime().list_apps()`.
- `plugin.install_app(id, bundle, ..)` → `runtime().install_app(InstallAppPayload { .. })`.
- `get_app_websocket_auth(id, origins)` → `runtime().ensure_app_websocket(id)`, returning
  `AppAuth { authentication, port }`.
- `main_window_builder(label, bool, app_id, url)` →
  `main_window_builder(label, app_id, WindowOptions { .. })`. The new default is direct
  Tauri IPC; Vines sets `use_app_websocket: true` to keep the existing app-websocket wiring.
- `Error::ConductorApiError` / `Error::OpenAppError` are gone. The Tauri commands now
  return `Result<_, String>` (the plugin's `Error` serializes to its `to_string()`, so the
  frontend sees the same shape).
- **`update_app_if_necessary()` has no 0.7 equivalent** — coordinator-zome hot-swap on
  launch is dropped. Re-add if the runtime grows an equivalent.

## Notable 0.7 changes this upgrade hit

Beyond the documented action-model rewrite (`Action` is now `{ header, data }`):

- **`WasmError.file` → `WasmError.module_path`.**
- **`hdi`'s `debug!` moved behind the `trace` feature.** In 0.6 it arrived incidentally via
  cargo feature unification through `hdk`; it is now declared explicitly
  (`hdi = { ..., features = ["trace"] }`) in all four Rust workspaces so integrity zomes
  keep their logging and build in isolation. `chrono`'s `alloc` needed the same in
  `threads_integrity`.
- **`hc sandbox` lost its trailing `network …` subcommand.** The old
  `... generate <happ> network mem` / `network --bootstrap <url> webrtc <url>` forms are
  **silently ignored** in 0.7 — no error — and suppress the default
  `advanced.irohTransport.relayAllowPlainText`. All such args were removed here and in
  `files` / `delivery-zome`.
- **Local networking is conductor-config, not CLI.** `scripts/patch-conductor-network.js`
  rewrites `bootstrap_url` / `relay_url` in a generated sandbox config. One
  `kitsune2-bootstrap-srv-iroh-relay` process serves bootstrap at `/` and the iroh relay
  at `/relay`. There is no signal server — `SIGNAL_PORT` is dead config.
- **Client 0.21 unified the network-stats types:** `AppDumpNetworkStatsResponse` →
  `DumpNetworkStatsResponse` (= `ApiTransportStats`), with connection data nested under
  `.transport_stats`.
- **`@theweave/api` 0.7 `WeaveServices`** gained `onNetworkStatsUpdate` and `bootstrapUrls`.
- **Wrapper-zome crate collisions.** `path_explorer` (vines) and `delivery` (files) wrap
  upstream crates of the *same name*. Tolerable as git deps, impossible as two path deps
  with one lib name — renamed to `path_explorer_zome` / `delivery_zome`, with the
  respective `dna.yaml` wasm paths updated.

## Toolchain note

`holochain_zome_types` 0.7 uses `round_char_boundary`, stable only from **Rust 1.93**;
`src-tauri` follows android-service-runtime's **1.95** pin. Use the holonix-provided
toolchain (`nix develop`) — the repo's old 1.88 will not build.

## Weave / Moss versions

`0.7.0-dev.1` (api, elements, moss-types, utils) and `0.16.0-dev.3` (cli) **are** the
published 0.7 line — they are tagged `latest` on npm and all require
`@holochain/client ^0.21.0`. There are no finals yet; these are the correct versions to
be on. Every `@theweave/*` pin across vines, lit-happ, files and delivery-zome is on that
line, which is what collapses the previously-nested `@holochain/client` copies (the old
`@theweave/cli` 0.15.x pulled its own 0.20 client).

Also note: in `files` and `delivery-zome` the `new-sandbox:local` / `start:happ:local`
scripts are now identical to their `:mem` counterparts, because the network arguments they
carried no longer exist. Those repos need the same conductor-config patching Vines uses if
you want local bootstrap/relay there.

---

# Handoff: what to change after pushing the branches

Everything below is the *only* thing standing between this working tree and a
push-and-publish. Nothing here is a code change — it is all dependency re-pointing.

## 1. Branches to push

| repo | branch |
|---|---|
| `ddd-mtl/zdk` | `main-0.7` |
| `ddd-mtl/delivery-zome` | `hdk-7.0` |
| `ddd-mtl/lit-happ` | `hdk-7.0` |
| `lightningrodlabs/files` | `hdk-7.0` |
| `lightningrodlabs/vines` | `hdk-7.0` |

If `ddd-mtl` is not writable, fork those three to `lightningrodlabs` and change the URLs
in step 2 to match (the commented-out git lines still say `ddd-mtl`).

## 2. Cargo: swap path deps back to git

The intended git form is already commented out directly above each block.

**`delivery-zome/Cargo.toml`** — 3 deps to `ddd-mtl/zdk` `main-0.7`:
`zome_utils`, `zome_signals`, `zome_core`

**`files/Cargo.toml`** — 5 deps to `ddd-mtl/zdk` `main-0.7`:
`zome_utils`, `zome_path`, `zome_signals`, `zome_core`,
`hc_zome_profiles_coordinator` (`package = "profiles_alt_coordinator"`)
…plus 4 deps to `ddd-mtl/delivery-zome` `hdk-7.0`:
`delivery`, `zome_delivery_integrity`, `zome_delivery_types`, `zome_delivery_api`

**`vines/Cargo.toml`** — 8 deps to `ddd-mtl/zdk` `main-0.7`:
`zome_utils`, `zome_path`, `zome_signals`, `zome_core`, `time_indexing`,
`path_explorer_types`, `path_explorer`, `hc_zome_profiles_coordinator`

Already correct, no change needed:
- `hc_zome_profiles_integrity` → `holochain-open-dev/profiles` tag `v0.700.0`
- `vines/src-tauri` → `holochain/android-service-runtime` branch `main-0.7`

After swapping, confirm the lockfiles still resolve a **single** `hdi` / `hdk`:

```bash
grep -A1 '^name = "hd[ik]"$' Cargo.lock
```

## 3. npm: publish the @ddd-qc packages, then swap the `file:` deps

**These still carry their 0.6 version numbers — bump before publishing or you will
overwrite the 0.6 releases.**

| package | source | current version |
|---|---|---|
| `@ddd-qc/cell-proxy` | `lit-happ/packages/cell-proxy` | 0.35.0 |
| `@ddd-qc/lit-happ` | `lit-happ/packages/lit-happ` | 0.35.0 |
| `@ddd-qc/we-utils` | `lit-happ/packages/we-utils` | 0.35.0 |
| `@ddd-qc/profiles-dvm` | `lit-happ/dvms/profiles` | 0.35.0 |
| `@ddd-qc/path-explorer` | `lit-happ/dvms/path-explorer` | 1.35.0 |
| `@ddd-qc/delivery` | `delivery-zome/webcomponents` | 0.21.3 |
| `@ddd-qc/files` | `files/webcomponents` | 0.9.11 |

lit-happ has `npm run update-version` (`scripts/update-version-number.sh`) to propagate a
root version bump; publish with `npm run publish:all`.

Then replace the `file:` deps with the new published versions:

- **`vines/package.json`** — all 7 above
- **`files/package.json`** — all except `@ddd-qc/files` (6)
- **`delivery-zome/package.json`** — `@ddd-qc/cell-proxy`, `@ddd-qc/lit-happ` (2)

Once every dependency requests `^0.21.0` on its own, the `overrides` blocks in those three
`package.json` files can be dropped. Until then they are load-bearing.

`--install-links` is only needed while the `file:` deps are in place; it can go away with
them.

## 4. Also worth doing

- `vines/scripts/install-submodules.sh` clones `files` at `hdk-$hcversion` (now `hdk-7.0`)
  and `zdk` at `main-0.7`. Re-run `npm run install:submodules` once those branches exist —
  the current `submodules/` tree is a stale 0.6 clone.
- `files` and `delivery-zome` `new-sandbox:local` / `start:happ:local` are now identical to
  their `:mem` counterparts (the network args they carried no longer exist in 0.7). Port
  `vines/scripts/patch-conductor-network.js` to those repos if you want local
  bootstrap/relay there.
