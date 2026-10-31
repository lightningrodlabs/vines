# Brief: files and voice messages in direct messages

Written for an agent starting this work in a fresh worktree off `hdk-7.0`.
Read this, then brainstorm or plan as the superpowers workflow requires.

## Goal

A direct message (DM) conversation can carry file attachments and voice messages,
exactly as a channel can, without the content ever being published to the
shared network. Asset links (WALs) in DMs are a separate, small change and are
**out of scope** here.

## Why DMs are text-only today

`dna/zomes/threads/src/dm/publish_dm_thread.rs` creates every DM with
`limitations.can_file = None` and `can_wal = false`, with the comment
"files are not encrypted". The input bar reads those limitations from the
thread's `pp` and hides the attach and microphone buttons when `canFile` is
unset (`webcomponents/src/elements/input-bar.ts`, `willUpdate` and `render`).

DM text is private because each message is an `EncryptedBead` (encrypted once
for each party). Channel files go through the files module's **public** path:
`filesDvm.startPublishFile(...)` in `webapp/src/vines-page.ts`
(`onCreateFileMessage`), then an `EntryBead` message pointing at the public
manifest. Nothing today uses the files module's **private** path.

## Constraints

- **New DNA, no compatibility.** This ships on a new DNA hash. Existing DMs
  need no migration; the zome and the client may both change freely.
- Private content must never land in the public files store: no
  `startPublishFile`, no public manifest, no public parcel for a DM file.
- A DM file message must be an `EntryBead` (so the existing message rendering,
  inbox, search, and import/export keep working), but one whose `sourceEh`
  is a **private** manifest.
- Do not add `Co-Authored-By` or any attribution lines to commits
  (user rule, overrides tool defaults).

## The private path in the files module (`@ddd-qc/files` 0.9.12, `@ddd-qc/delivery` 0.22.0)

Read these before designing; they are in `node_modules/@ddd-qc/files/dist/viewModels/files.dvm.js`
and `node_modules/@ddd-qc/delivery/dist/viewModels/delivery.zvm.js`.

- `filesDvm.startCommitPrivateAndSendFile(file, splitObj, recipients, tags)`:
  commits the file privately on the sender's chain, then distributes it to the
  recipients through the delivery zome (`_sendFile`). It has **no callback**
  parameter, unlike `startPublishFile`; completion shows up as a
  `PrivateCommitComplete` entry in `filesDvm.perspective.notificationLogs`
  and the manifest in `deliveryZvm.perspective.privateManifests`.
- On the recipient's side a `DeliveryNotice` arrives
  (`NewNoticeReceived` in the notification logs, `deliveryZvm.perspective.notices`).
  The recipient must call `deliveryZvm.acceptDelivery(noticeEh)`; the files
  module's own inbox element does this with an Accept button. Chunks then
  transfer and a `ReceptionProof` marks completion (`ReceptionComplete`).
  Look at `requestMissingChunks` and `fetchParcelData` for how a received
  parcel is pulled in.
- Rendering (`webcomponents/src/features/chat-thread/chat-file.ts`) and the
  filename helper (`webcomponents/src/utils.ts`, `EntryBead` case) only look
  in `localPublicManifests` / `publicParcels`. They must also look in
  `privateManifests` for a DM file.
- `filesDvm.downloadFile(manifestEh)` goes through `deliveryZvm.fetchFileInfo`;
  check that it resolves a private manifest. The `fileCache` keyed by
  manifest entry hash is shared and should work for both.

## Pieces of the work

1. **Zome.** In `publish_dm_thread.rs`, give DMs file limits (keep
   `can_wal = false`). Decide whether the file size limits should match
   channels; the client currently uses `DEFAULT_MAX_FILE_SIZE` from
   `webcomponents/src/viewModels/threads.materialize.ts`.
2. **Sending.** In `vines-page.ts` `onCreateFileMessage`, branch on
   `threadsZvm.isThreadDm(ppAh)`: for a DM, use the private commit-and-send
   with the other party as the single recipient, wait for the private manifest
   (there is no callback, so watch the notification logs or
   `privateManifests`), then `publishMessage(EntryBead, {eh, size, type}, ppAh)`
   as today. Voice messages arrive through the same handler as a `File`
   (`input-bar.ts` `mic-dialog`, `audio-panel.ts`), so they need no separate
   path.
