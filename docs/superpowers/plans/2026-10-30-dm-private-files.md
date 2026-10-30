# DM Private Files Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A direct message (DM) thread carries file attachments and voice messages through the files module's private path, so the content never reaches the public files store.

**Architecture:** The zome gives new DM threads a `can_file` limit, which makes the existing input bar show the attach and microphone buttons. On send, `vines-page` branches on `isThreadDm` and uses `startCommitPrivateAndSendFile` with the other party as the only recipient, waits for the private manifest to land on the local chain, and publishes the usual `EntryBead` (which `publishDm` encrypts). On receive, `vines-page` auto-accepts delivery notices whose sender is a DM peer and nudges stalled transfers; everything else still needs the files module's manual Accept. One new module, `webcomponents/src/viewModels/dm-files.ts`, holds the pure logic (manifest lookup across public and private stores, send-and-wait, accept and resume policies) so it is unit-tested without a conductor; the Lit elements call it.

**Tech Stack:** Rust HDK 0.7 zome (`dna/zomes/threads`), Lit 3 + TypeScript (`webcomponents`, `webapp`), `@ddd-qc/files` 0.9.12 and `@ddd-qc/delivery` 0.22.0 (unchanged), vitest with happy-dom for unit tests and tryorama for zome tests (`tests/`).

**Spec:** `docs/superpowers/specs/2026-10-30-dm-private-files-brief.md`

## Global Constraints

- New DNA hash, no migration or compatibility with existing DMs.
- Private content never enters the public files store: no `startPublishFile`, no public manifest, no public parcel for a DM file.
- A DM file message is an `EntryBead` whose `sourceEh` is a private manifest; the message itself goes through `publishDm` (encrypted) exactly as text does.
- `can_wal` stays `false` on DM threads. The add menu's "Embed an Asset" stays disabled in a DM.
- The `@ddd-qc/files` and `@ddd-qc/delivery` packages are not modified or forked.
- DM file size limit: `max_file_size = 16 * 1024 * 1024` bytes (16 MiB), `min_file_size = 0`, `allowed_file_types = []`. The integrity zome rejects any file larger than `max_file_size`, and the client's `FileLimits::default()` of `0` would reject every file, so the value must be explicit.
- Commit messages carry no `Co-Authored-By` or generator trailer (user rule).
- Every task leaves `npx tsc --noEmit -p webcomponents/tsconfig.json` green. Zome tasks leave `npm run build:happ` (inside `nix develop`) green.
- Work happens on branch `dm-private-files` in the worktree `.claude/worktrees/dm-private-files`, branched from `hdk-7.0`.

## How the delivery zome actually moves a private file (verified by reading `delivery-zome` rev `e4427d1`)

Executors need this to understand the receive-side policy; it answers the brief's open questions.

- `send_file` → `distribute_parcel` → `Distribution` post-commit sends a `DeliveryNotice` to each recipient by direct message, and **falls back to a DHT "pending item"** in the recipient's inbox when the direct message fails. So the notice reaches a recipient who was offline, once they run `process_inbox` (which `deliveryZvm.probeDht` does, and `filesDvm.probeAll` calls).
- `respond_to_notice` (what `acceptDelivery` calls) commits a `NoticeReply`; its post-commit sends the reply to the sender. **Only when the sender answers that direct message** does the recipient call `fetch_parcel`, which pulls the manifest by direct message from the sender, and the manifest's post-commit pulls every chunk by direct message. Manifest and chunk bytes are **never** written to the DHT inbox (nothing calls `pack_entry`/`pack_chunk`). So the sender must be online for the transfer itself; a reply sent while the sender is offline lands in the sender's inbox and produces a `ReplyAck` later, but nothing then restarts the fetch.
- Therefore the recipient-side retry for a notice in state `Accepted` with no local manifest is **to call `acceptDelivery` again while the sender is online** (a second `NoticeReply` is harmless: it just creates another `ReplyAck`). For a notice in state `PartiallyReceived` (manifest present, chunks missing) the retry is `deliveryZvm.requestMissingChunks(noticeEh)`, which pulls each missing chunk by direct message.
- `deliveryZvm.fetchFileInfo` checks `privateManifests` first, so `filesDvm.downloadFile` and `fetchFile` already resolve a private manifest the agent holds. `fetchChunk` reads the local chain with `GetStrategy::Local`, which covers private chunks.
- `localManifestByData[dataHash]` is `[manifestEh, isPrivate]` and is set by `storeManifest` from the `PrivateManifest` entry pulse on the sender's own chain. That is the sender's signal that `startCommitPrivateAndSendFile` finished (there is no callback).

## Review Focus

