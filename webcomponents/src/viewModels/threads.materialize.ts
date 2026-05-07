import {
    AnyBead, BaseBeadKind, Bead,
    EncryptedBead,
    EntryBead, FileLimits, Limitations, Moderation,
    ParticipationProtocol, Subject,
    TextBead, TextLimits,
    ThreadsEntryType
} from "../bindings/threads.types";
import {WAL} from "@theweave/api";
import {ActionId, AgentId, EntryId} from "@ddd-qc/lit-happ";
import {ActionHashB64, AgentPubKeyB64, Timestamp} from "@holochain/client";


/** -- Should be defined in @holochain/client */
//export const HOLOCHAIN_EPOCH = 1640995200000000;

export type TypedBaseBead = EntryBead | AnyBead | TextBead;
export type TypedBead = TypedBaseBead | EncryptedBead;

export type TypedContent = string | WAL | FileContent;

export type BaseBeadType = ThreadsEntryType.TextBead | ThreadsEntryType.EntryBead | ThreadsEntryType.AnyBead
export type BeadType = BaseBeadType | ThreadsEntryType.EncryptedBead;

export interface EncryptedBeadContent {
  encBead: EncryptedBead,
  otherAgent: AgentId
}


export type FileContent = { eh: EntryId, size: number, type: string }


/**  */
export enum NotifiableEvent {
  NewBead = 'NewBead',
  Mention = 'Mention',
  Reply = 'Reply',
  Fork = 'Fork',
  NewDmThread = 'NewDmThread',
  Flagged = "Flagged",
  Banned = "Banned",
}


/** TODO: change data to not be ActionId since objects lose their functions when being converted and passed around */
export type ThreadsAppTip = {
  type: "notification" // tell peers I've sent them a notification (they should check inbox)
  data: ThreadsNotificationTip,
} | {
  type: "where" // ask for peer's channel location
  data: ActionId | null, // my current channel location
} | {
  type: "location", // broadcast my channel location
  data: ActionId | null  // my current channel location
} | {
  type: "subject", // not used
  data: Subject | null
} | {
  type: "validationRequest", // ask for an Ack
  data: ActionHashB64
} | {
  type: "ack", // tell author we received its data from gossip
  data: ActionHashB64
} | {
  type: "typing", // tell others if we are typing in thread input bar
  data: { thread: ActionId, is: boolean } | null
} | {
  type: "string", // any
  data: string | null
}

/**  */
export type ThreadsNotificationTip = {
  event: NotifiableEvent,
  author: AgentId,
  timestamp: Timestamp,
  content: ActionId,
  /**  */
  link_ah: ActionId,
  pp_ah: ActionId,
  data: NotificationTipBeadData | NotificationTipPpData,
}


export interface ThreadsNotification {
  createLinkAh: ActionId,
  event: NotifiableEvent,
  author: AgentId,
  timestamp: Timestamp,
  content: ActionId, // ppAh or beadAh depending on event
}


/** */
export interface BeadInfo {
  creationTime: Timestamp,
  author: AgentId,
  beadType: BeadType,
  bead: BeadMat,
  //name: string,
}


export type NotificationTipPpData = {
  pp: ParticipationProtocol,
  creationTime: Timestamp,
};

export type NotificationTipBeadData = {
  typed: TypedBead,
  beadType: BeadType,
  creationTime: Timestamp,
};


export interface BeadLinkMaterialized {
  creationTime: Timestamp,
  beadAh: ActionId,
  beadType: BeadType,
}

/** -- ParticipationProtocol -- */

export interface ModerationMat {
    instructions: string
    allowedFlags: number
    moderators: AgentPubKeyB64[]
    canDeleteThread: boolean
}


export interface LimitationsMat {
    canWal: boolean
    canFile?: FileLimits
    canText?: TextLimits
    allowedAgents: AgentPubKeyB64[]
    maybeAgentRateLimiting?: [number, Timestamp]
}


export interface PpMat {
    purpose: string
    subject: Subject
    moderation: ModerationMat
    limitations: LimitationsMat
}