3. **Receiving.** Accept deliveries automatically when the sender is the other
   party of a DM thread the receiver has (`DM` link / `isThreadDm`), and only
   then. Decide where this lives: probably in `ThreadsDvm` where files and
   threads are both reachable (`webcomponents/src/viewModels/threads.dvm.ts`),
   reacting to `NewNoticeReceived`. Everything else should still require the
   files module's manual accept.
4. **Rendering.** `chat-file.ts`, the `EntryBead` filename helper in `utils.ts`,
   and `chat-item.ts` `downloadItem` must resolve private manifests. A file
   that has not arrived yet (recipient was offline, transfer in progress)
   needs a visible placeholder instead of an error; the sender sees their own
   file at once. Decide what "retry" means for a pending private file.
5. **Input bar.** Nothing to change if the zome sets `can_file`; verify the
   attach, add-menu and microphone buttons appear in a DM and that the
   add menu's "Embed an Asset" stays disabled (`canWal` false).
6. **Edge cases to settle.** A DM thread is created lazily when the first
   message is sent to a peer (`createDmThread` in `vines-page.ts`,
   `publishDmFromProfilePanel`); a first message that is a file must still
   create the thread first. Import/export (`webcomponents/src/features/migration/`)
   and `ThreadsZvm.import` (`_canNotify`) should skip or clearly mark private
   files. Check `startCommitPrivateFile`'s "File already stored locally"
   branch: it re-sends but returns `false`.

## Verification

- Automated: `npx tsc --noEmit -p webcomponents/tsconfig.json`,
  `npx tsc --noEmit -p webapp/tsconfig.json`, `npm run check:colors`,
  `npm run test:theme`, `npm run test:scripts`, `npm run build:webapp`,
  `npm run build -w we-applet`. Zome changes need `npm run build:happ`
  (nix shell) and the tryorama tests in `tests/` (`vitest`); add a test that
  a new DM's `pp.limitations.can_file` is set.
- Manual, two agents (`npm run devtest` runs two instances): send a file and a
  voice message in a DM both ways, with the recipient online and then with the
  recipient offline at send time; confirm the file plays or downloads on both
  sides; confirm nothing appears in the files module's public list; confirm a
  channel file still works as before.

## Answers to the open questions (verified in `delivery-zome` rev `e4427d1`)

- **Offline recipient.** The `DeliveryNotice` reaches them: a direct message is
  tried first, then a pending item in the recipient's DHT inbox, which
  `process_inbox` (run by `deliveryZvm.probeDht`) picks up later. The manifest
  and chunk bytes, however, only travel by direct message, pulled by the
  recipient once the sender has answered its `NoticeReply`. So the sender must
  be online for the transfer itself; a reply sent while the sender was offline
  leaves the notice `Accepted` with no manifest, and the client replies again
  when the sender is seen online (`resumeDmDeliveries` in
  `webcomponents/src/viewModels/dm-files.ts`).
- **`acceptDelivery` alone** pulls the manifest and then every chunk, through
  the `NoticeReply` and `PrivateManifest` post-commit callbacks, provided the
  sender answers the reply directly. `requestMissingChunks` is only needed for
  a transfer that stopped after the manifest arrived (`PartiallyReceived`).
- **`fetchFileInfo` and `downloadFile`** check `privateManifests` first and
  `fetchChunk` reads the local chain, so a private manifest the receiver holds
  resolves without changes.
- **One copy per chain.** A file's bytes are stored once on an agent's chain
  by default: the files module keys local manifests by data hash and refuses
  a commit in either visibility when one exists, and the zome never checks.
  Sharing one file both privately and with the group is therefore a second
  copy (private and public chunks are different entry types), and the client
  only writes it after the user confirms in a dialog (`commitFileCopy` in
  `webcomponents/src/viewModels/dm-files.ts`, driving the zome directly since
  the module's upload path stops once any manifest for the data hash exists).
  The two copies on the two peers' chains are inherent to the private path.