1. **A file already shared publicly in the group, then attached in a DM.** `startCommitPrivateFile` would call `privateManifests.get(eh)[0]` on a public manifest and throw. Expected: the send is refused with a toast and the file goes back into the input bar; nothing is re-published. Pinned in Task 3 (`commitPrivateFileForDm` rejects with `FileAlreadyPublicError`).
2. **Same file sent twice in DMs.** `startCommitPrivateFile` re-sends but returns `false`. Expected: the second message is still published, pointing at the existing private manifest. Pinned in Task 3.
3. **Recipient offline at send time, sender offline when the recipient accepts.** Expected: the message shows the file name and size with a "Waiting for sender" placeholder, and the transfer restarts by itself once the sender is online again, without hammering the sender with a reply on every render. Pinned in Task 4 (`resumeDmDeliveries` only retries for online senders and at most once per 30 s per notice).
4. **A delivery notice from someone who is not a DM peer** (a file sent through the files module directly). Expected: it is not auto-accepted and still appears in the files module inbox with its Accept button. Pinned in Task 4.
5. **Channel files keep working.** A public file that only has a `publicParcels` entry (no local manifest) must still render, name itself and download exactly as before. Pinned in Task 2 (`lookupParcel` on a public-parcel-only entry) and the final build.

---

### Task 1: DM threads allow files (zome + tryorama test)

**Files:**
- Modify: `dna/zomes/threads/src/dm/publish_dm_thread.rs:22-26`
- Create: `tests/src/dm-files.test.ts`

**Interfaces:**
- Produces: a DM thread's `pp.limitations.canFile` is `{allowedFileTypes: [], minFileSize: 0, maxFileSize: 16777216}` and `canWal` is `false`. Consumed by the input bar unchanged (`webcomponents/src/elements/input-bar.ts` already reads `canFile`).

- [ ] **Step 1: Write the failing tryorama test** in `tests/src/dm-files.test.ts`, following the style of `tests/src/vines.test.ts` (same `happPath`, `appSource`, `ZOME`, `APPLET_ID` helpers, copied locally):

```ts
test('a new DM thread allows files up to 16 MiB and still forbids assets', async () => {
  await runScenario(async (scenario) => {
    const [alice, bob] = await scenario.addPlayersWithApps([appSource(), appSource()]);
    await scenario.shareAllAgents();
    const aliceCell = alice.namedCells.get('rVines')!;
    const bobKey = bob.namedCells.get('rVines')!.cell_id[1];
    const ppAh: ActionHash = await aliceCell.callZome({
      zome_name: ZOME, fn_name: 'publish_dm_thread',
      payload: { otherAgent: bobKey, appletId: APPLET_ID },
    });
    const pp: [any, number, AgentPubKey] | null = await aliceCell.callZome({
      zome_name: ZOME, fn_name: 'fetch_pp', payload: { ah: ppAh, strategy: 'Local' },
    });
    assert.ok(pp, 'Alice finds her DM thread');
    assert.deepEqual(pp![0].limitations.canFile, { allowedFileTypes: [], minFileSize: 0, maxFileSize: 16 * 1024 * 1024 });
    assert.equal(pp![0].limitations.canWal, false);
    assert.equal(pp![0].subject.typeName, 'Agent');
  });
});
```

(`DM_SUBJECT_TYPE_NAME` is the subject type for DMs; check its string value in `dna/zomes/threads_integrity` and use that literal in the last assertion.)

- [ ] **Step 2: Build the current hApp and run the test to verify it fails**

Run: `nix develop -c npm run build:happ && npx vitest run src/dm-files.test.ts --root tests`
Expected: FAIL on the `canFile` assertion (`null` instead of the object).

- [ ] **Step 3: Set the DM file limits in `publish_dm_thread.rs`**

Replace the "Only text in DMs" block with:

```rust
/// Files travel the files module's private path (committed on the sender's chain, delivered
/// to the other party), so they are allowed. Assets (WALs) stay off: niche and hard to manage.
pub const DM_MAX_FILE_SIZE: u32 = 16 * 1024 * 1024;

let limitations = Limitations {
  can_wal: false,
  can_file: Some(FileLimits { allowed_file_types: Vec::new(), min_file_size: 0, max_file_size: DM_MAX_FILE_SIZE }),
  ..Limitations::default()
};
```

(`pub const` goes at module level, above the function.)

- [ ] **Step 4: Rebuild and run the test to verify it passes**

Run: `nix develop -c npm run build:happ && npx vitest run src/dm-files.test.ts --root tests`
Expected: PASS. Also run `npx vitest run src/vines.test.ts --root tests` and expect PASS (nothing else in the zome changed).

- [ ] **Step 6: Commit**

```bash
git add dna/zomes/threads/src/dm/publish_dm_thread.rs tests/src/dm-files.test.ts
git commit -m "zome: DM threads allow files up to 16 MiB"
```

---

### Task 2: Parcel lookup across public and private stores

**Files:**
- Create: `webcomponents/src/viewModels/dm-files.ts`
- Create: `tests/src/dm-files-lookup.test.ts` (happy-dom, like `tests/src/perspective-filing.test.ts`)

**Interfaces:**
- Produces (all exported from `webcomponents/src/viewModels/dm-files.ts`):

