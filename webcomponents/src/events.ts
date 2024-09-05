import {NotifiableEvent} from "./viewModels/threads.materialize";
import {ActionId, AnyId, DhtId, EntryId} from "@ddd-qc/lit-happ";
import {AgentId} from "@ddd-qc/cell-proxy";
import {DM_SUBJECT_TYPE_NAME, SEMANTIC_TOPIC_TYPE_NAME} from "./bindings/threads.types";
import {WAL} from "@lightningrodlabs/we-applet";


export type ViewEmbedEvent = {
  blobUrl: string,
  mime: string,
}

export type ShowEmojiEvent = {
  bead: ActionId,
  x: number,
  y: number,
}

export interface VinesInputEvent {
  text?: string,
  file?: File,
  wal?: WAL,
}


/** */
export type EditTopicRequest = {
  topicHash: EntryId,
  subjectName: string,
}


/** */
export type CommentRequest = {
  maybeCommentThread: ActionId | null,
  subjectId: AnyId,
  subjectType: string,
  subjectName: string,
  viewType: string,
}


/** */
export enum SpecialSubjectType {
  Asset = "Asset",
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
  Post = "Post",
}


export type HideEvent = {
  address: AnyId, // Action = pp ; Entry = Topic ; AgentId dm
  //type: string,
  hide: boolean
}

export type ShowProfileEvent = {
  agentId: AgentId,
  x: number,
  y: number,
}


export type JumpEvent = {
  address: DhtId,
  type: JumpDestinationType,
}

export enum JumpDestinationType {
  Applet = "Applet",
  Thread = "Thread",
  Bead = "Bead",
  Dm = "Dm",
}


/** */
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
