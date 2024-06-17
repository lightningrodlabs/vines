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
  canNotifyReply: boolean
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
  canNotifyReply: boolean
}

export interface BeadLink {
  creationTime: Timestamp
  beadAh: ActionHash
  beadType: string
  author: AgentPubKey
}

export interface GetLatestBeadsInput {
  pp_ah: ActionHash
  begin_time?: Timestamp
  end_time?: Timestamp
  target_limit?: number
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

export interface AddTextAtAndNotifyInput {
  textBead: TextBead
  creationTime: Timestamp
  mentionees: AgentPubKey[]
  canNotifyReply: boolean
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
  canNotifyReply: boolean
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
  hash: AnyLinkableHash
  role?: string
  dna?: DnaHash
}

/**  */
export interface NotifyPeerInput {
  content: AnyLinkableHash
  who: AgentPubKey
  event: NotifiableEvent
}

/**  */
export enum NotifiableEvent {
	NewBead = 'NewBead',
	Mention = 'Mention',
	Reply = 'Reply',
	Fork = 'Fork',
	NewDmThread = 'NewDmThread',
}

/**  */
export interface WeaveNotification {
  event: NotifiableEvent
  author: AgentPubKey
  timestamp: Timestamp
  link_ah: ActionHash
  content: AnyLinkableHash
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

/** Input to the notify call */
export interface BroadcastTipInput {
  tip: TipProtocol
  peers: AgentPubKey[]
}

/** Input to the notify call */
export interface EmitNotificationTipInput {
  notification: ThreadsNotification
  peer: AgentPubKey
}

/**  */
export interface ThreadsSignal {
  from: AgentPubKey
  pulses: ThreadsSignalProtocol[]
}

/** Data sent by UI ONLY. That's why we use B64 here. */
export enum ThreadsSignalProtocolType {
	System = 'System',
	Tip = 'Tip',
	Entry = 'Entry',
	Link = 'Link',
}
export type ThreadsSignalProtocolVariantSystem = {System: SystemSignalProtocol}
export type ThreadsSignalProtocolVariantTip = {Tip: TipProtocol}
export type ThreadsSignalProtocolVariantEntry = {Entry: [EntryInfo, ThreadsEntry]}
export type ThreadsSignalProtocolVariantLink = {Link: [ActionHash, LinkInfo, ThreadsLinkType]}
export type ThreadsSignalProtocol = 
 | ThreadsSignalProtocolVariantSystem | ThreadsSignalProtocolVariantTip | ThreadsSignalProtocolVariantEntry | ThreadsSignalProtocolVariantLink;

export interface SystemSignal {
  System: SystemSignalProtocol
}

export interface TipSignal {
  Tip: TipProtocol
}

/** Protocol for notifying the ViewModel (UI) of system level events */
export type SystemSignalProtocolVariantPostCommitStart = {
  type: "PostCommitStart"
  entry_type: string
}
export type SystemSignalProtocolVariantPostCommitEnd = {
  type: "PostCommitEnd"
  entry_type: string
  succeeded: boolean
}
export type SystemSignalProtocolVariantSelfCallStart = {
  type: "SelfCallStart"
  zome_name: string
  fn_name: string
}
export type SystemSignalProtocolVariantSelfCallEnd = {
  type: "SelfCallEnd"
  zome_name: string
  fn_name: string
  succeeded: boolean
}
export type SystemSignalProtocol =
  | SystemSignalProtocolVariantPostCommitStart
  | SystemSignalProtocolVariantPostCommitEnd
  | SystemSignalProtocolVariantSelfCallStart
  | SystemSignalProtocolVariantSelfCallEnd;

/**
 * 
 * Data sent by UI ONLY. That's why we use B64 here.
 * 
 */
export type TipProtocolVariantPing = {
  type: "Ping"
  from: AgentPubKeyB64
}
export type TipProtocolVariantPong = {
  type: "Pong"
  from: AgentPubKeyB64
}
  /**  */
export type TipProtocolVariantUpdateSemanticTopic = {
  type: "UpdateSemanticTopic"
  old_topic_eh: EntryHashB64
  new_topic_eh: EntryHashB64
  title: string
}
  /**  */
export type TipProtocolVariantNewSemanticTopic = {
  type: "NewSemanticTopic"
  topic_eh: EntryHashB64
  title: string
}
export type TipProtocolVariantNewPp = {
  type: "NewPp"
  creation_ts: Timestamp
  ah: ActionHashB64
  pp: ParticipationProtocol
}
export type TipProtocolVariantNewBead = {
  type: "NewBead"
  creation_ts: Timestamp
  bead_ah: ActionHashB64
  bead_type: string
  pp_ah: ActionHashB64
  data: Uint8Array
}
export type TipProtocolVariantEmojiReactionChange = {
  type: "EmojiReactionChange"
  bead_ah: ActionHashB64
  author: AgentPubKeyB64
  emoji: string
  is_added: boolean
}
  /**  */
export type TipProtocolVariantNotification = {
  type: "Notification"
  value: ThreadsNotification
}
export type TipProtocol =
  | TipProtocolVariantPing
  | TipProtocolVariantPong
  | TipProtocolVariantUpdateSemanticTopic
  | TipProtocolVariantNewSemanticTopic
  | TipProtocolVariantNewPp
  | TipProtocolVariantNewBead
  | TipProtocolVariantEmojiReactionChange
  | TipProtocolVariantNotification;

/**  */
export interface ThreadsNotification {
  pp_ah: ActionHash
  notification: WeaveNotification
  data: Uint8Array
}

/** Bool: True if state change just happened (real-time) */
export enum StateChangeType {
	Create = 'Create',
	Update = 'Update',
	Delete = 'Delete',
}
export type StateChangeVariantCreate = {Create: boolean}
export type StateChangeVariantUpdate = {Update: boolean}
export type StateChangeVariantDelete = {Delete: boolean}
export type StateChange = 
 | StateChangeVariantCreate | StateChangeVariantUpdate | StateChangeVariantDelete;

export interface EntryInfo {
  hash: AnyDhtHash
  ts: Timestamp
  author: AgentPubKey
  state: StateChange
}

export interface LinkInfo {
  base: AnyLinkableHash
  target: AnyLinkableHash
  tag?: number[]
  ts: Timestamp
  author: AgentPubKey
  state: StateChange
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
 * Threads Global consts
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
 * Threads zome's entry types
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

/**
 * -------------------------------------------------------------------------------------------------
 * Threads zome's link types
 * -------------------------------------------------------------------------------------------------
 */
export enum ThreadsLinkType {
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
	NotifySetting = 'NotifySetting',
	Favorite = 'Favorite',
	Dm = 'Dm',
}

/** Dna properties */
export interface ThreadsProperties {
  minTopicNameLength: number
  maxTopicNameLength: number
  groupName: string
  groupSvgIcon: string
}