```ts
export interface ParcelLookup {
  description: ParcelDescription;
  manifest?: ParcelManifest;   // set when the manifest is on the local chain
  isPrivate: boolean;
  noticeEh?: EntryId;          // set on the receiving side of a private file
  noticeState?: NoticeState;   // state of that notice
}
/** Finds a file by manifest hash in, in order: privateManifests, localPublicManifests,
 *  publicParcels, and finally a DeliveryNotice (noticeByParcel) for a private file not yet received. */
export function lookupParcel(delivery: DeliveryPerspective, manifestEh: EntryId): ParcelLookup | undefined;
/** True when the bytes can be fetched locally: any public file, a private file the agent authored
 *  (no notice), or a received private file whose notice is in state Received. */
export function isParcelReady(lookup: ParcelLookup): boolean;
```
- `DeliveryPerspective`, `DeliveryPerspectiveMutable`, `NoticeState`, `ParcelDescription`, `ParcelManifest`, `DeliveryNotice` come from `@ddd-qc/delivery`. `EntryId`, `AgentId`, `ActionId`, `AgentIdMap` from `@ddd-qc/lit-happ`.

- [ ] **Step 1: Write the failing tests** in `tests/src/dm-files-lookup.test.ts`. Header `// @vitest-environment happy-dom`. Fixtures: `const manifestEh = EntryId.empty(1); const noticeEh = EntryId.empty(2); const alice = AgentId.empty(3);` a `description = {name: 'cat.png', size: 1234, zome_origin: 'files_integrity', visibility: 'Private', kind_info: {Manifest: 'image/png'}}`, a `manifest = {description, data_hash: 'h1', chunks: []}`, a `notice = {distribution_ah: ActionId.empty(4).hash, sender: alice.hash, summary: {distribution_strategy: 'Normal', parcel_reference: {parcel_eh: manifestEh.hash, description}}, sender_summary_signature: new Uint8Array()} as any`. Build perspectives with `new DeliveryPerspectiveMutable()` and its maps.

```ts
test('private manifest on the local chain, no notice: ready', () => {
  const p = new DeliveryPerspectiveMutable();
  p.privateManifests.set(manifestEh, [manifest, 0]);
  const l = lookupParcel(p, manifestEh)!;
  assert.equal(l.isPrivate, true);
  assert.equal(l.manifest, manifest);
  assert.equal(l.noticeEh, undefined);
  assert.isTrue(isParcelReady(l));
});
test('notice only (private file not yet received): described, not ready', () => {
  const p = new DeliveryPerspectiveMutable();
  p.notices.set(noticeEh, [notice, 0, NoticeState.Accepted, new Set()]);
  p.noticeByParcel.set(manifestEh, noticeEh);
  const l = lookupParcel(p, manifestEh)!;
  assert.equal(l.description.name, 'cat.png');
  assert.equal(l.manifest, undefined);
  assert.equal(l.noticeEh!.b64, noticeEh.b64);
  assert.equal(l.noticeState, NoticeState.Accepted);
  assert.isFalse(isParcelReady(l));
});
test('private manifest with a notice: ready only once the notice is Received', () => {
  const p = new DeliveryPerspectiveMutable();
  p.privateManifests.set(manifestEh, [manifest, 0]);
  p.notices.set(noticeEh, [notice, 0, NoticeState.PartiallyReceived, new Set(['c1'])]);
  p.noticeByParcel.set(manifestEh, noticeEh);
  assert.isFalse(isParcelReady(lookupParcel(p, manifestEh)!));
  p.notices.get(noticeEh)![2] = NoticeState.Received;
  assert.isTrue(isParcelReady(lookupParcel(p, manifestEh)!));
});
test('public parcel without a local manifest (a channel file from someone else): ready, no manifest', () => {
  const p = new DeliveryPerspectiveMutable();
  p.publicParcels.set(manifestEh, { prEh: EntryId.empty(5), parcelEh: manifestEh, description: { ...description, visibility: 'Public' } });
  const l = lookupParcel(p, manifestEh)!;
  assert.equal(l.isPrivate, false);
  assert.equal(l.manifest, undefined);
  assert.isTrue(isParcelReady(l));
});
test('local public manifest: ready with manifest', () => {
  const p = new DeliveryPerspectiveMutable();
  p.localPublicManifests.set(manifestEh, [{ ...manifest, description: { ...description, visibility: 'Public' } }, 0, alice]);
  const l = lookupParcel(p, manifestEh)!;
  assert.equal(l.isPrivate, false);
  assert.ok(l.manifest);
  assert.isTrue(isParcelReady(l));
});
test('unknown hash: undefined', () => {
  assert.equal(lookupParcel(new DeliveryPerspectiveMutable(), manifestEh), undefined);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/dm-files-lookup.test.ts --root tests`
Expected: FAIL, module `../../webcomponents/src/viewModels/dm-files` not found.

- [ ] **Step 3: Implement `lookupParcel` and `isParcelReady`** in `webcomponents/src/viewModels/dm-files.ts` with the signatures above. `lookupParcel` must attach `noticeEh`/`noticeState` to a private manifest when `noticeByParcel` has an entry for it (the third test).

- [ ] **Step 4: Run the tests to verify they pass; typecheck**

Run: `npx vitest run src/dm-files-lookup.test.ts --root tests && npx tsc --noEmit -p webcomponents/tsconfig.json`
Expected: 6 passed; tsc exits 0.

- [ ] **Step 6: Commit**

