import {Timestamp} from "@holochain/client";
import {
  Dictionary,
  AgentId,
  ActionId,
  EntryId,
  AgentIdMap,
  ActionIdMap,
  EntryIdMap, DnaId, intoLinkableId, LinkableId, getIndexByVariant
} from "@ddd-qc/lit-happ";
import {Thread} from "./thread";
import {
  AnyBead, BaseBeadKind, Bead, EncryptedBead,
  EntryBead,
  NotifySetting,
  ParticipationProtocol,
  Subject, TextBead, ThreadsEntryType,
} from "../bindings/threads.types";
import {WAL} from "@lightningrodlabs/we-applet";
import {AnyIdMap} from "../utils";
import {SpecialSubjectType} from "../events";


/** -- Should be defined in @holochain/client */
//export declare type AnyLinkableHash = HoloHash;
//export declare type AnyLinkableHashB64 = string;
//export const HOLOCHAIN_EPOCH = 1640995200000000;

export type TypedBaseBead = EntryBead | AnyBead | TextBead;
export type TypedBead = TypedBaseBead | EncryptedBead;

export type TypedContent = string | WAL | EntryId;

export type BaseBeadType = ThreadsEntryType.TextBead | ThreadsEntryType.EntryBead | ThreadsEntryType.AnyBead
export type BeadType = BaseBeadType | ThreadsEntryType.EncryptedBead;

export interface EncryptedBeadContent {encBead: EncryptedBead, otherAgent: AgentId}


/**  */
export enum NotifiableEvent {
  NewBead = 'NewBead',
  Mention = 'Mention',
  Reply = 'Reply',
  Fork = 'Fork',
  NewDmThread = 'NewDmThread',
}

/**  */
export interface ThreadsNotificationTip {
  event: NotifiableEvent,
  author: AgentId,
  timestamp: Timestamp,
  content: LinkableId,
  /**  */
  link_ah: ActionId,
  pp_ah: ActionId,
  data: NotificationTipBeadData | NotificationTipPpData,
}


export interface ThreadsNotification {
  //eventIndex: number,
  event: NotifiableEvent,
  createLinkAh: ActionId,
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

export interface BeadLinkMaterialized {
  creationTime: Timestamp,
  beadAh: ActionId,
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
export interface ThreadsPerspectiveSnapshot {
  /** */
  allAppletIds: EntryId[],
  /** Store of all Subjects: hash -> Subject */
  allSubjects: Array<[LinkableId, SubjectMat]>,
  /** Store of all SemTopic: eh -> TopicTitle */
  allSemanticTopics: Dictionary<string>,
  hiddens: Dictionary<boolean>,
  /** ppAh -> ppMat */
  pps: Array<[ActionId, ParticipationProtocolMat, Timestamp, AgentId]>,
  /** beadAh -> [BeadInfoMat, TypedBeadMat] */
  beads: Dictionary<[BeadInfo, TypedBeadMat]>,

  /** bead_ah -> [agent, emoji] */
  emojiReactions: Dictionary<[AgentId, string][]>


  /** AppletId -> (PathEntryHash -> subjectType) */
  appletSubjectTypes: Dictionary<Dictionary<string>>,

  favorites: ActionId[],
}


export type ThreadsPerspective = ThreadsPerspectiveCore & ThreadsPerspectiveLive;

/** */
export interface ThreadsPerspectiveCore {
  /** */
  allAppletIds: EntryId[],
  /** Store of all Subjects: hash -> Subject */
  allSubjects: AnyIdMap<SubjectMat>,
  /** Store of all SemTopic: eh -> TopicTitle */
  allSemanticTopics: EntryIdMap<string>,
  /** Any hash -> isHidden */
  hiddens: Dictionary<boolean>,
  /** ppAh -> Thread */
  threads: ActionIdMap<Thread>,
  /** beadAh -> [BeadInfo, TypedBead] */
  beads: ActionIdMap<[BeadInfo, TypedBeadMat]>,
  /** beadAh -> [agent, emoji] */
  emojiReactions: ActionIdMap<[AgentId, string][]>

  /** -- DM stuff  -- */
  /** agentId -> ppAh */
  dmAgents: AgentIdMap<ActionId>
  /** encBeadAh -> [BeadInfo, TypedBead] */
  decBeads: ActionIdMap<[BeadInfo, TypedBaseBeadMat]>,

  /**  -- Applet threads  -- */

  /** AppletId -> PathEntryHash -> subjectType */
  appletSubjectTypes: EntryIdMap<EntryIdMap<string>>,

  /** -- Favorites -- */
  favorites: ActionId[],

  /** -- New / unread -- */
  globalProbeLogTs: Timestamp,

  /** -- Notification Inbox -- */
  /** linkAh -> [agent, beadAh] */
  //mentions: Dictionary<[AgentPubKeyB64, ActionHashB64]>,
  /** linkAh -> (ppAh, notif) */
  inbox: ActionIdMap<[ActionId, ThreadsNotification]>,
  /* ppAh -> (agent -> value) */
  notifSettings: ActionIdMap<AgentIdMap<NotifySetting>>,
}


/** Perspective fields that are built from the Core perspective. There is no exclusif data. */
export interface ThreadsPerspectiveLive {
  /** Store threads for queried/probed subjects: SubjectHash -> ProtocolAh */
  threadsPerSubject: AnyIdMap<ActionId[]>,
  /** PathEntryHash -> subjectHash[] */
  subjectsPerType: EntryIdMap<[DnaId, LinkableId][]>,
  /* name string -> ppAh */
  threadsByName: Dictionary<ActionId>,

