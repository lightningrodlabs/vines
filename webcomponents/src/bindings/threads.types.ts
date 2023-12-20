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

export interface AddEntryAsBead {
  eh: EntryHash
  forProtocolAh: ActionHash
  roleName: string
  zomeName: string
}

export interface GetLatestBeadsInput {
  ppAh: ActionHash
  beginTime?: Timestamp
  endTime?: Timestamp
  targetLimit?: number
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

export interface ProbeAllLatestOutput {
  searchedInterval: SweepInterval
  newThreadsBySubject: [Uint8Array, ActionHash][]
  newBeadsByThread: [ActionHash, BeadLink][]
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
export enum DirectMessageType {
	Ping = 'Ping',
	Pong = 'Pong',
	NewSemanticTopic = 'NewSemanticTopic',
	NewPp = 'NewPp',
	NewBead = 'NewBead',
}
export type DirectMessage = 
 | {type: "Ping", content: AgentPubKeyB64}
 | {type: "Pong", content: AgentPubKeyB64}
 | {type: "NewSemanticTopic", content: [EntryHashB64, string]}
 | {type: "NewPp", content: ActionHashB64}
 | {type: "NewBead", content: [ActionHashB64, string, number[]]}


export interface SignalPayload {
  maybePpHash?: ActionHashB64
  from: AgentPubKeyB64
  dm: DirectMessage
}

/** Input to the notify call */
export interface NotifyInput {
  signal: SignalPayload
  peers: AgentPubKeyB64[]
}

export interface Subject {
  hash: Uint8Array
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
  value: string
  bead: Bead
}

/**  */
export interface SemanticTopic {
  title: string
}

/**  */
export interface ParticipationProtocol {
  purpose: string
  rules: string
  subjectHash: Uint8Array
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
	EntryBead = 'EntryBead',
	SemanticTopic = 'SemanticTopic',
	ParticipationProtocol = 'ParticipationProtocol',
	TextMessage = 'TextMessage',
	GlobalProbeLog = 'GlobalProbeLog',
	ThreadProbeLog = 'ThreadProbeLog',
}
export type ThreadsEntryVariantEntryBead = {EntryBead: EntryBead}
export type ThreadsEntryVariantSemanticTopic = {SemanticTopic: SemanticTopic}
export type ThreadsEntryVariantParticipationProtocol = {ParticipationProtocol: ParticipationProtocol}
export type ThreadsEntryVariantTextMessage = {TextMessage: TextMessage}
export type ThreadsEntryVariantGlobalProbeLog = {GlobalProbeLog: GlobalLastProbeLog}
export type ThreadsEntryVariantThreadProbeLog = {ThreadProbeLog: ThreadLastProbeLog}
export type ThreadsEntry = 
 | ThreadsEntryVariantEntryBead | ThreadsEntryVariantSemanticTopic | ThreadsEntryVariantParticipationProtocol | ThreadsEntryVariantTextMessage | ThreadsEntryVariantGlobalProbeLog | ThreadsEntryVariantThreadProbeLog;

/**
 * -------------------------------------------------------------------------------------------------
 * Threads zome's link types
 * -------------------------------------------------------------------------------------------------
 */
export type ThreadsLinkType =
  | {ReversePath: null} | {GlobalTimePath: null} | {ThreadTimePath: null} | {SemanticTopicPath: null} | {SubjectPath: null} | {TimeItem: null} | {Topics: null} | {Threads: null} | {Beads: null} | {Protocols: null} | {Invalid: null} | {Mention: null} | {Hide: null};
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
	Mention = 'Mention',
	Hide = 'Hide',
}