```bash
git add webcomponents/src/viewModels/dm-files.ts tests/src/dm-files-lookup.test.ts
git commit -m "dm-files: look a file up in the private store as well as the public one"
```

---

### Task 3: Commit a file privately for a DM and wait for its manifest

**Files:**
- Modify: `webcomponents/src/viewModels/dm-files.ts`
- Create: `tests/src/dm-files-send.test.ts`

**Interfaces:**
- Produces (exported from `dm-files.ts`):

```ts
/** The slice of FilesDvm this module uses; FilesDvm satisfies it structurally, tests pass a fake. */
export interface DmFilesPort {
  deliveryZvm: {
    perspective: DeliveryPerspective;
    acceptDelivery(noticeEh: EntryId): Promise<EntryId>;
    requestMissingChunks(noticeEh: EntryId): Promise<void>;
  };
  startCommitPrivateAndSendFile(file: File, splitObj: SplitObject, recipients: AgentId[], tags: string[]): boolean;
}
export class FileAlreadyPublicError extends Error {}
/** Polls localManifestByData[dataHash] every intervalMs; resolves with the manifest hash, rejects after timeoutMs. */
export function waitForLocalManifest(delivery: DeliveryPerspective, dataHash: string, timeoutMs: number, intervalMs: number): Promise<EntryId>;
/** Commits the file privately and sends it to `recipient`; resolves with the private manifest hash.
 *  Already-private file: re-sent by the files module, resolves with the existing hash.
 *  Already-public file: rejects with FileAlreadyPublicError without touching the files module.
 *  Commit refused for any other reason (e.g. already in progress): rejects with Error. */
export async function commitPrivateFileForDm(filesDvm: DmFilesPort, file: File, splitObj: SplitObject, recipient: AgentId, timeoutMs?: number): Promise<EntryId>;
```
- `SplitObject` comes from `@ddd-qc/files` (`{dataHash, numChunks, chunks}`). Default `timeoutMs` is `120_000`, poll interval `250`.

- [ ] **Step 1: Write the failing tests** in `tests/src/dm-files-send.test.ts` (happy-dom). Fake: `function fakeFilesDvm(started: boolean) { const p = new DeliveryPerspectiveMutable(); const calls: AgentId[][] = []; return { dvm: { deliveryZvm: { perspective: p, acceptDelivery: async () => EntryId.empty(0), requestMissingChunks: async () => {} }, startCommitPrivateAndSendFile: (_f, _s, recipients) => { calls.push(recipients); return started; } } as DmFilesPort, p, calls }; }`, `const file = new File(['x'], 'a.txt'); const splitObj = {dataHash: 'h1', numChunks: 1, chunks: ['eA==']} as any; const bob = AgentId.empty(7); const eh = EntryId.empty(1);`

```ts
test('fresh file: sends to the one recipient and resolves once the private manifest lands', async () => {
  const { dvm, p, calls } = fakeFilesDvm(true);
  const pending = commitPrivateFileForDm(dvm, file, splitObj, bob, 1000);
  setTimeout(() => { p.localManifestByData['h1'] = [eh, true]; }, 20);
  assert.equal((await pending).b64, eh.b64);
  assert.deepEqual(calls.map((r) => r.map((a) => a.b64)), [[bob.b64]]);
});
test('already private: the module re-sends and the existing manifest hash is returned', async () => {
  const { dvm, p, calls } = fakeFilesDvm(false);
  p.localManifestByData['h1'] = [eh, true];
  assert.equal((await commitPrivateFileForDm(dvm, file, splitObj, bob)).b64, eh.b64);
  assert.equal(calls.length, 1);
});
test('already public: refused without calling the files module', async () => {
  const { dvm, p, calls } = fakeFilesDvm(false);
  p.localManifestByData['h1'] = [eh, false];
  await assert.isRejected(commitPrivateFileForDm(dvm, file, splitObj, bob), FileAlreadyPublicError);
  assert.equal(calls.length, 0);
});
test('commit refused with nothing stored: rejects', async () => {
  const { dvm } = fakeFilesDvm(false);
  await assert.isRejected(commitPrivateFileForDm(dvm, file, splitObj, bob));
});
test('waitForLocalManifest times out', async () => {
  await assert.isRejected(waitForLocalManifest(new DeliveryPerspectiveMutable(), 'h1', 30, 5));
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run src/dm-files-send.test.ts --root tests`
Expected: FAIL, `commitPrivateFileForDm` is not exported.

- [ ] **Step 3: Implement** `DmFilesPort`, `FileAlreadyPublicError`, `waitForLocalManifest`, `commitPrivateFileForDm` in `dm-files.ts`. Order inside `commitPrivateFileForDm`: read `existing = localManifestByData[splitObj.dataHash]`; if `existing && !existing[1]` throw `FileAlreadyPublicError`; call `startCommitPrivateAndSendFile(file, splitObj, [recipient], [])`; if it returned `false`: return `existing[0]` when `existing`, else throw `Error("File commit refused")`; otherwise `return waitForLocalManifest(...)`.

- [ ] **Step 4: Run to verify they pass; typecheck**

