import {ActionId, AnyId, EntryId} from "@ddd-qc/lit-happ";
import {AgentId} from "@ddd-qc/cell-proxy";
import {DM_SUBJECT_TYPE_NAME, SEMANTIC_TOPIC_TYPE_NAME} from "./bindings/threads.types";
import {WAL} from "@theweave/api";
import {NotifiableEvent, ThreadsNotification} from "./viewModels/threads.materialize";

// export type ViewFileEvent = {
//   dnaId: DnaId,
//   manifestEh: EntryId,
// }

export type FavoritesEvent = {
  beadAh: ActionId,
  canAdd: boolean,
}

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
  type: MainViewType,
  thread?: ActionId,
  bead?: ActionId,
  agent?: AgentId,
  //dna?: DnaId,
}


export enum MainViewType {
  Favorites = "Favorites",
  Files = "Files",
  Thread = "Thread",
  MultiThread = "MultiThread",
}

export function notification2JumpEvent(notif: ThreadsNotification): CustomEvent<JumpEvent> {
  let detail: JumpEvent = {
      type: MainViewType.Thread,
  };
  if (NotifiableEvent.Fork === notif.event || NotifiableEvent.NewDmThread === notif.event) {
    detail.thread = notif.content;
  } else {
    detail.bead = notif.content;
  }
  return new CustomEvent<JumpEvent>('jump', {detail, bubbles: true, composed: true});
}



/** */
export function beadJumpEvent(bead: ActionId): CustomEvent<JumpEvent> {
  return new CustomEvent<JumpEvent>('jump', {detail: {bead, type: MainViewType.Thread}, bubbles: true, composed: true});
}

export function threadJumpEvent(ah: ActionId): CustomEvent<JumpEvent> {
  return new CustomEvent<JumpEvent>('jump', {detail: {thread: ah, type: MainViewType.Thread}, bubbles: true, composed: true});
}

export function multiJumpEvent(thread: ActionId, agent: AgentId): CustomEvent<JumpEvent> {
  return new CustomEvent<JumpEvent>('jump', {detail: {thread, agent, type: MainViewType.MultiThread}, bubbles: true, composed: true});
}

export function favoritesJumpEvent(): CustomEvent<JumpEvent> {
  return new CustomEvent<JumpEvent>('jump', {detail: {type: MainViewType.Favorites}, bubbles: true, composed: true});
}

export function filesJumpEvent(): CustomEvent<JumpEvent> {
  return new CustomEvent<JumpEvent>('jump', {detail: {type: MainViewType.Files}, bubbles: true, composed: true});
}

export function favoritesEvent(beadAh: ActionId, canAdd: boolean): CustomEvent<FavoritesEvent> {
  return new CustomEvent<FavoritesEvent>('favorites', {detail: {beadAh, canAdd}, bubbles: true, composed: true});
}

export function viewFileEvent(/*dnaId: DnaId,*/ manifestEh: EntryId): CustomEvent<EntryId> {
  return new CustomEvent<EntryId>('view', {detail: manifestEh, bubbles: true, composed: true});
}
