import {
  ActionHash,
  ActionHashB64, AgentPubKey,
  AgentPubKeyB64, decodeHashFromBase64, DnaHashB64,
  encodeHashToBase64,
  EntryHashB64,
  HoloHashB64,
  Timestamp
} from "@holochain/client";
import {Dictionary} from "@ddd-qc/lit-happ";
import {Thread} from "./thread";
import {
  AnyBead, BaseBeadKind, Bead, EncryptedBead,
  EntryBead,
  GlobalLastProbeLog, NotifiableEvent, NotifySetting,
  ParticipationProtocol,
  Subject, TextBead, ThreadsEntryType,
} from "../bindings/threads.types";
import {WAL, weaveUrlFromWal} from "@lightningrodlabs/we-applet";
import {AuthorshipZvm} from "./authorship.zvm";


/** -- Should be defined in @holochain/client */
//export declare type AnyLinkableHash = HoloHash;
export declare type AnyLinkableHashB64 = HoloHashB64;
//export const HOLOCHAIN_EPOCH = 1640995200000000;

export type TypedBaseBead = EntryBead | AnyBead | TextBead;
export type TypedBead = TypedBaseBead | EncryptedBead;

export type TypedContent = string | WAL | EntryHashB64;

export type BaseBeadType = ThreadsEntryType.TextBead | ThreadsEntryType.EntryBead | ThreadsEntryType.AnyBead
export type BeadType = BaseBeadType | ThreadsEntryType.EncryptedBead;

export interface EncryptedBeadContent {encBead: EncryptedBead, otherAgent: AgentPubKey}


export interface ThreadsNotification {
  //eventIndex: number,
  event: NotifiableEvent,
  createLinkAh: ActionHashB64,
  author: AgentPubKeyB64,
  timestamp: Timestamp,
  content: AnyLinkableHashB64, // ppAh or beadAh depending on event
}


/** */
export interface BeadInfo {
  creationTime: Timestamp,
  author: AgentPubKeyB64,
  beadType: BeadType,
  bead: BeadMat,
  //name: string,
}

export interface BeadLinkMaterialized {
  creationTime: Timestamp,
  beadAh: ActionHashB64,
  beadType: BeadType,
}


// /**  */
// export interface WeaveNotificationMat {
//   event: NotifiableEventType,
//   author: AgentPubKeyB64,
//   timestamp: Timestamp
//   linkAh: ActionHashB64,
//   content: AnyLinkableHashB64,
// }




/** */
export interface ThreadsExportablePerspective {
  /** */
  allAppletIds: EntryHashB64[],
  /** Store of all Subjects: hash -> Subject */
  allSubjects: Array<[AnyLinkableHashB64, SubjectMat]>,
  /** Store of all SemTopic: eh -> TopicTitle */
  allSemanticTopics: Dictionary<string>,
  hiddens: Dictionary<boolean>,
  /** ppAh -> ppMat */
  pps: Array<[ActionHashB64, ParticipationProtocolMat, Timestamp, AgentPubKeyB64]>,
  /** beadAh -> [BeadInfoMat, TypedBeadMat] */
  beads: Dictionary<[BeadInfo, TypedBeadMat]>,

  /** bead_ah -> [agent, emoji] */
  emojiReactions: Dictionary<[AgentPubKeyB64, string][]>


  /** AppletId -> (PathEntryHash -> subjectType) */
  appletSubjectTypes: Dictionary<Dictionary<string>>,

  favorites: ActionHashB64[],
}


export type ThreadsPerspective = ThreadsPerspectiveCore & ThreadsPerspectiveLive;

/** */
export interface ThreadsPerspectiveCore {
  /** */
  allAppletIds: EntryHashB64[],
  /** Store of all Subjects: eh -> Subject */
  allSubjects: Map<AnyLinkableHashB64, SubjectMat>,
  /** Store of all SemTopic: eh -> TopicTitle */
  allSemanticTopics: Dictionary<string>,
  /** Any hash -> isHidden */
  hiddens: Dictionary<boolean>,
  /** ppAh -> Thread */
  threads: Map<ActionHashB64, Thread>,
  /** beadAh -> [BeadInfo, TypedBead] */
  beads: Dictionary<[BeadInfo, TypedBeadMat]>,
  /** beadAh -> [agent, emoji] */
  emojiReactions: Dictionary<[AgentPubKeyB64, string][]>

  /** -- DM stuff  -- */
  /** agentId -> ppAh */
  dmAgents: Dictionary<ActionHashB64>
  /** encBeadAh -> [BeadInfo, TypedBead] */
  decBeads: Dictionary<[BeadInfo, TypedBeadMat]>,

  /**  -- Applet threads  -- */

  /** AppletId -> PathEntryHash -> subjectType */
  appletSubjectTypes: Dictionary<Dictionary<string>>,

  /** -- Favorites -- */
  favorites: ActionHashB64[],