Run: `npx vitest run src/dm-files-send.test.ts --root tests && npx tsc --noEmit -p webcomponents/tsconfig.json`
Expected: 5 passed; tsc exits 0.

- [ ] **Step 6: Commit**

```bash
git add webcomponents/src/viewModels/dm-files.ts tests/src/dm-files-send.test.ts
git commit -m "dm-files: commit a file privately for a DM peer and wait for its manifest"
```

---

### Task 4: Accept and resume DM deliveries

**Files:**
- Modify: `webcomponents/src/viewModels/dm-files.ts`
- Create: `tests/src/dm-files-receive.test.ts`

**Interfaces:**
- Produces (exported from `dm-files.ts`):

```ts
export const DM_RETRY_INTERVAL_MS = 30_000;
/** Notices whose sender is a DM peer (a key of dmAgents). */
export function dmNoticesFrom(delivery: DeliveryPerspective, dmAgents: AgentIdMap<ActionId>): [EntryId, DeliveryNotice, NoticeState][];
/** Accepts every Unreplied notice from a DM peer that is not already in `inFlight`; adds accepted ones to inFlight. Returns them. */
export async function acceptDmDeliveries(filesDvm: DmFilesPort, dmAgents: AgentIdMap<ActionId>, inFlight: Set<HoloHashB64>): Promise<EntryId[]>;
/** For each notice from a DM peer: Accepted with no manifest in privateManifests and sender in onlinePeers → acceptDelivery again;
 *  PartiallyReceived → requestMissingChunks. Skips a notice retried less than DM_RETRY_INTERVAL_MS ago (lastRetryAt, keyed by notice b64; updated here). Returns the notices retried. */
export async function resumeDmDeliveries(filesDvm: DmFilesPort, dmAgents: AgentIdMap<ActionId>, onlinePeers: AgentId[], lastRetryAt: Map<HoloHashB64, number>, now: number): Promise<EntryId[]>;
/** Manual retry from the UI for one file: same per-state action as resumeDmDeliveries, no throttle, no online check. No-op without a notice. */
export async function retryDmDelivery(filesDvm: DmFilesPort, lookup: ParcelLookup): Promise<void>;
```

- [ ] **Step 1: Write the failing tests** in `tests/src/dm-files-receive.test.ts` (happy-dom). Fake extends Task 3's with recorded `accepted: EntryId[]` and `requested: EntryId[]`. Fixtures: `alice` (DM peer, `dmAgents.set(alice, ActionId.empty(9))`), `carol` (not a peer), notices `nA` from alice and `nC` from carol with distinct `parcel_eh` values.

```ts
test('accepts an Unreplied notice from a DM peer, not from anyone else, and not twice', async () => {
  const { dvm, p, accepted } = fakeFilesDvm();
  p.notices.set(nAEh, [nA, 0, NoticeState.Unreplied, new Set()]);
  p.notices.set(nCEh, [nC, 0, NoticeState.Unreplied, new Set()]);
  const inFlight = new Set<string>();
  assert.deepEqual((await acceptDmDeliveries(dvm, dmAgents, inFlight)).map((e) => e.b64), [nAEh.b64]);
  assert.deepEqual((await acceptDmDeliveries(dvm, dmAgents, inFlight)).map((e) => e.b64), []);
  assert.deepEqual(accepted.map((e) => e.b64), [nAEh.b64]);
});
test('resume: Accepted without manifest re-accepts only while the sender is online, at most once per interval', async () => {
  const { dvm, p, accepted } = fakeFilesDvm();
  p.notices.set(nAEh, [nA, 0, NoticeState.Accepted, new Set()]);
  const last = new Map<string, number>();
  assert.equal((await resumeDmDeliveries(dvm, dmAgents, [], last, 1000)).length, 0);
  assert.equal((await resumeDmDeliveries(dvm, dmAgents, [alice], last, 1000)).length, 1);
  assert.equal((await resumeDmDeliveries(dvm, dmAgents, [alice], last, 1000 + DM_RETRY_INTERVAL_MS - 1)).length, 0);
  assert.equal((await resumeDmDeliveries(dvm, dmAgents, [alice], last, 1000 + DM_RETRY_INTERVAL_MS)).length, 1);
  assert.equal(accepted.length, 2);
});
test('resume: PartiallyReceived requests missing chunks even when the sender looks offline', async () => {
  const { dvm, p, requested } = fakeFilesDvm();
  p.privateManifests.set(aManifestEh, [aManifest, 0]);
  p.noticeByParcel.set(aManifestEh, nAEh);
  p.notices.set(nAEh, [nA, 0, NoticeState.PartiallyReceived, new Set(['c1'])]);
  await resumeDmDeliveries(dvm, dmAgents, [], new Map(), 0);
  assert.deepEqual(requested.map((e) => e.b64), [nAEh.b64]);
});
test('resume ignores Received, Refused and non-peer notices', async () => {
  const { dvm, p, accepted, requested } = fakeFilesDvm();
  p.notices.set(nAEh, [nA, 0, NoticeState.Received, new Set()]);
  p.notices.set(nCEh, [nC, 0, NoticeState.Accepted, new Set()]);
  await resumeDmDeliveries(dvm, dmAgents, [alice, carol], new Map(), 0);
  assert.equal(accepted.length + requested.length, 0);
});
test('retryDmDelivery acts on the lookup state', async () => {
  const { dvm, p, accepted, requested } = fakeFilesDvm();
  p.notices.set(nAEh, [nA, 0, NoticeState.Accepted, new Set()]);
  p.noticeByParcel.set(aManifestEh, nAEh);
  await retryDmDelivery(dvm, lookupParcel(p, aManifestEh)!);
  assert.equal(accepted.length, 1);
  p.notices.get(nAEh)![2] = NoticeState.PartiallyReceived;
  p.privateManifests.set(aManifestEh, [aManifest, 0]);
  await retryDmDelivery(dvm, lookupParcel(p, aManifestEh)!);
  assert.equal(requested.length, 1);
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run src/dm-files-receive.test.ts --root tests`
Expected: FAIL, functions not exported.

