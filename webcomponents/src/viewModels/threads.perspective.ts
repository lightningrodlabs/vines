import {
  BeadLink,
  GlobalLastSearchLog,
  ParticipationProtocol,
  SearchInterval,
  Subject, SubjectType, SubjectTypeType,
} from "../bindings/threads.types";
import {ActionHash, ActionHashB64, AgentPubKeyB64, encodeHashToBase64, HoloHash, Timestamp} from "@holochain/client";
import {Dictionary} from "@ddd-qc/lit-happ";
import {Thread} from "./thread";
import {HoloHashB64} from "@holochain/client/lib/types";


/** -- Should be defined in @holochain/client */
export declare type AnyLinkableHash = HoloHash;
export declare type AnyLinkableHashB64 = HoloHashB64;
export const HOLOCHAIN_EPOCH = 1640995200000000;


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
  /** Store of all Subjects: eh -> Subject */
  allSubjects: Dictionary<Subject>
  /** Store of all SemTopic: eh -> Topic Title */
  allSemanticTopics: Dictionary<string>
  ///** Store of all PPmat: pp_ah -> PP */
  //allParticipationProtocols: Dictionary<ParticipationProtocolMat>,
  /** Store threads for queried topics: TopicHash -> ProtocolAh */
  threadsPerSubject: Dictionary<ActionHashB64[]>,
  /** pp_ah -> Thread */
  threads: Dictionary<Thread>,
  /** Ah -> TextMessageInfo */
  textMessages: Dictionary<TextMessageInfo>,

  /** */
  globalSearchLog?: GlobalLastSearchLog,
  newSubjects: Dictionary<[ActionHash, Timestamp][]>
  newThreads: ActionHashB64[]
  unreadSubjects: AnyLinkableHashB64[],
  unreadThreads: ActionHashB64[],

  // /** dnaHash -> Cell name */
  // dnaNames: Dictionary<string>
}



/**  */
export interface ParticipationProtocolMat {
  purpose: string
  rules: string
  subjectHash: string //AnyDhtHashB64
  subjectType: SubjectTypeType
}


/** */
export function materializeParticipationProtocol(pp: ParticipationProtocol): ParticipationProtocolMat {
  return {
    purpose: pp.purpose,
    rules: pp.rules,
    subjectHash: encodeHashToBase64(pp.subjectHash),
    subjectType: convertSubjectType(pp.subjectType),
  } as ParticipationProtocolMat;
}


/** */
function convertSubjectType(subjectType: SubjectType): SubjectTypeType {
  for (const value in SubjectTypeType) {
    const variant = value.charAt(0).toLowerCase() + value.slice(1); // un-capitalize
    if (variant in subjectType) {
      return (SubjectTypeType as any)[value]
    }
  }
  console.error("convertTopicType() failed", subjectType)
  throw Error("Unknown variant for TopicType object")
}


/** */
function convertSubjectTypeType(tt: SubjectTypeType): SubjectType {
  const obj = {};
  obj[tt] = null;
  return obj as SubjectType;
}