export function materializeModeration(mod: Moderation): ModerationMat {
    return {
        instructions: mod.instructions,
        allowedFlags: mod.allowedFlags,
        moderators: mod.moderators.map((k) => new AgentId(k).b64),
        canDeleteThread: mod.canDeleteThread
    }
}

export function materializeLimitations(limits: Limitations): LimitationsMat {
    return {
        canWal: limits.canWal,
        canFile: limits.canFile,
        canText: limits.canText,
        allowedAgents: limits.allowedAgents.map((k) => new AgentId(k).b64),
        maybeAgentRateLimiting: limits.maybeAgentRateLimiting,
    }
}

export function materializePp(pp: ParticipationProtocol): PpMat {
    return {
        purpose: pp.purpose,
        subject: pp.subject,
        moderation: materializeModeration(pp.moderation),
        limitations: materializeLimitations(pp.limitations),
    }
}


export function dematerializeModeration(mod: ModerationMat): Moderation {
    return {
        instructions: mod.instructions,
        allowedFlags: mod.allowedFlags,
        moderators: mod.moderators.map((k) => new AgentId(k).hash),
        canDeleteThread: mod.canDeleteThread
    }
}

export function dematerializeLimitations(limits: LimitationsMat): Limitations {
    return {
        canWal: limits.canWal,
        canFile: limits.canFile,
        canText: limits.canText,
        allowedAgents: limits.allowedAgents.map((k) => new AgentId(k).hash),
        maybeAgentRateLimiting: limits.maybeAgentRateLimiting,
    }
}

export function dematerializePp(pp: PpMat): ParticipationProtocol {
    return {
        purpose: pp.purpose,
        subject: pp.subject,
        moderation: dematerializeModeration(pp.moderation),
        limitations: dematerializeLimitations(pp.limitations),
    }
}


/** -- Bead -- */

export interface BeadMat {
  ppAh: ActionId,
  prevBeadAh: ActionId,
}

export function materializeBead(bead: Bead): BeadMat {
  return {
    ppAh: new ActionId(bead.ppAh),
    prevBeadAh: new ActionId(bead.prevBeadAh),
  }
}

export function dematerializeBead(bead: BeadMat): Bead {
  return {
    ppAh: bead.ppAh.hash,
    prevBeadAh: bead.prevBeadAh.hash,
  }
}


/** -- EntryBead -- */

export interface EntryBeadMat {
  bead: BeadMat,
  sourceEh: EntryId,
  sourceType: string,
  sourceRole: string,
  sourceZome: string,
  sourceSubType: string
  sourceSize: number
}

export function materializeEntryBead(bead: EntryBead): EntryBeadMat {
  return {
    bead: materializeBead(bead.bead),
    sourceEh: new EntryId(bead.sourceEh),
    sourceType: bead.sourceType,
    sourceRole: bead.sourceRole,
    sourceZome: bead.sourceZome,
    sourceSubType: bead.sourceSubType,
    sourceSize: bead.sourceSize
  }
}

export function dematerializeEntryBead(bead: EntryBeadMat): EntryBead {
  return {
    bead: dematerializeBead(bead.bead),
    sourceEh: bead.sourceEh.hash,
    sourceType: bead.sourceType,
    sourceRole: bead.sourceRole,
    sourceZome: bead.sourceZome,
    sourceSubType: bead.sourceSubType,
    sourceSize: bead.sourceSize
  }
}


/** -- TextBead -- */

export interface TextBeadMat {
  bead: BeadMat,
  value: string,
}

export function materializeTextBead(bead: TextBead): TextBeadMat {
  return {
    bead: materializeBead(bead.bead),
    value: bead.value,
  }
}

export function dematerializeTextBead(bead: TextBeadMat): TextBead {
  return {
    bead: dematerializeBead(bead.bead),
    value: bead.value,
  }
}


/** -- AnyBead -- */

export interface AnyBeadMat {
  bead: BeadMat,
  value: string,
  typeInfo: string,
}

export function materializeAnyBead(bead: AnyBead): AnyBeadMat {
  return {
    bead: materializeBead(bead.bead),
    value: bead.value,
    typeInfo: bead.typeInfo,
  }
}