- [ ] **Step 3: Implement** the four functions and the constant in `dm-files.ts`. Peer check: `dmAgents.has(new AgentId(notice.sender))`. Online check: `onlinePeers.some((a) => a.equals(notice.sender))`.

- [ ] **Step 4: Run all dm-files tests; typecheck**

Run: `npx vitest run src/dm-files --root tests && npx tsc --noEmit -p webcomponents/tsconfig.json`
Expected: all passed; tsc exits 0.

- [ ] **Step 6: Commit**

```bash
git add webcomponents/src/viewModels/dm-files.ts tests/src/dm-files-receive.test.ts
git commit -m "dm-files: accept deliveries from DM peers and resume stalled ones"
```

---

### Task 5: Send a DM file through the private path

**Files:**
- Modify: `webapp/src/vines-page.ts:675-717` (`onCreateFileMessage`, the `e.detail.file` branch)

**Interfaces:**
- Consumes: `commitPrivateFileForDm`, `FileAlreadyPublicError` from `@vines/elements/src/viewModels/dm-files` (import path style as the other `@vines/elements/src/...` imports in this file); `this._dvm.threadsZvm.isThreadDm(ppAh): AgentId | null`; `this._dvm.publishMessage(ThreadsEntryType.EntryBead, {eh, size, type}, ppAh, undefined, replyToAh, this.weServices)`.

- [ ] **Step 1: Branch on DM inside the `e.detail.file` block.** Keep `this._uploadingFile = true; this.requestUpdate(); splitFile(...)` as they are. Inside the `.then((obj) => {...})`, before the existing `startPublishFile` call, add:

```ts
const otherAgent = this._dvm.threadsZvm.isThreadDm(ppAh);
if (otherAgent) {
  /*await*/ this.sendPrivateFileMessage(e.detail.file!, obj, otherAgent, ppAh, replyToAh);
  return;
}
```

and add the method (next to `publishDmFromProfilePanel`):

```ts
/** DM files go through the files module's private path: committed on this chain, delivered to
 *  the other party only, never published. There is no callback, so wait for the manifest. */
private async sendPrivateFileMessage(file: File, splitObj: SplitObject, otherAgent: AgentId, ppAh: ActionId, replyToAh?: ActionId): Promise<void>
```

Body: `try { const eh = await commitPrivateFileForDm(this._filesDvm, file, splitObj, otherAgent); await this._dvm.publishMessage(ThreadsEntryType.EntryBead, {eh, size: file.size, type: simplifyMimeType(file.type)}, ppAh, undefined, replyToAh, this.weServices); } catch (e: any) { toasty(e instanceof FileAlreadyPublicError ? msg("This file is already shared with the group, so it can't be sent privately") : msg("Publish Message failed: ") + (e.failure ?? e.message)); put the file back with inputBar.setFile(file) as the public branch does; } finally { this._splitObj = undefined; this._uploadingFile = false; this._waitingForBeadCommit = undefined; }`

