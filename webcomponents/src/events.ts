import {NotifiableEvent} from "./viewModels/threads.perspective";
import {ActionId, DhtId} from "@ddd-qc/lit-happ";
import {AgentId} from "@ddd-qc/cell-proxy";
import {DM_SUBJECT_TYPE_NAME, SEMANTIC_TOPIC_TYPE_NAME} from "./bindings/threads.types";

/** */
export enum SpecialSubjectType {
  Applet = "Applet",
  AgentPubKey = DM_SUBJECT_TYPE_NAME,
  ParticipationProtocol = "ParticipationProtocol",
  SubjectType = "SubjectType", // A subjectType can be a subject type
  /** Vines */
  SemanticTopic = SEMANTIC_TOPIC_TYPE_NAME,
  TextBead = "TextBead",
  AnyBead = "AnyBead",
  EntryBead = "EntryBead",
  EncryptedBead = "EncryptedBead",
  /** Feed */
  Post = "Thread",
}


export interface ShowProfileEvent {
  agentId: AgentId,
  x: number,
  y: number,
}


export interface JumpEvent {
  address: DhtId,
  type: JumpDestinationType,
}

export enum JumpDestinationType {
  Applet = "Applet",
  Thread = "Thread",
  Bead = "Bead",
  Dm = "Dm",
}


export function notification2JumpEvent(notif: NotifiableEvent): JumpDestinationType {
  if (NotifiableEvent.Fork === notif) {
    return JumpDestinationType.Thread;
  }
  if (NotifiableEvent.NewDmThread === notif) {
    return JumpDestinationType.Dm;
  }
  return JumpDestinationType.Bead;
}


/** */
export function beadJumpEvent(ah: ActionId): CustomEvent<JumpEvent> {
  return new CustomEvent<JumpEvent>('jump', {detail: {address: ah, type: JumpDestinationType.Bead}, bubbles: true, composed: true});
}

export function threadJumpEvent(ah: ActionId): CustomEvent<JumpEvent> {
  return new CustomEvent<JumpEvent>('jump', {detail: {address: ah, type: JumpDestinationType.Thread}, bubbles: true, composed: true});
}
