/* This file is generated by zits. Do not edit manually */

import {
/** types.ts */
HoloHash,
AgentPubKey,
DnaHash,
WasmHash,
EntryHash,
ActionHash,
AnyDhtHash,
ExternalHash,
KitsuneAgent,
KitsuneSpace,
HoloHashB64,
AgentPubKeyB64,
DnaHashB64,
WasmHashB64,
EntryHashB64,
ActionHashB64,
AnyDhtHashB64,
InstalledAppId,
Signature,
CellId,
DnaProperties,
RoleName,
InstalledCell,
Timestamp,
Duration,
HoloHashed,
NetworkInfo,
FetchPoolInfo,
/** hdk/action.ts */
SignedActionHashed,
RegisterAgentActivity,
ActionHashed,
ActionType,
Action,
NewEntryAction,
Dna,
AgentValidationPkg,
InitZomesComplete,
CreateLink,
DeleteLink,
OpenChain,
CloseChain,
Update,
Delete,
Create,
/** hdk/capabilities.ts */
CapSecret,
CapClaim,
GrantedFunctionsType,
GrantedFunctions,
ZomeCallCapGrant,
CapAccessType,
CapAccess,
CapGrant,
///** hdk/countersigning.ts */
//CounterSigningSessionData,
//PreflightRequest,
//CounterSigningSessionTimes,
//ActionBase,
//CounterSigningAgents,
//PreflightBytes,
//Role,
//CountersigningAgentState,
/** hdk/dht-ops.ts */
DhtOpType,
DhtOp,
getDhtOpType,
getDhtOpAction,
getDhtOpEntry,
getDhtOpSignature,
/** hdk/entry.ts */
EntryVisibility,
AppEntryDef,
EntryType,
EntryContent,
Entry,
/** hdk/record.ts */
Record as HcRecord,
RecordEntry as HcRecordEntry,
/** hdk/link.ts */
AnyLinkableHash,
ZomeIndex,
LinkType,
LinkTag,
RateWeight,
RateBucketId,
RateUnits,
Link,
/** api/admin/types.ts */
InstalledAppInfoStatus,
DeactivationReason,
DisabledAppReason,
StemCell,
ProvisionedCell,
ClonedCell,
CellType,
CellInfo,
AppInfo,
MembraneProof,
FunctionName,
ZomeName,
ZomeDefinition,
IntegrityZome,
CoordinatorZome,
DnaDefinition,
ResourceBytes,
ResourceMap,
CellProvisioningStrategy,
CellProvisioning,
DnaVersionSpec,
DnaVersionFlexible,
AppRoleDnaManifest,
AppRoleManifest,
AppManifest,
AppBundle,
AppBundleSource,
NetworkSeed,
ZomeLocation,
   } from '@holochain/client';

import {
/** Common */
DhtOpHashB64,
//DnaHashB64, (duplicate)
//AnyDhtHashB64, (duplicate)
DhtOpHash,
/** DnaFile */
DnaFile,
DnaDef,
Zomes,
WasmCode,
/** entry-details */
EntryDetails,
RecordDetails,
Details,
DetailsType,
EntryDhtStatus,
/** Validation */
ValidationStatus,
ValidationReceipt,
   } from '@holochain-open-dev/core-types';

/** User defined external dependencies */
import {ItemLink, SweepInterval, SweepResponse} from './deps.types';

/**  */
export interface AddReactionInput {
  emoji: string
  bead_ah: ActionHash
}

export interface AddEntryAsBead {
  eh: EntryHash
  bead: Bead
  roleName: string
  zomeName: string
}

export interface GetLatestBeadsInput {
  pp_ah: ActionHash
  begin_time?: Timestamp
  end_time?: Timestamp
  target_limit?: number
}

/**  */
export interface AddTextWithMentionsInput {
  texto: TextMessage
  mentionees: AgentPubKey[]
}

export interface AddTextAndMentionsAtInput {
  texto: TextMessage
  creationTime: Timestamp
  mentionees: AgentPubKey[]
}