The `ppAh` for a DM is always an existing thread here (the DM view is opened by `createDmThread`), and `publishMessage` → `publishDm` creates the thread anyway if `dmAgents` lacks it, so the lazy-creation edge case needs no extra code.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p webapp/tsconfig.json`
Expected: exits 0. (If this tsconfig needs `webcomponents/dist`, run `npm run build -w webcomponents` first.)

- [ ] **Step 3: Grep that no DM path can reach the public store**

Run: `grep -n "startPublishFile" webapp/src/vines-page.ts`
Expected: three hits (channel file message, file import loop, "open file" in the files view), none inside `sendPrivateFileMessage`.

- [ ] **Step 4: Commit**

```bash
git add webapp/src/vines-page.ts
git commit -m "DM: attachments and voice messages are committed privately and delivered to the peer"
```

---

### Task 6: Auto-accept and resume DM deliveries in the page

**Files:**
- Modify: `webapp/src/vines-page.ts` (`firstUpdated` near line 1284 where `this._filesDvm.probeAll(GetStrategy.Local)` runs; `updated` at line 1296; `disconnectedCallback` at line 493; `probeAllSoon` at line 1544)

**Interfaces:**
- Consumes: `acceptDmDeliveries`, `resumeDmDeliveries` from `dm-files.ts`; `this._dvm.threadsZvm.perspective.dmAgents`; `this._dvm.allCurrentOthers()` (agents seen in the last 5 minutes); `this._filesDvm.isMainView`; `this._filesDvm.subscribe(this, 'filesPerspective')` (ViewModel API, the same call the files module's inbox makes on `deliveryZvm`).

- [ ] **Step 1: Subscribe to the files DVM and add the maintenance method.** In `firstUpdated`, right after the existing `this._filesDvm.probeAll(GetStrategy.Local)`, add `this._filesDvm.subscribe(this, 'filesPerspective');` with a `@state() filesPerspective?: FilesDvmPerspective;` field (`FilesDvmPerspective` from `@ddd-qc/files`). In `disconnectedCallback` add `this._filesDvm?.unsubscribe(this);`. Add fields `private _dmAcceptInFlight = new Set<HoloHashB64>(); private _dmRetryAt = new Map<HoloHashB64, number>();` and:

```ts
/** DM files are delivered through the files module; accept what a DM peer sends without the
 *  files inbox's Accept button, and poke transfers that stalled while one side was offline.
 *  Only the main view does this: several views of the same cell would each reply. */
private async maintainDmDeliveries(): Promise<void>
```

Body: `if (!this._filesDvm || !this._filesDvm.isMainView) return; const dmAgents = this._dvm.threadsZvm.perspective.dmAgents; await acceptDmDeliveries(this._filesDvm, dmAgents, this._dmAcceptInFlight); await resumeDmDeliveries(this._filesDvm, dmAgents, this._dvm.allCurrentOthers(), this._dmRetryAt, Date.now());` wrapped in try/catch that `console.warn`s.

- [ ] **Step 2: Call it.** At the top of `updated(_changedProperties)`: `if (_changedProperties.has('filesPerspective') || _changedProperties.has('threadsPerspective')) { /*await*/ this.maintainDmDeliveries(); }`. In `probeAllSoon`, in the `.finally` before the queued re-run, add `/*await*/ this.maintainDmDeliveries();` so a peer coming online (which triggers `probeAllSoon`) retries stalled transfers.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit -p webapp/tsconfig.json`
Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add webapp/src/vines-page.ts
git commit -m "DM: accept files a DM peer sends, and restart transfers that stalled"
```

---

### Task 7: Render private files, with a placeholder while they arrive

**Files:**
- Modify: `webcomponents/src/features/chat-thread/chat-file.ts` (`willUpdate`, `loadFileData`, `probeForFileManifest`, `render`)
- Modify: `webcomponents/src/utils.ts:466-476` (`determineBeadName`, `EntryBead` case)
- Modify: `webcomponents/src/features/chat-thread/side-item.ts:139-153` (`EntryBead` case)
- Modify: `webcomponents/src/features/chat-thread/chat-item.ts:244-255` and `:413-416` (`downloadItem`)

**Interfaces:**
- Consumes: `lookupParcel`, `isParcelReady`, `retryDmDelivery` from `../../viewModels/dm-files` (or `../viewModels/dm-files` from `utils.ts`); `this._filesDvm.deliveryZvm.perspective`; `this._filesDvm.deliveryZvm.subscribe(this, 'deliveryPerspective')` / `unsubscribe(this)`.

- [ ] **Step 1: `chat-file.ts`.**
  - `willUpdate`: replace the `localPublicManifests.get(entryBead.sourceEh)` cache check with `lookupParcel(...)?.manifest`. Subscribe once to `this._filesDvm.deliveryZvm` with a `@state() deliveryPerspective?: DeliveryPerspective` field (guard with a private `_subscribed` flag; `unsubscribe` in `disconnectedCallback`). When `changedProperties.has('deliveryPerspective')` and the file was pending on the previous render (`private _wasPending = false`) and `isParcelReady(lookup)` now, call `loadFileData(this._filesDvm.dnaProperties.maxChunkSize)`.
  - `loadFileData`: before `getFileInfoFromLocal`, `const lookup = lookupParcel(...)`; if `lookup && !isParcelReady(lookup)` set `_loading = false; _file = null; _manifest = undefined;` and return (the placeholder renders).
  - `render`: after the `_loading` check, compute `entryBead` and `lookup`. If `lookup && !isParcelReady(lookup)`: set `_wasPending = true` and return the placeholder:

```ts
<ui5-list id="fileList" style="max-width: 300px;">
  <ui5-li id="fileLi" icon="download" description=${prettyFileSize(lookup.description.size) + " · " + stateLabel}
          @click=${async (e: any) => { e.stopPropagation(); e.preventDefault(); await retryDmDelivery(this._filesDvm, lookup); }}>
    ${lookup.description.name}
  </ui5-li>