  /** -- New / unread -- */
  globalProbeLogTs?: Timestamp,

  /** -- Notification Inbox -- */
  /** linkAh -> [agent, beadAh] */
  //mentions: Dictionary<[AgentPubKeyB64, ActionHashB64]>,
  /** linkAh -> (ppAh, notif) */
  inbox: Dictionary<[ActionHashB64, ThreadsNotification]>,
  /* ppAh -> (agent -> value) */
  notifSettings: Record<ActionHashB64, Record<AgentPubKeyB64, NotifySetting>>,
}


/** Perspective fields that are built from the Core perspective. There is no exclusif data. */
export interface ThreadsPerspectiveLive {
  /** Store threads for queried/probed subjects: SubjectHash -> ProtocolAh */
  threadsPerSubject: Dictionary<ActionHashB64[]>,
  /** PathEntryHash -> subjectHash[] */
  subjectsPerType: Dictionary<[DnaHashB64, AnyLinkableHashB64][]>,
  /** New == Found when doing probeAllLatest(), i.e. created since last GlobalProbeLog */
  /** A subject is new if a new thread has found for it and no older threads for this subject has been found */
  /* ppAh -> SubjectHash */
  newThreads: Record<ActionHashB64, AnyLinkableHashB64>,
  /** Unread subject == Has at least one unread thread */
  /** ppAh -> (subjectHash, beadAh[]) */
  unreadThreads: Dictionary<[AnyLinkableHashB64, ActionHashB64[]]>, // Unread thread == Has "new" beads
}



/** -- PpMat -- */

/**  */
export interface ParticipationProtocolMat {
  purpose: string,
  rules: string,
  subject: SubjectMat,
  subject_name: string,
}
export function materializeParticipationProtocol(pp: ParticipationProtocol): ParticipationProtocolMat {
  return {
    purpose: pp.purpose,
    rules: pp.rules,
    subject: materializeSubject(pp.subject),
    subject_name: pp.subject_name,
  } as ParticipationProtocolMat;
}
export function dematerializeParticipationProtocol(pp: ParticipationProtocolMat): ParticipationProtocol {
  return {
    purpose: pp.purpose,
    rules: pp.rules,
    subject: dematerializeSubject(pp.subject),
    subject_name: pp.subject_name,
  } as ParticipationProtocol;
}


/** -- Subject -- */

export interface SubjectMat {
  hash: AnyLinkableHashB64,
  typeName: string,
  dnaHash: DnaHashB64,
  appletId: string,
}
export function materializeSubject(subject: Subject): SubjectMat {
  return {
    hash: encodeHashToBase64(subject.hash),
    typeName: subject.typeName,
    dnaHash: encodeHashToBase64(subject.dnaHash),
    appletId: subject.appletId,
  }
}
export function dematerializeSubject(subject: SubjectMat): Subject {
  return {
    hash: decodeHashFromBase64(subject.hash),
    typeName: subject.typeName,
    dnaHash: decodeHashFromBase64(subject.dnaHash),
    appletId: subject.appletId,
  }
}


/** -- Bead -- */

export interface BeadMat {
  ppAh: ActionHashB64,
  prevBeadAh: ActionHashB64,
}
export function materializeBead(bead: Bead): BeadMat {
  return {
    ppAh: encodeHashToBase64(bead.ppAh),
    prevBeadAh: encodeHashToBase64(bead.prevBeadAh),
  }
}
export function dematerializeBead(bead: BeadMat): Bead {
  return {
    ppAh: decodeHashFromBase64(bead.ppAh),
    prevBeadAh: decodeHashFromBase64(bead.prevBeadAh),
  }
}


/** -- EntryBead -- */

