import {ParticipationProtocol, Subject, TopicType, TopicTypeType} from "../bindings/threads.types";
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
  /** Store of all ST: eh -> Topic Title */
  allSubjects: Dictionary<Subject>
  /** Store of all ST: eh -> Topic Title */
  allSemanticTopics: Dictionary<string>
  /** Store of all PPmat: pp_ah -> PP */
  allParticipationProtocols: Dictionary<ParticipationProtocolMat>,
  /** Store threads for queried topics: TopicHash -> ProtocolAh */
  threadsPerSubject: Dictionary<ActionHashB64[]>,
  /** pp_ah -> Thread */
  threads: Dictionary<Thread>,
  /** Ah -> TextMessageInfo */
  textMessages: Dictionary<TextMessageInfo>,

  // /** dnaHash -> Cell name */
  // dnaNames: Dictionary<string>
}



/**  */
export interface ParticipationProtocolMat {
  purpose: string
  rules: string
  topicHash: string //AnyDhtHashB64
  topicType: TopicTypeType
}


/** */
export function materializeParticipationProtocol(pp: ParticipationProtocol): ParticipationProtocolMat {
  return {
    purpose: pp.purpose,
    rules: pp.rules,
    topicHash: encodeHashToBase64(pp.topicHash),
    topicType: convertTopicType(pp.topicType),
  } as ParticipationProtocolMat;
}


/** */
function convertTopicType(tt: TopicType): TopicTypeType {
  for (const value in TopicTypeType) {
    const variant = value.charAt(0).toLowerCase() + value.slice(1); // un-capitalize
    if (variant in tt) {
      return (TopicTypeType as any)[value]
    }
  }
  console.error("convertTopicType() failed", tt)
  throw Error("Unknown variant for TopicType object")
}
/** */
function convertTopicTypeType(tt: TopicTypeType): TopicType {
  const obj = {};
  obj[tt] = null;
  return obj as TopicType;
}