  /** New == Found when doing probeAllLatest(), i.e. created since last GlobalProbeLog */
  /** A subject is new if a new thread has found for it and no older threads for this subject has been found */
  /* ppAh -> SubjectHash */
  newThreads: ActionIdMap<LinkableId>,
  /** Unread subject == Has at least one unread thread */
  /** ppAh -> (subjectHash, beadAh[]) */
  unreadThreads: ActionIdMap<[LinkableId, ActionId[]]>, // Unread thread == Has "new" beads
}


/** */
export function createThreadsPerspective(): ThreadsPerspective {
  return {
    allAppletIds: [],
    allSubjects: new AnyIdMap(), //new Array(),
    allSemanticTopics: new EntryIdMap(),
    hiddens: {},
    threads: new ActionIdMap(),
    beads: new ActionIdMap(),
    emojiReactions: new ActionIdMap(),
    dmAgents: new AgentIdMap(),
    decBeads: new ActionIdMap(),
    appletSubjectTypes: new EntryIdMap(),
    favorites: [],
    globalProbeLogTs: 0,
    inbox: new ActionIdMap(),
    notifSettings: new ActionIdMap(),
    threadsPerSubject: new AnyIdMap(),
    subjectsPerType: new EntryIdMap(),
    threadsByName: {},
    newThreads: new ActionIdMap(),
    unreadThreads: new ActionIdMap(),
  }
}


export type NotificationTipPpData = {
  pp: ParticipationProtocol,
  creationTime: Timestamp,
};

export type NotificationTipBeadData = {
  typed: TypedBeadMat,
  beadType: BeadType,
  creationTime: Timestamp,
};

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
  address: LinkableId,
  typeName: SpecialSubjectType,
  dnaHash: DnaId,
  appletId: EntryId,
}
export function materializeSubject(subject: Subject): SubjectMat {
  const index = getIndexByVariant(SpecialSubjectType, subject.typeName); // Make sure typeName is valid
  return {
    address: intoLinkableId(subject.address),
    typeName: subject.typeName as SpecialSubjectType,
    dnaHash: new DnaId(subject.dnaHash),
    appletId: new EntryId(subject.appletId),
  }
}
export function dematerializeSubject(subject: SubjectMat): Subject {
  return {
    address: subject.address.hash,
    typeName: subject.typeName,
    dnaHash: subject.dnaHash.hash,
    appletId: subject.appletId.b64,
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
}
export function materializeEntryBead(bead: EntryBead): EntryBeadMat {
  return {
    bead: materializeBead(bead.bead),
    sourceEh: new EntryId(bead.sourceEh),
    sourceType: bead.sourceType,
    sourceRole: bead.sourceRole,
    sourceZome: bead.sourceZome,
  }
}
export function dematerializeEntryBead(bead: EntryBeadMat): EntryBead {
  return {
    bead: dematerializeBead(bead.bead),
    sourceEh: bead.sourceEh.hash,
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


// /** Compact Perspective */
// export function intoExportable(persp: ThreadsPerspectiveCore, originalsZvm: AuthorshipZvm): ThreadsPerspectiveExportable {
//   /** allSubjects */
//   const allSubjects: Map<AnyLinkableHashB64, SubjectMat> = new Map();
//   Array.from(persp.allSubjects.entries()).map(([subjectAh, subject]) => {
//     originalsZvm.ascribeTarget("Subject", subjectAh, 0/*TODO: get creationTime of Subject*/, null, true);
//     allSubjects.set(subjectAh, subject);
//   });
//
//   /** pps */
//   const pps: Array<[ActionHashB64, ParticipationProtocolMat, Timestamp, AgentPubKeyB64]> = new Array();
//   Array.from(persp.threads.entries()).map(([ppAh, thread]) => {
//     originalsZvm.ascribeTarget(ThreadsEntryType.ParticipationProtocol, ppAh, thread.creationTime, thread.author, true);
//     pps.push([ppAh, thread.pp, thread.creationTime, ""]);
//   });
//
//   /** beads */
//   //console.log("exportPerspective() beads", this._beads);
//   //const beads: Dictionary<[BeadInfo, TypedBeadMat]> = {};
//   Object.entries(persp.beads).map(([beadAh, [beadInfo, typed]]) => {
//     //beads[beadAh] = (typed, beadInfo.beadType); // TODO: Optimize to not store twice core bead info.
//     originalsZvm.ascribeTarget(beadInfo.beadType, beadAh, beadInfo.creationTime, beadInfo.author, true);
//   });
//
//
//   /** -- Package -- */
//   let exPersp: ThreadsPerspectiveExportable = {
//     emojiReactions: persp.emojiReactions,
//     allAppletIds: persp.allAppletIds,
//     allSubjects: Array.from(allSubjects.entries()),
//     allSemanticTopics: persp.allSemanticTopics,
//     hiddens: persp.hiddens,
//     appletSubjectTypes: persp.appletSubjectTypes,
//     pps,
//     beads: persp.beads,
//     favorites: persp.favorites,
//   };
//
//   return exPersp;
// }
