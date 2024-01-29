import {
  ActionHash,
  ActionHashB64,
  AgentPubKeyB64, DnaHashB64,
  encodeHashToBase64,
  EntryHashB64,
  HoloHash, HoloHashB64,
  Timestamp
} from "@holochain/client";
import {Dictionary} from "@ddd-qc/lit-happ";
import {Thread} from "./thread";
import {
  AnyBead, Bead,
  EntryBead,
  GlobalLastProbeLog, NotifiableEventType,
  ParticipationProtocol,
  Subject, TextMessage, WeaveNotification,
} from "../bindings/threads.types";
import {truncate} from "../utils";


/** -- Should be defined in @holochain/client */
//export declare type AnyLinkableHash = HoloHash;
export declare type AnyLinkableHashB64 = HoloHashB64;
export const HOLOCHAIN_EPOCH = 1640995200000000;

/** */
export interface BeadInfo {
  creationTime: Timestamp,
  author: AgentPubKeyB64,
  beadType: string,
  bead: Bead,
}


/** (used for HRL) */
export interface AnyBeadInfo {
  creationTime: Timestamp,
  author: AgentPubKeyB64,
  anyBead: AnyBead,
}


/** (used for Files) */
export interface EntryBeadInfo {
  creationTime: Timestamp,
  author: AgentPubKeyB64,
  entryBead: EntryBead,
}


/** */
export interface TextMessageInfo {
  //index_begin_time_us: number,
  creationTime: Timestamp,
  author: AgentPubKeyB64,
  textMessage: TextMessage,
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
  allSubjects: Dictionary<Subject>,
  /** Store of all SemTopic: eh -> Topic Title */
  allSemanticTopics: Dictionary<[string, boolean]>,
  ///** Store of all PPmat: ppAh -> PP */
  //allParticipationProtocols: Dictionary<ParticipationProtocolMat>,
  /** Store threads for queried/probed subjects: SubjectHash -> ProtocolAh */
  threadsPerSubject: Dictionary<ActionHashB64[]>,
  /** ppAh -> Thread */
  threads: Dictionary<Thread>,
  /** beadAh -> TextMessageInfo */
  textMessages: Dictionary<TextMessageInfo>,
  /** beadAh -> BeadLinkMaterialized */
  entryBeads: Dictionary<EntryBeadInfo>,
  /** beadAh -> BeadLinkMaterialized */
  anyBeads: Dictionary<AnyBeadInfo>,
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
  subjectHash: AnyLinkableHashB64,
  subjectType: string,
}


/** */
export function materializeParticipationProtocol(pp: ParticipationProtocol): ParticipationProtocolMat {
  return {
    purpose: pp.purpose,
    rules: pp.rules,
    subjectHash: encodeHashToBase64(pp.subjectHash),
    subjectType: pp.subjectType,
  } as ParticipationProtocolMat;
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
