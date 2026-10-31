import {ActionId, AgentId, AgentIdMap, EntryId} from "@ddd-qc/lit-happ";
import {HoloHashB64} from "@holochain/client";
import {
  DeliveryNotice,
  DeliveryPerspective,
  NoticeState,
  ParcelChunk,
  ParcelDescription,
  ParcelManifest,
} from "@ddd-qc/delivery";
import {SplitObject} from "@ddd-qc/files";

/**
 * Files in direct messages (DMs).
 *
 * A channel file is published to the group through the files module's public path. A DM file
 * goes through its private path instead: committed on the sender's chain and delivered to the
 * other party only, so it never reaches the public files store. This module holds the logic
 * that differs for the private path, kept free of Lit so it can be tested without a conductor.
 */


/** -- Lookup -- */

/** What is known about a file bead's manifest, wherever it is stored. */
export interface ParcelLookup {
  description: ParcelDescription;
  /** Set when the manifest is on the local chain. */
  manifest?: ParcelManifest;
  isPrivate: boolean;
  /** Set on the receiving side of a private file. */
  noticeEh?: EntryId;
  /** State of that notice. */
  noticeState?: NoticeState;
}


/** Finds a file by manifest hash in, in order: privateManifests, localPublicManifests,
 *  publicParcels, and finally a DeliveryNotice (noticeByParcel) for a private file not yet
 *  received. */
export function lookupParcel(delivery: DeliveryPerspective, manifestEh: EntryId): ParcelLookup | undefined {
  const maybePrivate = delivery.privateManifests.get(manifestEh);
  if (maybePrivate) {
    const lookup: ParcelLookup = {description: maybePrivate[0].description, manifest: maybePrivate[0], isPrivate: true};
    attachNotice(delivery, manifestEh, lookup);
    return lookup;
  }
  const maybeLocalPublic = delivery.localPublicManifests.get(manifestEh);
  if (maybeLocalPublic) {
    return {description: maybeLocalPublic[0].description, manifest: maybeLocalPublic[0], isPrivate: false};
  }
  const maybePublic = delivery.publicParcels.get(manifestEh);
  if (maybePublic) {
    return {description: maybePublic.description, isPrivate: false};
  }
  const notice = noticeFor(delivery, manifestEh);
  if (notice) {
    const lookup: ParcelLookup = {description: notice[1].summary.parcel_reference.description, isPrivate: true};
    attachNotice(delivery, manifestEh, lookup);
    return lookup;
  }
  return undefined;
}


/** True when the bytes can be fetched locally: any public file, a private file the agent
 *  authored (no notice), or a received private file whose manifest is on the chain and whose
 *  notice no longer has chunks outstanding. The notice state alone is not enough: the delivery
 *  zome auto-rejects a notice for a parcel the agent already holds (a file sent twice), and
 *  that Refused notice then shadows the Received one for the same manifest. */
export function isParcelReady(lookup: ParcelLookup): boolean {
  if (!lookup.isPrivate || !lookup.noticeEh) {
    return true;
  }
  if (lookup.manifest) {
    return lookup.noticeState != NoticeState.Accepted && lookup.noticeState != NoticeState.PartiallyReceived;
  }
  return lookup.noticeState == NoticeState.Received;
}


/** The DeliveryNotice announcing this manifest to us, if any. */
function noticeFor(delivery: DeliveryPerspective, manifestEh: EntryId): [EntryId, DeliveryNotice, NoticeState] | undefined {
  const noticeEh = delivery.noticeByParcel.get(manifestEh);
  if (!noticeEh) {
    return undefined;
  }
  const tuple = delivery.notices.get(noticeEh);
  if (!tuple) {
    return undefined;
  }
  return [noticeEh, tuple[0], tuple[2]];
}


function attachNotice(delivery: DeliveryPerspective, manifestEh: EntryId, lookup: ParcelLookup) {
  const notice = noticeFor(delivery, manifestEh);
  if (notice) {
    lookup.noticeEh = notice[0];
    lookup.noticeState = notice[2];
  }
}


