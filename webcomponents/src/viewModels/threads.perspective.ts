import {
  ActionHashB64,
  AgentPubKeyB64, decodeHashFromBase64, DnaHashB64,
  encodeHashToBase64,
  EntryHashB64,
  HoloHashB64,
  Timestamp
} from "@holochain/client";
import {Dictionary} from "@ddd-qc/lit-happ";
import {Thread} from "./thread";
import {
  AnyBead, Bead,
  EntryBead,
  GlobalLastProbeLog, NotifiableEvent, NotifiableEventType, NotifySettingType,
  ParticipationProtocol,
  Subject, TextBead, ThreadsEntryType, WeaveNotification,
} from "../bindings/threads.types";
import {HrlWithContext} from "@lightningrodlabs/we-applet";


/** -- Should be defined in @holochain/client */
//export declare type AnyLinkableHash = HoloHash;
export declare type AnyLinkableHashB64 = HoloHashB64;
//export const HOLOCHAIN_EPOCH = 1640995200000000;

export type TypedBead = EntryBead | AnyBead | TextBead;

export type TypedContent = string | HrlWithContext | EntryHashB64;

export type BeadType = ThreadsEntryType.TextBead | ThreadsEntryType.EntryBead | ThreadsEntryType.AnyBead;


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
  beadType: string,
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
  allSubjects: Array<[AnyLinkableHashB64, SubjectMat]>, //Map<AnyLinkableHashB64, SubjectMat>,
  /** Store of all SemTopic: eh -> [TopicTitle, isHidden] */
  allSemanticTopics: Dictionary<[string, boolean]>,

  /** ppAh -> ppMat */
  pps: Array<[ActionHashB64, ParticipationProtocolMat, Timestamp]>, // Map
  /** beadAh -> [BeadInfoMat, TypedBeadMat] */
  beads: Dictionary<[BeadInfo, TypedBeadMat]>,

  /** bead_ah -> [agent, emoji] */
  emojiReactions: Dictionary<[AgentPubKeyB64, string][]>


  /** AppletId -> (PathEntryHash -> subjectType) */
  appletSubjectTypes: Dictionary<Dictionary<string>>,

  favorites: ActionHashB64[],
}


/** */
export interface ThreadsPerspective {
  /** */
  allAppletIds: EntryHashB64[],
  /** Store of all Subjects: eh -> Subject */
  allSubjects: Map<AnyLinkableHashB64, SubjectMat>,
  /** Store of all SemTopic: eh -> [TopicTitle, isHidden] */
  allSemanticTopics: Dictionary<[string, boolean]>,
  ///** Store of all PPmat: ppAh -> PP */
  //allParticipationProtocols: Dictionary<ParticipationProtocolMat>,
  /** Store threads for queried/probed subjects: SubjectHash -> ProtocolAh */
  threadsPerSubject: Dictionary<ActionHashB64[]>,
  /** ppAh -> Thread */
  threads: Map<ActionHashB64, Thread>,
  /** beadAh -> [BeadInfo, TypedBead] */
  beads: Dictionary<[BeadInfo, TypedBeadMat]>,
  /** bead_ah -> [agent, emoji] */
  emojiReactions: Dictionary<[AgentPubKeyB64, string][]>


  /**  -- Applet threads  -- */

  /** AppletId -> PathEntryHash -> subjectType */
  appletSubjectTypes: Dictionary<Dictionary<string>>,
  /** PathEntryHash -> subjectHash[] */
  subjectsPerType: Dictionary<[DnaHashB64, AnyLinkableHashB64][]>,


  /** -- Favorites -- */

  favorites: ActionHashB64[],


  /** -- New / unread -- */

  globalProbeLog?: GlobalLastProbeLog,

  /** New == Found when doing probeAllLatest(), i.e. created since last GlobalProbeLog */
  /** A subject is new if a new thread has found for it and no older threads for this subject has been found */
  /** subjectHash -> array of [ppAh, pp index-time] */
  //newSubjects: Dictionary<[ActionHash, Timestamp][]>,
  /* ppAh -> SubjectHash */
  newThreads: Record<ActionHashB64, AnyLinkableHashB64>,
  /** Unread subject == Has at least one unread thread */
  //unreadSubjects: Dictionary<AnyLinkableHashB64[]>,
  /** ppAh -> (subjectHash, beadAh[]) */
  unreadThreads: Dictionary<[AnyLinkableHashB64, ActionHashB64[]]>, // Unread thread == Has "new" beads


  /** -- Notification Inbox -- */

  /** linkAh -> [agent, beadAh] */
  //mentions: Dictionary<[AgentPubKeyB64, ActionHashB64]>,
  /** linkAh -> (ppAh, notif) */
  inbox: Dictionary<[ActionHashB64, WeaveNotification]>,
  /* ppAh -> (agent -> value) */
  notifSettings: Record<ActionHashB64, Record<AgentPubKeyB64, NotifySettingType>>,
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
  prevKnownBeadAh?: ActionHashB64,
}
export function materializeBead(bead: Bead): BeadMat {
  return {
    ppAh: encodeHashToBase64(bead.ppAh),
    prevKnownBeadAh: bead.prevKnownBeadAh? encodeHashToBase64(bead.prevKnownBeadAh) : undefined,
  }
}
export function dematerializeBead(bead: BeadMat): Bead {
  return {
    ppAh: decodeHashFromBase64(bead.ppAh),
    prevKnownBeadAh: bead.prevKnownBeadAh? decodeHashFromBase64(bead.prevKnownBeadAh) : undefined,
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

export type TypedBeadMat = EntryBeadMat | AnyBeadMat | TextBeadMat;


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
export function materializeTypedBead(typed: TypedBead, beadType: BeadType): TypedBeadMat {
  let typedMat: TypedBeadMat;
  switch(beadType) {
    case ThreadsEntryType.TextBead: typedMat = materializeTextBead(typed as TextBead); break;
    case ThreadsEntryType.AnyBead: typedMat = materializeAnyBead(typed as AnyBead); break;
    case ThreadsEntryType.EntryBead: typedMat = materializeEntryBead(typed as EntryBead); break;
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
    default: throw Error("Unknown bead type: " + beadType); break;
  }
  return typed;
}


/** -- NotifiableEvent -- */

/** */
export function event2type(event: NotifiableEvent): string {
  if (NotifiableEventType.Mention in event) { return NotifiableEventType.Mention }
  if (NotifiableEventType.Reply in event) { return NotifiableEventType.Reply }
  if (NotifiableEventType.NewBead in event) { return NotifiableEventType.NewBead }
  if (NotifiableEventType.Fork in event) { return NotifiableEventType.Fork }
  if (NotifiableEventType.Dm in event) { return NotifiableEventType.Dm }
  return "";
}