export function dematerializeAnyBead(bead: AnyBeadMat): AnyBead {
  return {
    bead: dematerializeBead(bead.bead),
    value: bead.value,
    typeInfo: bead.typeInfo,
  }
}


/** -- TypedBeadMat -- */

export type TypedBaseBeadMat = EntryBeadMat | AnyBeadMat | TextBeadMat;
export type TypedBeadMat = TypedBaseBeadMat | EncryptedBead;


/** */
export function base2typed(base: BaseBeadKind): [TypedBaseBead, BaseBeadType] {
  if ("AnyBead" in base) return [base.AnyBead, ThreadsEntryType.AnyBead];
  if ("EntryBead" in base) return [base.EntryBead, ThreadsEntryType.EntryBead];
  if ("TextBead" in base) return [base.TextBead, ThreadsEntryType.TextBead];
  throw Error("Unknown BaseBeadKind");
}


/** */
export function bead2base(typed: TypedBaseBead, beadType: BaseBeadType): BaseBeadKind {
  switch (beadType) {
    case ThreadsEntryType.TextBead:
      return {TextBead: typed as TextBead};
      break;
    case ThreadsEntryType.AnyBead:
      return {AnyBead: typed as AnyBead};
      break;
    case ThreadsEntryType.EntryBead:
      return {EntryBead: typed as EntryBead};
      break;
    default:
      throw Error("Unknown bead type: " + beadType);
      break;
  }
}


/** */
export function materializeTypedBead(typed: TypedBead, beadType: BeadType): TypedBeadMat {
  let typedMat: TypedBeadMat;
  switch (beadType) {
    case ThreadsEntryType.TextBead:
      typedMat = materializeTextBead(typed as TextBead);
      break;
    case ThreadsEntryType.AnyBead:
      typedMat = materializeAnyBead(typed as AnyBead);
      break;
    case ThreadsEntryType.EntryBead:
      typedMat = materializeEntryBead(typed as EntryBead);
      break;
    case ThreadsEntryType.EncryptedBead:
      typedMat = typed as EncryptedBead;
      break;
    default:
      throw Error("Unknown bead type: " + beadType);
      break;
  }
  return typedMat;
}

/* */
export function dematerializeTypedBead(typedMat: TypedBeadMat, beadType: BeadType): TypedBead {
  let typed: TypedBead;
  switch (beadType) {
    case ThreadsEntryType.TextBead:
      typed = dematerializeTextBead(typedMat as TextBeadMat);
      break;
    case ThreadsEntryType.AnyBead:
      typed = dematerializeAnyBead(typedMat as AnyBeadMat);
      break;
    case ThreadsEntryType.EntryBead:
      typed = dematerializeEntryBead(typedMat as EntryBeadMat);
      break;
    case ThreadsEntryType.EncryptedBead:
      typed = typedMat as EncryptedBead;
      break;
    default:
      throw Error("Unknown bead type: " + beadType);
      break;
  }
  return typed;
}


/** */
export function defaultModeration(): Moderation {
  return {
    instructions: "",
    moderators: [],
    allowedFlags: 0,
    canDeleteThread: false,
  } as Moderation;
}


/** */
export function defaultLimitations(): Limitations {
  return {
    canWal: true,
    canFile: {
      allowedFileTypes: [],
      minFileSize: 0,
      maxFileSize: DEFAULT_MAX_FILE_SIZE // FIXME take dna setting
    },
    canText: {
      bannedWords: [],
      minTextLength: 0,
      maxTextLength: DEFAULT_MAX_TEXT_LENGTH,
    },
    allowedAgents: [],
  } as Limitations;
}

/** */
export function defaultCommentLimitations(): Limitations {
  return {
    canWal: false,
    canText: {
      bannedWords: [],
      minTextLength: 0,
      maxTextLength: DEFAULT_MAX_TEXT_LENGTH,
    },
    allowedAgents: [],
  } as Limitations;
}


export const DEFAULT_MAX_FILE_SIZE = 16 * 1024 * 1024; // FIXME take dna setting
export const DEFAULT_MAX_TEXT_LENGTH = 10 * 1000;