/** -- Sending -- */

/** The slice of FilesDvm this module uses. FilesDvm satisfies it structurally; tests pass a fake. */
export interface DmFilesPort {
  deliveryZvm: {
    perspective: DeliveryPerspective;
    acceptDelivery(noticeEh: EntryId): Promise<EntryId>;
    requestMissingChunks(noticeEh: EntryId): Promise<void>;
  };
  startCommitPrivateAndSendFile(file: File, splitObj: SplitObject, recipients: AgentId[], tags: string[]): boolean;
}


/** The file was already shared with the group through the public path. Sending it privately
 *  would put a second copy of its bytes on the chain, which needs the user's consent
 *  (sendPrivateCopyForDm). */
export class FileAlreadyPublicError extends Error {
  constructor(name: string) {
    super(`File "${name}" is already shared publicly`);
  }
}


/** -- Second copies -- */

/** One chain holds a file's bytes once by default: the files module refuses to commit a data
 *  hash it already has in either visibility, and the zome does not check. Private and public
 *  chunks are different entry types, so sharing one file both ways means a second copy, and
 *  that only happens with the user's consent through commitFileCopy. The module's own upload
 *  path cannot write it (it stops as soon as any manifest for the data hash exists), so the
 *  copy goes through the zome directly, batched like the module does. */

/** Manifests on this chain for one data hash, by visibility. localManifestByData keeps only
 *  one of them, so the manifest maps are scanned instead. */
export interface LocalCopies {
  privateEh?: EntryId;
  publicEh?: EntryId;
}


export function findLocalCopies(delivery: DeliveryPerspective, dataHash: string): LocalCopies {
  const copies: LocalCopies = {};
  for (const [eh, [manifest]] of delivery.privateManifests.entries()) {
    if (manifest.data_hash == dataHash) {
      copies.privateEh = eh;
      break;
    }
  }
  for (const [eh, [manifest]] of delivery.localPublicManifests.entries()) {
    if (manifest.data_hash == dataHash) {
      copies.publicEh = eh;
      break;
    }
  }
  return copies;
}


/** The slice of FilesDvm used to write a copy without the module's upload path. */
export interface FileCopyPort {
  dnaProperties: {maxChunkSize: number};
  filesZvm: {
    zomeProxy: {
      writePrivateFileChunks(chunks: ParcelChunk[]): Promise<Uint8Array[]>;
      writePublicFileChunks(chunks: ParcelChunk[]): Promise<Uint8Array[]>;
    };
    commitPrivateManifest(file: File, dataHash: string, chunks: EntryId[]): Promise<EntryId>;
    publishFileManifest(file: File, dataHash: string, chunks: EntryId[]): Promise<EntryId>;
    sendFile(manifestEh: EntryId, recipients: AgentId[]): Promise<ActionId>;
  };
}


/** Largest zome call payload the conductor's websocket accepts; chunks are batched under it. */
export const MAX_WEBSOCKET_PAYLOAD = 8 * 1024 * 1024;


/** Writes the file's chunks and manifest on this chain with the given visibility, regardless
 *  of what the chain already holds for that data hash. Resolves with the manifest hash.
 *  Only called after the user consented to a second copy. */
export async function commitFileCopy(filesDvm: FileCopyPort, file: File, splitObj: SplitObject, isPrivate: boolean): Promise<EntryId> {
  const perBatch = Math.max(1, Math.floor(MAX_WEBSOCKET_PAYLOAD / filesDvm.dnaProperties.maxChunkSize));
  const chunkIds: EntryId[] = [];
  for (let index = 0; index < splitObj.numChunks; index += perBatch) {
    const batch: ParcelChunk[] = splitObj.chunks
      .slice(index, index + perBatch)
      .map((data) => ({data_hash: splitObj.dataHash, data}));
    const ehs = isPrivate
      ? await filesDvm.filesZvm.zomeProxy.writePrivateFileChunks(batch)
      : await filesDvm.filesZvm.zomeProxy.writePublicFileChunks(batch);
    for (const eh of ehs) {
      chunkIds.push(new EntryId(eh));
    }
  }
  return isPrivate
    ? filesDvm.filesZvm.commitPrivateManifest(file, splitObj.dataHash, chunkIds)
    : filesDvm.filesZvm.publishFileManifest(file, splitObj.dataHash, chunkIds);
}


