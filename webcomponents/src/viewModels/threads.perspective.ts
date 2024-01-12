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
  AnyBead,
  EntryBead,
  GlobalLastProbeLog,
  ParticipationProtocol,
  Subject,
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
  message: string,
}

export interface BeadLinkMaterialized {
  creationTime: Timestamp,
  beadAh: ActionHashB64,
  beadType: string,
}



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
  /** New = First time seen */
  /** A subject is new if a new thread has found for it and no older threads for this subject has been found */
  newSubjects: Dictionary<[ActionHash, Timestamp][]>,
  newThreads: ActionHashB64[],
  /** unread = Has new beads on one if its threads */
  unreadSubjects: AnyLinkableHashB64[],
  unreadThreads: ActionHashB64[],

  /** */
  mentions: [ActionHashB64, AgentPubKeyB64, ActionHashB64][],
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
