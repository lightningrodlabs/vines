import {BeadLink, ParticipationProtocol, TopicType, TopicTypeType} from "../bindings/threads.types";
import {ActionHashB64, AgentPubKeyB64, encodeHashToBase64} from "@holochain/client";
import {Dictionary} from "@ddd-qc/lit-happ";
import {ThreadInfo} from "./threadInfo";

/** */
export interface TextMessageInfo {
  index_begin_time_us: number,
  create_time_us: number,
  author: AgentPubKeyB64,
  message: string,
}


/** */
export interface ThreadsPerspective {
  /** Store of all ST: eh -> Topic Title */
  allSemanticTopics: Dictionary<string>
  /** Store of all PPmat: ah -> PP */
  allParticipationProtocols: Dictionary<ParticipationProtocolMat>,
  /** Store threads for queried topics: TopicHash -> ProtocolAh */
  threadsByTopic: Dictionary<ActionHashB64[]>,
  /** Thread ah -> ThreadInfo */
  beadsByThread: Dictionary<ThreadInfo>,
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