export interface EntryBeadMat {
  bead: BeadMat,
  sourceEh: EntryHashB64,
  sourceType: string,
  sourceRole: string,
  sourceZome: string,
}
export function materializeEntryBead(bead: EntryBead): EntryBeadMat {
  return {
    bead: materializeBead(bead.bead),
    sourceEh: encodeHashToBase64(bead.sourceEh),
    sourceType: bead.sourceType,
    sourceRole: bead.sourceRole,
    sourceZome: bead.sourceZome,
  }
}
export function dematerializeEntryBead(bead: EntryBeadMat): EntryBead {
  return {
    bead: dematerializeBead(bead.bead),
    sourceEh: decodeHashFromBase64(bead.sourceEh),
    sourceType: bead.sourceType,
    sourceRole: bead.sourceRole,
    sourceZome: bead.sourceZome,
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


// /** */
// export function determineBeadType(typedBead: TypedBeadMat | TypedBead): BeadType {
//   if ("sourceEh" in typedBead) {
//     return ThreadsEntryType.EntryBead;
//   }
//   if ("typeInfo" in typedBead) {
//     return ThreadsEntryType.AnyBead;
//   }
//   return ThreadsEntryType.TextBead;
// }


/** */
export function base2typed(base: BaseBeadKind): [TypedBaseBead, BaseBeadType] {
  if ("AnyBead" in base) return [base.AnyBead, ThreadsEntryType.AnyBead];
  if ("EntryBead" in base) return [base.EntryBead, ThreadsEntryType.EntryBead];
  if ("TextBead" in base) return [base.TextBead, ThreadsEntryType.TextBead];
  throw Error("Unknown BaseBeadKind");
}


/** */
export function bead2base(typed: TypedBaseBead, beadType: BaseBeadType): BaseBeadKind {
  switch(beadType) {
    case ThreadsEntryType.TextBead: return {TextBead: typed as TextBead}; break;
    case ThreadsEntryType.AnyBead: return {AnyBead: typed as AnyBead}; break;
    case ThreadsEntryType.EntryBead: return {EntryBead: typed as EntryBead}; break;
    default: throw Error("Unknown bead type: " + beadType); break;
  }
}


/** */
export function materializeTypedBead(typed: TypedBead, beadType: BeadType): TypedBeadMat {
  let typedMat: TypedBeadMat;
  switch(beadType) {
    case ThreadsEntryType.TextBead: typedMat = materializeTextBead(typed as TextBead); break;
    case ThreadsEntryType.AnyBead: typedMat = materializeAnyBead(typed as AnyBead); break;
    case ThreadsEntryType.EntryBead: typedMat = materializeEntryBead(typed as EntryBead); break;
    case ThreadsEntryType.EncryptedBead: typedMat = typed as EncryptedBead; break;
    default: throw Error("Unknown bead type: " + beadType); break;
  }
  return typedMat;
}
/* */
export function dematerializeTypedBead(typedMat: TypedBeadMat, beadType: BeadType): TypedBead {
  let typed: TypedBead;
  switch(beadType) {
    case ThreadsEntryType.TextBead: typed = dematerializeTextBead(typedMat as TextBeadMat); break;
    case ThreadsEntryType.AnyBead: typed = dematerializeAnyBead(typedMat as AnyBeadMat); break;
    case ThreadsEntryType.EntryBead: typed = dematerializeEntryBead(typedMat as EntryBeadMat); break;
    case ThreadsEntryType.EncryptedBead: typed = typedMat as EncryptedBead; break;
    default: throw Error("Unknown bead type: " + beadType); break;
  }
  return typed;
}


/** -- NotifiableEvent -- */

/** */
// export function event2type(event: NotifiableEvent): string {
//   if (NotifiableEventType.Mention in event) { return NotifiableEventType.Mention }
//   if (NotifiableEventType.Reply in event) { return NotifiableEventType.Reply }
//   if (NotifiableEventType.NewBead in event) { return NotifiableEventType.NewBead }
//   if (NotifiableEventType.Fork in event) { return NotifiableEventType.Fork }
//   if (NotifiableEventType.NewDmThread in event) { return NotifiableEventType.NewDmThread }
//   return "";
// }



/** Compact Perspective */
export function intoExportable(persp: ThreadsPerspectiveCore, originalsZvm: AuthorshipZvm): ThreadsExportablePerspective {
  /** allSubjects */
  const allSubjects: Map<AnyLinkableHashB64, SubjectMat> = new Map();
  Array.from(persp.allSubjects.entries()).map(([subjectAh, subject]) => {
    originalsZvm.ascribeTarget("Subject", subjectAh, 0/*FIXME*/, null, true);
    allSubjects.set(subjectAh, subject);
  });

  /** pps */
  const pps: Array<[ActionHashB64, ParticipationProtocolMat, Timestamp, AgentPubKeyB64]> = new Array();
  Array.from(persp.threads.entries()).map(([ppAh, thread]) => {
    originalsZvm.ascribeTarget(ThreadsEntryType.ParticipationProtocol, ppAh, thread.creationTime, thread.author, true);
    pps.push([ppAh, thread.pp, thread.creationTime, ""]);
  });

  /** beads */
  //console.log("exportPerspective() beads", this._beads);
  //const beads: Dictionary<[BeadInfo, TypedBeadMat]> = {};
  Object.entries(persp.beads).map(([beadAh, [beadInfo, typed]]) => {
    //beads[beadAh] = (typed, beadInfo.beadType); // TODO: Optimize to not store twice core bead info.
    originalsZvm.ascribeTarget(beadInfo.beadType, beadAh, beadInfo.creationTime, beadInfo.author, true);
  });


  /** -- Package -- */
  let exPersp: ThreadsExportablePerspective = {
    emojiReactions: persp.emojiReactions,
    allAppletIds: persp.allAppletIds,
    allSubjects: Array.from(allSubjects.entries()),
    allSemanticTopics: persp.allSemanticTopics,
    hiddens: persp.hiddens,
    appletSubjectTypes: persp.appletSubjectTypes,
    pps,
    beads: persp.beads,
    favorites: persp.favorites,
  };

  return exPersp;
}
