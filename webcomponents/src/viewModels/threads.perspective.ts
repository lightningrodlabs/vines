import {ParticipationProtocol, TopicType, TopicTypeType} from "../bindings/threads.types";
import {encodeHashToBase64} from "@holochain/client";


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