</ui5-list>
```
  where `stateLabel` is `msg("Waiting to accept")` for `Unreplied`, `msg("Waiting for sender")` for `Accepted`, `msg("Receiving…")` for `PartiallyReceived`, `msg("Not received")` for `Refused`/`Deleted`. Otherwise set `_wasPending = false`, and replace `const filePprm = ...publicParcels.get(manifestEh)` with `lookup`, keeping the existing retry-once / "File data not found" branches for `lookup === undefined`, and `const fileDesc = lookup.description`.
  - `probeForFileManifest`: replace `publicParcels.get(manifestEh)` with `lookupParcel(...)`; a private pending lookup calls `retryDmDelivery` instead of `probeDht`.

- [ ] **Step 2: `utils.ts` `determineBeadName`:** `const lookup = lookupParcel(filesDvm.deliveryZvm.perspective, fileBead.sourceEh); return lookup ? lookup.description.name : "<file>";`

- [ ] **Step 3: `side-item.ts`:** replace the `publicParcels` / `localPublicManifests` pair with `lookupParcel(...)?.description`.

- [ ] **Step 4: `chat-item.ts`:** in the render, `const fileLookup = lookupParcel(...)` for an `EntryBead`, and `downloadItem = html\`<ui5-menu-item id="downloadItem" icon="download" text=${msg("Download File")} ?disabled=${!fileLookup || !isParcelReady(fileLookup)}></ui5-menu-item>\``. In the `downloadItem` handler, call `downloadFile` only when ready, otherwise `toasty(msg("File not received yet"))`.

- [ ] **Step 5: Typecheck and grep**

Run: `npx tsc --noEmit -p webcomponents/tsconfig.json && grep -n "publicParcels\|localPublicManifests" webcomponents/src/features/chat-thread/chat-file.ts webcomponents/src/features/chat-thread/side-item.ts webcomponents/src/features/chat-thread/chat-item.ts webcomponents/src/utils.ts`
Expected: tsc exits 0; the grep prints nothing (every lookup goes through `lookupParcel`).

- [ ] **Step 6: Commit**

```bash
git add webcomponents/src/features/chat-thread/chat-file.ts webcomponents/src/features/chat-thread/side-item.ts webcomponents/src/features/chat-thread/chat-item.ts webcomponents/src/utils.ts
git commit -m "files: a DM file renders from the private store, with a placeholder until it arrives"
```

---

### Task 8: Input bar in a DM, full build, and verification

**Files:**
- Modify: `webcomponents/src/elements/input-bar.ts:713` (voice filename)
- Modify: `docs/superpowers/specs/2026-10-30-dm-private-files-brief.md` ("Open questions" section)

- [ ] **Step 1: Voice filename.** `this.topic` is the thread title passed by `vines-page`; keep it, but fall back so a DM without a title never yields `undefined-...opus`: `const filename = \`${this.topic || msg("voice")}-${myProfile.nickname}-${day}.opus\`;`. Nothing else changes: `canFile` from the zome already shows the attach and microphone buttons, and `?disabled=${!this._limitations.canWal}` keeps "Embed an Asset" off.

- [ ] **Step 2: Answer the brief's open questions** by replacing the "Open questions I did not verify" section with a short "Answers" section stating what the "How the delivery zome actually moves a private file" section of this plan says (sender must be online for the bytes; `acceptDelivery` alone pulls the manifest and chunks when the sender answers; `fetchFileInfo`/`downloadFile` handle private manifests).

- [ ] **Step 3: Import/export leaves private files out (verification only).** Every DM bead is an `EncryptedBead`, and `ThreadsZvm.publishAllFromSnapshot` skips those (`case ThreadsEntryType.EncryptedBead: continue;` near `webcomponents/src/viewModels/threads.zvm.ts:1582`); the files export (`FilesDvm.exportPerspective` → `DeliveryPerspective.makeSnapshot`) only lists `localPublicManifests`. Confirm both by reading those lines; no code change. Run `grep -n "EncryptedBead: {" webcomponents/src/viewModels/threads.zvm.ts` and expect the `continue` branch.

- [ ] **Step 4: Automated verification**

Run, from the worktree root:
```bash
npx tsc --noEmit -p webcomponents/tsconfig.json
npx tsc --noEmit -p webapp/tsconfig.json
npm run check:colors
npm run test:theme
npm run test:scripts
npm run build:webapp
npm run build -w we-applet
nix develop -c npm run build:happ
npx vitest run --root tests
```
Expected: every command exits 0; vitest reports the two tryorama tests and all `dm-files*` unit tests passing, plus the existing perspective tests.

- [ ] **Step 5: Manual verification (two agents, `npm run devtest`)**, recorded in the final report as done or not done:
  - Attach and microphone buttons appear in a DM; the add menu's "Embed an Asset" is disabled.
  - Send a file and a voice message in a DM both ways with both online: the recipient sees the placeholder briefly, then the file; audio plays; download works; nothing appears in the files view's public list.
  - Recipient offline at send: on return, the file arrives without an Accept click once the sender is online; with the sender offline the placeholder reads "Waiting for sender" and a click retries.
  - A channel file still uploads, renders and downloads as before.

- [ ] **Step 6: Commit**

```bash
git add webcomponents/src/elements/input-bar.ts docs/superpowers/specs/2026-10-30-dm-private-files-brief.md
git commit -m "DM: voice file name falls back when the thread has no title; brief's open questions answered"
```
