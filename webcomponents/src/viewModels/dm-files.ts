import {AgentId, EntryId} from "@ddd-qc/lit-happ";
import {
  DeliveryNotice,
  DeliveryPerspective,
  NoticeState,
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
 *  authored (no notice), or a received private file whose notice is in state Received. */
export function isParcelReady(lookup: ParcelLookup): boolean {
  if (!lookup.isPrivate || !lookup.noticeEh) {
    return true;
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


/** The file was already shared with the group through the public path; it cannot also be
 *  sent privately (the files module would try to re-send a public manifest as private). */
export class FileAlreadyPublicError extends Error {
  constructor(name: string) {
    super(`File "${name}" is already shared publicly`);
  }
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
 *  hash. Already-private file: the files module re-sends it, and the existing hash is returned.
 *  Already-public file: rejects with FileAlreadyPublicError without touching the files module.
 *  Commit refused for any other reason (e.g. already in progress): rejects with Error. */
export async function commitPrivateFileForDm(filesDvm: DmFilesPort, file: File, splitObj: SplitObject, recipient: AgentId, timeoutMs: number = 120_000): Promise<EntryId> {
  const existing = filesDvm.deliveryZvm.perspective.localManifestByData[splitObj.dataHash];
  if (existing && !existing[1]) {
    throw new FileAlreadyPublicError(file.name);
  }
  const started = filesDvm.startCommitPrivateAndSendFile(file, splitObj, [recipient], []);
  if (!started) {
    if (existing) {
      return existing[0];
    }
    throw new Error("File commit refused");
  }
  return waitForLocalManifest(filesDvm.deliveryZvm.perspective, splitObj.dataHash, timeoutMs, 250);
}
