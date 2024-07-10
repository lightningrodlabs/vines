/* This file is generated by zits. Do not edit manually */

import {
WebsocketConnectionOptions,
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

export interface AddAnyBeadInput {
  anyBead: AnyBead
  creationTime: Timestamp
  originalAuthor?: AgentPubKey
}

/**  */
export interface AddReactionInput {
  bead_ah: ActionHash
  emoji: string
  from?: AgentPubKey
}

/**  */
export interface AddEntryBeadInput {
  entryBead: EntryBead
  creationTime: Timestamp
  originalAuthor?: AgentPubKey
}

/**  */
export interface AddEntryAsBeadInput {
  eh: EntryHash
  bead: Bead
  roleName: string
  zomeName: string
  originalCreationTime?: Timestamp
  originalAuthor?: AgentPubKey
}

export interface GetLatestBeadsInput {
  pp_ah: ActionHash
  begin_time?: Timestamp
  end_time?: Timestamp
  target_limit?: number
}

export interface BeadLink {
  creationTime: Timestamp
  beadAh: ActionHash
  beadType: string
  author: AgentPubKey
}

export interface AddTextBeadAtInput {
  textBead: TextBead
  creationTime: Timestamp
}

export interface AddManyTextBeadAtInput {
  textBead: TextBead
  intervalUs: number
  count: number
}

export interface DecryptBeadInput {
  encBead: EncryptedBead
  otherAgent: AgentPubKey
}

export interface EncryptBeadInput {
  base: BaseBeadKind
  otherAgent: AgentPubKey
}

export interface AddEncBeadInput {
  encBead: EncryptedBead
  otherAgent: AgentPubKey
  creationTime: Timestamp
}

export interface CommitGlobalLogInput {
  maybe_ts?: Timestamp
  maybe_last_known_pp_ah?: ActionHash
}

export interface ProbeAllOutput {
  searchedInterval: SweepInterval
  newThreadsBySubject: [AnyLinkableHash, ActionHash][]
  newBeadsByThread: [ActionHash, BeadLink][]
}

export interface GetDataTypeInput {
  hash: AnyDhtHash
  role?: string
  dna?: DnaHash
}

/**  */
export interface NotifyPeerInput {
  content: AnyLinkableHash
  who: AgentPubKey
  event_index: number
}

/**
 * Notification settings are per ParticipationProtocol.
 * Default setting is MentionsOnly (for normal threads, AllMessages for DM threads).
 * An agent has to declare if it wants notifications for all messages or none, since it deviates from the default setting
 * 
 */
export enum NotifySetting {
	Never = 'Never',
	AllMessages = 'AllMessages',
	MentionsOnly = 'MentionsOnly',
}

export interface SetNotifySettingInput {
  pp_ah: ActionHash
  setting: NotifySetting
  agent: AgentPubKey
}

/** Input to the notify call */
export interface UpdateTopicInput {
  eh: EntryHash
  topic: SemanticTopic
}

/**  */
export interface FindSubjectsInput {
  appletId: string
  subjectType: string
}

export enum BaseBeadKindType {
	AnyBead = 'AnyBead',
	EntryBead = 'EntryBead',
	TextBead = 'TextBead',
}
export type BaseBeadKindVariantAnyBead = {AnyBead: AnyBead}
export type BaseBeadKindVariantEntryBead = {EntryBead: EntryBead}
export type BaseBeadKindVariantTextBead = {TextBead: TextBead}
export type BaseBeadKind = 
 | BaseBeadKindVariantAnyBead | BaseBeadKindVariantEntryBead | BaseBeadKindVariantTextBead;

/** First bead: prev_bead_ah == pp_ah */
export interface Bead {
  ppAh: ActionHash
  prevBeadAh: ActionHash
}

/**  */
export interface EntryBead {
  bead: Bead
  sourceEh: EntryHash
  sourceType: string
  sourceZome: string
  sourceRole: string
}

/**  */
export interface TextBead {
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
export interface EncryptedBead {
  forOther: unknown
  forSelf: unknown
  beadType: string
}

/**  */
export interface SemanticTopic {
  title: string
}

/**  */
export interface ParticipationProtocol {
  purpose: string
  rules: string
  subject: Subject
  subject_name: string
}

export interface Subject {
  hash: AnyLinkableHash
  typeName: string
  dnaHash: DnaHash
  appletId: string
}

export interface GlobalLastProbeLog {
  ts: Timestamp
  maybeLastKnownPpAh?: ActionHash
}

export interface ThreadLastProbeLog {
  ts: Timestamp
  ppAh: ActionHash
  maybeLastKnownBeadAh?: ActionHash
}

/**
 * -------------------------------------------------------------------------------------------------
 * Global consts
 * -------------------------------------------------------------------------------------------------
 * DNA/Zome names
 */
export const VINES_DEFAULT_ROLE_NAME = "rVines";

export const THREADS_DEFAULT_COORDINATOR_ZOME_NAME = "zThreads";

export const THREADS_DEFAULT_INTEGRITY_ZOME_NAME = "threads_integrity";

/** ANCHOR NAMES */
export const ROOT_ANCHOR_SEMANTIC_TOPICS = "all_semantic_topics";

export const ROOT_ANCHOR_SUBJECTS = "all_subjects";

export const SEMANTIC_TOPIC_TYPE_NAME = "SemanticTopic";

export const DM_SUBJECT_TYPE_NAME = "AgentPubKey";

export const GLOBAL_TIME_INDEX = "global_time";

export const PP_ITEM_TYPE = "__protocol";

/**
 * -------------------------------------------------------------------------------------------------
 * Entry types
 * -------------------------------------------------------------------------------------------------
 */
export enum ThreadsEntryType {
	AnyBead = 'AnyBead',
	EntryBead = 'EntryBead',
	TextBead = 'TextBead',
	EncryptedBead = 'EncryptedBead',
	SemanticTopic = 'SemanticTopic',
	ParticipationProtocol = 'ParticipationProtocol',
	GlobalLastProbeLog = 'GlobalLastProbeLog',
	ThreadLastProbeLog = 'ThreadLastProbeLog',
}
export type ThreadsEntryVariantAnyBead = {AnyBead: AnyBead}
export type ThreadsEntryVariantEntryBead = {EntryBead: EntryBead}
export type ThreadsEntryVariantTextBead = {TextBead: TextBead}
export type ThreadsEntryVariantEncryptedBead = {EncryptedBead: EncryptedBead}
export type ThreadsEntryVariantSemanticTopic = {SemanticTopic: SemanticTopic}
export type ThreadsEntryVariantParticipationProtocol = {ParticipationProtocol: ParticipationProtocol}
export type ThreadsEntryVariantGlobalLastProbeLog = {GlobalLastProbeLog: GlobalLastProbeLog}
export type ThreadsEntryVariantThreadLastProbeLog = {ThreadLastProbeLog: ThreadLastProbeLog}
export type ThreadsEntry = 
 | ThreadsEntryVariantAnyBead | ThreadsEntryVariantEntryBead | ThreadsEntryVariantTextBead | ThreadsEntryVariantEncryptedBead | ThreadsEntryVariantSemanticTopic | ThreadsEntryVariantParticipationProtocol | ThreadsEntryVariantGlobalLastProbeLog | ThreadsEntryVariantThreadLastProbeLog;

/** Dna properties */
export interface ThreadsProperties {
  minTopicNameLength: number
  maxTopicNameLength: number
  groupName: string
  groupSvgIcon: string
}