/** Consented second copy for a DM: writes the private copy and sends it to `recipient`.
 *  Resolves with the private manifest hash. */
export async function sendPrivateCopyForDm(filesDvm: FileCopyPort, file: File, splitObj: SplitObject, recipient: AgentId): Promise<EntryId> {
  const manifestEh = await commitFileCopy(filesDvm, file, splitObj, true);
  await filesDvm.filesZvm.sendFile(manifestEh, [recipient]);
  return manifestEh;
}


/** Polls localManifestByData[dataHash] every intervalMs; resolves with the manifest hash,
 *  rejects after timeoutMs. The files module has no callback for a private commit; the
 *  manifest's entry pulse on this chain is what marks it done. */
export function waitForLocalManifest(delivery: DeliveryPerspective, dataHash: string, timeoutMs: number, intervalMs: number): Promise<EntryId> {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const check = () => {
      const pair = delivery.localManifestByData[dataHash];
      if (pair) {
        resolve(pair[0]);
        return;
      }
      if (Date.now() >= deadline) {
        reject(new Error("Timed out waiting for the private manifest"));
        return;
      }
      setTimeout(check, intervalMs);
    };
    check();
  });
}


/** Commits the file privately and sends it to `recipient`; resolves with the private manifest
 *  hash. Already-private file: the existing manifest is sent again directly (the files
 *  module's re-send looks the manifest up through localManifestByData, which may point at a
 *  public copy of the same data) and its hash returned. Public copy only: rejects with
 *  FileAlreadyPublicError without touching the files module; the caller may then ask for
 *  consent and call sendPrivateCopyForDm. Commit refused for any other reason (e.g. already
 *  in progress): rejects with Error. */
export async function commitPrivateFileForDm(filesDvm: DmFilesPort & FileCopyPort, file: File, splitObj: SplitObject, recipient: AgentId, timeoutMs: number = 120_000): Promise<EntryId> {
  const copies = findLocalCopies(filesDvm.deliveryZvm.perspective, splitObj.dataHash);
  if (copies.privateEh) {
    await filesDvm.filesZvm.sendFile(copies.privateEh, [recipient]);
    return copies.privateEh;
  }
  if (copies.publicEh) {
    throw new FileAlreadyPublicError(file.name);
  }
  const started = filesDvm.startCommitPrivateAndSendFile(file, splitObj, [recipient], []);
  if (!started) {
    throw new Error("File commit refused");
  }
  return waitForLocalManifest(filesDvm.deliveryZvm.perspective, splitObj.dataHash, timeoutMs, 250);
}


/** -- Receiving -- */

/** How the delivery zome moves a private file, which decides the policy below: the notice
 *  reaches the recipient even offline (DHT inbox fallback), but the manifest and chunks only
 *  travel by direct message, pulled by the recipient once the sender has answered its reply.
 *  So a reply sent while the sender was offline leaves the notice Accepted with no manifest,
 *  and the fix is to reply again while the sender is online. Missing chunks after the
 *  manifest arrived are pulled by requestMissingChunks. */

/** Least time between two automatic retries of the same stalled transfer. */
export const DM_RETRY_INTERVAL_MS = 30_000;


/** Notices whose sender is a DM peer (a key of dmAgents). */
export function dmNoticesFrom(delivery: DeliveryPerspective, dmAgents: AgentIdMap<ActionId>): [EntryId, DeliveryNotice, NoticeState][] {
  const res: [EntryId, DeliveryNotice, NoticeState][] = [];
  for (const [noticeEh, [notice, _ts, state, _chunks]] of delivery.notices.entries()) {
    if (dmAgents.has(new AgentId(notice.sender))) {
      res.push([noticeEh, notice, state]);
    }
  }
  return res;
}


