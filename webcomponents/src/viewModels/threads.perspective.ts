import {
  ActionHash,
  ActionHashB64,
  AgentPubKeyB64, AnyLinkableHash, decodeHashFromBase64, DnaHash, DnaHashB64,
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
  GlobalLastProbeLog,
  ParticipationProtocol,
  Subject, TextBead, ThreadsEntryType, WeaveNotification,
} from "../bindings/threads.types";


/** -- Should be defined in @holochain/client */
//export declare type AnyLinkableHash = HoloHash;
export declare type AnyLinkableHashB64 = HoloHashB64;
//export const HOLOCHAIN_EPOCH = 1640995200000000;

export type TypedBead = EntryBead | AnyBead | TextBead;

/** */
export interface BeadInfo {
  creationTime: Timestamp,
  author: AgentPubKeyB64,
  beadType: string, // ThreadsEntryType
  bead: Bead,
  //name: string,
}

export interface BeadInfoMat {
  creationTime: Timestamp,
  author: AgentPubKeyB64,
  beadType: string, // ThreadsEntryType
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
export interface ThreadsPerspective {
  /** */
  allAppletIds: EntryHashB64[],
  /** Store of all Subjects: eh -> Subject */
  allSubjects: Map<AnyLinkableHashB64, Subject>,
  /** Store of all SemTopic: eh -> [TopicTitle, isHidden] */
  allSemanticTopics: Dictionary<[string, boolean]>,
  ///** Store of all PPmat: ppAh -> PP */
  //allParticipationProtocols: Dictionary<ParticipationProtocolMat>,
  /** Store threads for queried/probed subjects: SubjectHash -> ProtocolAh */
  threadsPerSubject: Dictionary<ActionHashB64[]>,
  /** ppAh -> Thread */
  threads: Map<ActionHashB64, Thread>,
  /** Name  -> ppAh */
  threadsByName: Dictionary<ActionHashB64>,
  /** beadAh -> TextMessageInfo */
  beads: Dictionary<[BeadInfo, TypedBead]>,
  /** bead_ah -> [agent, emoji] */
  emojiReactions: Dictionary<[AgentPubKeyB64, string][]>


  /**  -- Applet threads  -- */
  /** AppletId -> PathEntryHash -> subjectType */
  appletSubjectTypes: Dictionary<Dictionary<string>>,
  /** PathEntryHash -> subjectHash[] */
  subjectsPerType: Dictionary<[DnaHashB64, AnyLinkableHashB64][]>,

  /** -- New / unread -- */
  globalProbeLog?: GlobalLastProbeLog,

  /** New == Found when doing probeAllLatest() */
  /** A subject is new if a new thread has found for it and no older threads for this subject has been found */
  /** subjectHash -> array of [ppAh, pp index-time] */
  newSubjects: Dictionary<[ActionHash, Timestamp][]>,
  newThreads: ActionHashB64[],
  /** Unread subject == Has "new" beads on one if its threads OR has new threads */
  unreadSubjects: AnyLinkableHashB64[],
  /** ppAh -> beadAh[] */
  unreadThreads: Dictionary<ActionHashB64[]>, // Unread thread == Has "new" beads

  /** -- Notification Inbox -- */
  /** linkAh -> [agent, beadAh] */
  //mentions: Dictionary<[AgentPubKeyB64, ActionHashB64]>,

  /** linkAh -> obj */
  inbox: Dictionary<WeaveNotification>,
}



/**  */
export interface ParticipationProtocolMat {
  purpose: string,
  rules: string,
  subject: SubjectMat,
}


/** */
export function materializeParticipationProtocol(pp: ParticipationProtocol): ParticipationProtocolMat {
  return {
    purpose: pp.purpose,
    rules: pp.rules,
    subject: materializeSubject(pp.subject),
  } as ParticipationProtocolMat;
}
export function dematerializeParticipationProtocol(pp: ParticipationProtocolMat): ParticipationProtocol {
  return {
    purpose: pp.purpose,
    rules: pp.rules,
    subject: dematerializeSubject(pp.subject),
  } as ParticipationProtocol;
}


// /** */
// function convertSubjectType(subjectType: SubjectType): SubjectTypeType {
//   for (const value in SubjectTypeType) {
//     const variant = value.charAt(0).toLowerCase() + value.slice(1); // un-capitalize
//     if (variant in subjectType) {
//       return (SubjectTypeType as any)[value]
//     }
//   }
//   console.error("convertTopicType() failed", subjectType)
//   throw Error("Unknown variant for TopicType object")
// }

//
// /** */
// function convertSubjectTypeType(tt: SubjectTypeType): SubjectType {
//   const obj = {};
//   obj[tt] = null;
//   return obj as SubjectType;
// }


/** -- Subject -- */

export interface SubjectMat {
  hash: AnyLinkableHashB64,
  typeName: string,
  dnaHash: DnaHashB64
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


/**  */
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


/**  */
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


/**  */
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


export type TypedBeadMat = EntryBeadMat | AnyBeadMat | TextBeadMat;


/** */
export function materializedTypedBead(beadInfo: BeadInfo, typed: TypedBead): [BeadInfoMat, TypedBeadMat] {
  let typedMat: TypedBeadMat;
  switch(beadInfo.beadType) {
    case ThreadsEntryType.TextBead: typedMat = materializeTextBead(typed as TextBead); break;
    case ThreadsEntryType.AnyBead: typedMat = materializeAnyBead(typed as AnyBead); break;
    case ThreadsEntryType.EntryBead: typedMat = materializeEntryBead(typed as EntryBead); break;
    default: throw Error("Unknown bead type: " + beadInfo.beadType); break;
  }
  let beadInfoMat: BeadInfoMat = beadInfo as unknown as BeadInfoMat; // HACK
  beadInfoMat.bead = materializeBead(beadInfo.bead);
  return [beadInfoMat, typedMat];
}


/** */
export interface ThreadsPerspectiveMat {
  /** */
  allAppletIds: EntryHashB64[],
  /** Store of all Subjects: eh -> Subject */
  allSubjects: Array<[AnyLinkableHashB64, SubjectMat]>, //Map<AnyLinkableHashB64, SubjectMat>,
  /** AppletId -> PathEntryHash -> subjectType */
  appletSubjectTypes: Dictionary<Dictionary<string>>,
  /** Store of all SemTopic: eh -> [TopicTitle, isHidden] */
  allSemanticTopics: Dictionary<[string, boolean]>,

  /** ppAh -> ppMat */
  pps: Array<[ActionHashB64, ParticipationProtocolMat]>, // Map
  /** beadAh -> TextMessageInfo */
  beads: Dictionary<[BeadInfoMat, TypedBeadMat]>,

  /** bead_ah -> [agent, emoji] */
  emojiReactions: Dictionary<[AgentPubKeyB64, string][]>

}