export interface BeadLink {
  creationTime: Timestamp
  beadAh: ActionHash
  beadType: string
}

/** DEBUG ONLY */
export interface AddTextMessageAtInput {
  texto: TextMessage
  creationTime: Timestamp
}

export interface AddManyTextMessageAtInput {
  texto: TextMessage
  intervalUs: number
  count: number
}

export interface ProbeAllOutput {
  searchedInterval: SweepInterval
  newThreadsBySubject: [AnyLinkableHash, ActionHash][]
  newBeadsByThread: [ActionHash, BeadLink][]
}

/**  */
export type NotifiableEvent =
  | {Mention: null} | {Reply: null} | {Fork: null} | {Dm: null};
export enum NotifiableEventType {
	Mention = 'Mention',
	Reply = 'Reply',
	Fork = 'Fork',
	Dm = 'Dm',
}

/**  */
export interface WeaveNotification {
  event: NotifiableEvent
  author: AgentPubKey
  timestamp: Timestamp
  link_ah: ActionHash
  content: AnyLinkableHash
}

/** Input to the notify call */
export interface NotifyPeerInput {
  payload: WeaveSignal
  peer: AgentPubKey
}

/**  */
export interface SendInboxItemInput {
  content: AnyLinkableHash
  who: AgentPubKey
  event: NotifiableEvent
}

export interface CreatePpInput {
  pp: ParticipationProtocol
  appletId: string
  dnaHash: DnaHash
}

/**
 * 
 * Data sent by UI ONLY. That's why we use B64 here.
 * 
 */
export enum SignalPayloadType {
	DirectGossip = 'DirectGossip',
	Notification = 'Notification',
}
export type SignalPayload = 
 | {type: "DirectGossip", content: DirectGossip}
 | {type: "Notification", content: [WeaveNotification, Uint8Array]}


/**  */
export interface WeaveSignal {
  maybePpHash?: ActionHashB64
  from: AgentPubKeyB64
  payload: SignalPayload
}

/**
 * 
 * Data sent by UI ONLY. That's why we use B64 here.
 * 
 */
export enum DirectGossipType {
	Ping = 'Ping',
	Pong = 'Pong',
	NewSemanticTopic = 'NewSemanticTopic',
	NewPp = 'NewPp',
	NewBead = 'NewBead',
	EmojiReactionChange = 'EmojiReactionChange',
}
export type DirectGossip = 
 | {type: "Ping", content: AgentPubKeyB64}
 | {type: "Pong", content: AgentPubKeyB64}
 | {type: "NewSemanticTopic", content: [EntryHashB64, string]}
 | {type: "NewPp", content: [Timestamp, ActionHashB64, ParticipationProtocol]}
 | {type: "NewBead", content: [Timestamp, ActionHashB64, string, ActionHashB64, Uint8Array]}
 | {type: "EmojiReactionChange", content: [ActionHashB64, AgentPubKeyB64, string, boolean]}


/** Input to the notify call */
export interface SignalPeersInput {
  signal: WeaveSignal
  peers: AgentPubKey[]
}

export interface Subject {
  hash: AnyLinkableHash
  typeName: string
  dnaHash: DnaHash
  appletId: string
}

/**  */
export interface GetProtocolsInput {
  appletId: string
  subjectType: string
}

/**  */
export interface Bead {
  forProtocolAh: ActionHash
  maybeReplyOfAh?: ActionHash
}

/**  */
export interface EntryBead {
  bead: Bead
  fromRole: string
  fromZome: string
  subType: string
  eh: EntryHash
}

/**  */
export interface TextMessage {
  bead: Bead
  value: string
}

/**  */
export interface AnyBead {
  bead: Bead
  value: string
  typeInfo: string
}

/**  */
export interface SemanticTopic {
  title: string
}

/**  */
export interface ParticipationProtocol {
  purpose: string
  rules: string
  subjectHash: AnyLinkableHash
  subjectType: string
}