/** Accepts every Unreplied notice from a DM peer that is not already in `inFlight`; adds the
 *  accepted ones to inFlight (the perspective only learns the new state from the reply's
 *  entry pulse, so a second call in between must not reply again). A notice for a parcel
 *  already on the chain is left alone: the zome rejects it itself. A reply that fails is
 *  logged, taken out of inFlight so a later pass retries it, and does not stop the others.
 *  Returns the notices accepted. */
export async function acceptDmDeliveries(filesDvm: DmFilesPort, dmAgents: AgentIdMap<ActionId>, inFlight: Set<HoloHashB64>): Promise<EntryId[]> {
  const delivery = filesDvm.deliveryZvm.perspective;
  const accepted: EntryId[] = [];
  for (const [noticeEh, notice, state] of dmNoticesFrom(delivery, dmAgents)) {
    if (state != NoticeState.Unreplied || inFlight.has(noticeEh.b64)) {
      continue;
    }
    if (delivery.privateManifests.get(new EntryId(notice.summary.parcel_reference.parcel_eh))) {
      continue;
    }
    inFlight.add(noticeEh.b64);
    try {
      await filesDvm.deliveryZvm.acceptDelivery(noticeEh);
      accepted.push(noticeEh);
    } catch (e) {
      inFlight.delete(noticeEh.b64);
      console.warn("acceptDmDeliveries() reply failed for", noticeEh.short, e);
    }
  }
  return accepted;
}


/** For each notice from a DM peer: Accepted with no manifest in privateManifests and the
 *  sender in onlinePeers → acceptDelivery again; PartiallyReceived → requestMissingChunks.
 *  Skips a notice retried less than DM_RETRY_INTERVAL_MS ago (lastRetryAt, keyed by notice
 *  hash, updated here). Returns the notices retried. */
export async function resumeDmDeliveries(filesDvm: DmFilesPort, dmAgents: AgentIdMap<ActionId>, onlinePeers: AgentId[], lastRetryAt: Map<HoloHashB64, number>, now: number): Promise<EntryId[]> {
  const delivery = filesDvm.deliveryZvm.perspective;
  const retried: EntryId[] = [];
  for (const [noticeEh, notice, state] of dmNoticesFrom(delivery, dmAgents)) {
    const last = lastRetryAt.get(noticeEh.b64);
    if (last !== undefined && now - last < DM_RETRY_INTERVAL_MS) {
      continue;
    }
    if (state == NoticeState.PartiallyReceived) {
      lastRetryAt.set(noticeEh.b64, now);
      await filesDvm.deliveryZvm.requestMissingChunks(noticeEh);
      retried.push(noticeEh);
      continue;
    }
    if (state == NoticeState.Accepted) {
      const manifestEh = new EntryId(notice.summary.parcel_reference.parcel_eh);
      const senderOnline = onlinePeers.some((agent) => agent.equals(notice.sender));
      if (delivery.privateManifests.get(manifestEh) || !senderOnline) {
        continue;
      }
      lastRetryAt.set(noticeEh.b64, now);
      await filesDvm.deliveryZvm.acceptDelivery(noticeEh);
      retried.push(noticeEh);
    }
  }
  return retried;
}


/** Manual retry from the UI for one file: the same per-state action as resumeDmDeliveries,
 *  with no throttle and no online check. No-op without a notice. */
export async function retryDmDelivery(filesDvm: DmFilesPort, lookup: ParcelLookup): Promise<void> {
  if (!lookup.noticeEh) {
    return;
  }
  switch (lookup.noticeState) {
    case NoticeState.Unreplied:
    case NoticeState.Accepted:
      await filesDvm.deliveryZvm.acceptDelivery(lookup.noticeEh);
      break;
    case NoticeState.PartiallyReceived:
      await filesDvm.deliveryZvm.requestMissingChunks(lookup.noticeEh);
      break;
    default:
      break;
  }
}