export interface GlobalLastProbeLog {
  time: Timestamp
  maybeLastKnownPpAh?: ActionHash
}

export interface ThreadLastProbeLog {
  time: Timestamp
  ppAh: ActionHash
  maybeLastKnownBeadAh?: ActionHash
}

/**
 * -------------------------------------------------------------------------------------------------
 * Threads Global consts
 * -------------------------------------------------------------------------------------------------
 * DNA/Zome names
 */
export const THREADS_DEFAULT_ROLE_NAME = "role_threads";

export const THREADS_DEFAULT_COORDINATOR_ZOME_NAME = "zThreads";

export const THREADS_DEFAULT_INTEGRITY_ZOME_NAME = "threads_integrity";

/** ANCHOR NAMES */
export const ROOT_ANCHOR_SEMANTIC_TOPICS = "all_semantic_topics";

export const ROOT_ANCHOR_SUBJECTS = "all_subjects";

export const SEMANTIC_TOPIC_TYPE_NAME = "SemanticTopic";

export const GLOBAL_TIME_INDEX = "global_time";

export const PP_ITEM_TYPE = "__protocol";

/**
 * -------------------------------------------------------------------------------------------------
 * Threads zome's entry types
 * -------------------------------------------------------------------------------------------------
 */
export enum ThreadsEntryType {
	AnyBead = 'AnyBead',
	EntryBead = 'EntryBead',
	SemanticTopic = 'SemanticTopic',
	ParticipationProtocol = 'ParticipationProtocol',
	TextMessage = 'TextMessage',
	GlobalProbeLog = 'GlobalProbeLog',
	ThreadProbeLog = 'ThreadProbeLog',
}
export type ThreadsEntryVariantAnyBead = {AnyBead: AnyBead}
export type ThreadsEntryVariantEntryBead = {EntryBead: EntryBead}
export type ThreadsEntryVariantSemanticTopic = {SemanticTopic: SemanticTopic}
export type ThreadsEntryVariantParticipationProtocol = {ParticipationProtocol: ParticipationProtocol}
export type ThreadsEntryVariantTextMessage = {TextMessage: TextMessage}
export type ThreadsEntryVariantGlobalProbeLog = {GlobalProbeLog: GlobalLastProbeLog}
export type ThreadsEntryVariantThreadProbeLog = {ThreadProbeLog: ThreadLastProbeLog}
export type ThreadsEntry = 
 | ThreadsEntryVariantAnyBead | ThreadsEntryVariantEntryBead | ThreadsEntryVariantSemanticTopic | ThreadsEntryVariantParticipationProtocol | ThreadsEntryVariantTextMessage | ThreadsEntryVariantGlobalProbeLog | ThreadsEntryVariantThreadProbeLog;

/**
 * -------------------------------------------------------------------------------------------------
 * Threads zome's link types
 * -------------------------------------------------------------------------------------------------
 */
export type ThreadsLinkType =
  | {ReversePath: null} | {GlobalTimePath: null} | {ThreadTimePath: null} | {SemanticTopicPath: null} | {SubjectPath: null} | {TimeItem: null} | {Topics: null} | {Threads: null} | {Beads: null} | {Protocols: null} | {Invalid: null} | {Inbox: null} | {Hide: null} | {EmojiReaction: null};
export enum ThreadsLinkTypeType {
	ReversePath = 'ReversePath',
	GlobalTimePath = 'GlobalTimePath',
	ThreadTimePath = 'ThreadTimePath',
	SemanticTopicPath = 'SemanticTopicPath',
	SubjectPath = 'SubjectPath',
	TimeItem = 'TimeItem',
	Topics = 'Topics',
	Threads = 'Threads',
	Beads = 'Beads',
	Protocols = 'Protocols',
	Invalid = 'Invalid',
	Inbox = 'Inbox',
	Hide = 'Hide',
	EmojiReaction = 'EmojiReaction',
}
