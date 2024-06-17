/* This file is generated by zits. Do not edit manually */

import {DM_SUBJECT_TYPE_NAME, GLOBAL_TIME_INDEX, PP_ITEM_TYPE, ROOT_ANCHOR_SEMANTIC_TOPICS, ROOT_ANCHOR_SUBJECTS, SEMANTIC_TOPIC_TYPE_NAME, THREADS_DEFAULT_COORDINATOR_ZOME_NAME, THREADS_DEFAULT_INTEGRITY_ZOME_NAME, VINES_DEFAULT_ROLE_NAME, BaseBeadKind, NotifiableEvent, NotifySetting, StateChange, SystemSignalProtocol, ThreadsEntry, ThreadsLinkType, ThreadsSignalProtocol, TipProtocol, AddAnyBeadInput, AddEncBeadInput, AddEntryAsBeadInput, AddEntryBeadInput, AddManyTextBeadAtInput, AddReactionInput, AddTextAtAndNotifyInput, AddTextBeadAtInput, AnyBead, Bead, BeadLink, BroadcastTipInput, CommitGlobalLogInput, DecryptBeadInput, EmitNotificationTipInput, EncryptBeadInput, EncryptedBead, EntryBead, EntryInfo, FindSubjectsInput, GetDataTypeInput, GetLatestBeadsInput, GlobalLastProbeLog, LinkInfo, NotifyPeerInput, ParticipationProtocol, ProbeAllOutput, SemanticTopic, SetNotifySettingInput, Subject, SystemSignal, TextBead, ThreadLastProbeLog, ThreadsNotification, ThreadsProperties, ThreadsSignal, TipSignal, UpdateTopicInput, WeaveNotification, } from './threads.types';
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

import {ZomeProxy} from '@ddd-qc/lit-happ';
import {threadsFunctionNames} from './threads.fn';

/**
 *
 */
export class ThreadsProxy extends ZomeProxy {
  static readonly DEFAULT_ZOME_NAME = "zThreads"
  static readonly FN_NAMES = threadsFunctionNames
 
  async publishAnyBead(input: AddAnyBeadInput): Promise<[ActionHash, string, Timestamp]> {
    return this.callBlocking('publish_any_bead', input);
  }

  async fetchAnyBeadOption(beadAh: ActionHash): Promise<[Timestamp, AgentPubKey, AnyBead] | null> {
    return this.call('fetch_any_bead_option', beadAh);
  }

  async fetchAnyBead(beadAh: ActionHash): Promise<[Timestamp, AgentPubKey, AnyBead]> {
    return this.call('fetch_any_bead', beadAh);
  }

  async fetchManyAnyBeads(ahs: ActionHash[]): Promise<[Timestamp, AgentPubKey, AnyBead][]> {
    return this.call('fetch_many_any_beads', ahs);
  }

  async publishReaction(input: AddReactionInput): Promise<void> {
    return this.callBlocking('publish_reaction', input);
  }

  async unpublishReaction(beadAh: ActionHash): Promise<void> {
    return this.callBlocking('unpublish_reaction', beadAh);
  }

  async pullReactions(beadAh: ActionHash): Promise<void> {
    return this.call('pull_reactions', beadAh);
  }

  async publishEntryBead(input: AddEntryBeadInput): Promise<[ActionHash, EntryBead, string, Timestamp]> {
    return this.callBlocking('publish_entry_bead', input);
  }

  async publishEntryAsBead(input: AddEntryAsBeadInput): Promise<[ActionHash, EntryBead, string, Timestamp]> {
    return this.callBlocking('publish_entry_as_bead', input);
  }

  async createEntryBead(input: AddEntryAsBeadInput): Promise<[EntryBead, Timestamp]> {
    return this.call('create_entry_bead', input);
  }

  async fetchEntryBeadOption(beadAh: ActionHash): Promise<[Timestamp, AgentPubKey, EntryBead] | null> {
    return this.call('fetch_entry_bead_option', beadAh);
  }

  async fetchEntryBead(beadAh: ActionHash): Promise<[Timestamp, AgentPubKey, EntryBead]> {
    return this.call('fetch_entry_bead', beadAh);
  }

  async fetchManyEntryBeads(ahs: ActionHash[]): Promise<[Timestamp, AgentPubKey, EntryBead][]> {
    return this.call('fetch_many_entry_beads', ahs);
  }

  async probeAllBeads(ppAh: ActionHash): Promise<[SweepInterval, BeadLink[]]> {
    return this.call('probe_all_beads', ppAh);
  }

  async probeLatestBeads(input: GetLatestBeadsInput): Promise<[SweepInterval, BeadLink[]]> {
    return this.call('probe_latest_beads', input);
  }

  async publishTextBead(texto: TextBead): Promise<[ActionHash, string, Timestamp]> {
    return this.callBlocking('publish_text_bead', texto);
  }

  async fetchTextBeadOption(ah: ActionHash): Promise<[Timestamp, AgentPubKey, TextBead] | null> {
    return this.call('fetch_text_bead_option', ah);
  }

  async fetchTextBead(ah: ActionHash): Promise<[Timestamp, AgentPubKey, TextBead]> {
    return this.call('fetch_text_bead', ah);
  }

  async fetchManyTextBead(ahs: ActionHash[]): Promise<[Timestamp, AgentPubKey, TextBead][]> {
    return this.call('fetch_many_text_bead', ahs);
  }

  async publishTextBeadAt(input: AddTextBeadAtInput): Promise<[ActionHash, string]> {
    return this.callBlocking('publish_text_bead_at', input);
  }

  async publishManyTextBeadAt(input: AddManyTextBeadAtInput): Promise<[ActionHash, string, Timestamp][]> {
    return this.callBlocking('publish_many_text_bead_at', input);
  }

  async publishTextBeadAtAndNotify(input: AddTextAtAndNotifyInput): Promise<[ActionHash, string]> {
    return this.callBlocking('publish_text_bead_at_and_notify', input);
  }




  async decryptMyBead(encBead: EncryptedBead): Promise<BaseBeadKind> {
    return this.call('decrypt_my_bead', encBead);
  }

  async decryptBead(input: DecryptBeadInput): Promise<BaseBeadKind> {
    return this.call('decrypt_bead', input);
  }

  async encryptBead(input: EncryptBeadInput): Promise<EncryptedBead> {
    return this.call('encrypt_bead', input);
  }

  async publishEncBead(input: AddEncBeadInput): Promise<[ActionHash, string, Timestamp]> {
    return this.callBlocking('publish_enc_bead', input);
  }

  async fetchEncBeadOption(beadAh: ActionHash): Promise<[Timestamp, AgentPubKey, EncryptedBead] | null> {
    return this.call('fetch_enc_bead_option', beadAh);
  }

  async fetchEncBead(beadAh: ActionHash): Promise<[Timestamp, AgentPubKey, EncryptedBead]> {
    return this.call('fetch_enc_bead', beadAh);
  }

  async fetchManyEncBeads(ahs: ActionHash[]): Promise<[Timestamp, AgentPubKey, EncryptedBead][]> {
    return this.call('fetch_many_enc_beads', ahs);
  }

  async probeDmThreads(): Promise<[AgentPubKey, ActionHash][]> {
    return this.call('probe_dm_threads', null);
  }

  async publishDmThread(otherAgent: AgentPubKey): Promise<ActionHash> {
    return this.callBlocking('publish_dm_thread', otherAgent);
  }

  async publishFavorite(beadAh: ActionHash): Promise<ActionHash> {
    return this.callBlocking('publish_favorite', beadAh);
  }

  async unpublishFavorite(beadAh: ActionHash): Promise<void> {
    return this.callBlocking('unpublish_favorite', beadAh);
  }

  async probeMyFavorites(): Promise<ActionHash[]> {
    return this.call('probe_my_favorites', null);
  }

  async queryGlobalLog(): Promise<[ActionHash, GlobalLastProbeLog]> {
    return this.call('query_global_log', null);
  }

  async commitGlobalLog(input: CommitGlobalLogInput): Promise<Timestamp> {
    return this.callBlocking('commit_global_log', input);
  }

  async probeAllLatest(begin: Timestamp): Promise<ProbeAllOutput> {
    return this.call('probe_all_latest', begin);
  }

  async probeAllBetween(searchedInterval: SweepInterval): Promise<ProbeAllOutput> {
    return this.call('probe_all_between', searchedInterval);
  }

  async commitThreadLog(tql: ThreadLastProbeLog): Promise<ActionHash> {
    return this.callBlocking('commit_thread_log', tql);
  }

  async queryThreadLogs(): Promise<ThreadLastProbeLog[]> {
    return this.call('query_thread_logs', null);
  }



  async getRecordAuthor(dh: AnyDhtHash): Promise<AgentPubKey> {
    return this.call('get_record_author', dh);
  }

  async getDataType(input: GetDataTypeInput): Promise<string> {
    return this.call('get_data_type', input);
  }

  async probeInbox(): Promise<void> {
    return this.call('probe_inbox', null);
  }

  async unpublishNotification(linkAh: ActionHash): Promise<void> {
    return this.callBlocking('unpublish_notification', linkAh);
  }

  async publishNotifySetting(input: SetNotifySettingInput): Promise<ActionHash | null> {
    return this.callBlocking('publish_notify_setting', input);
  }

  async pullMyNotifySettings(ppAh: ActionHash): Promise<[NotifySetting, ActionHash | null]> {
    return this.call('pull_my_notify_settings', ppAh);
  }

  async pullNotifySettings(pair: [ActionHash, AgentPubKey]): Promise<[NotifySetting, ActionHash | null]> {
    return this.call('pull_notify_settings', pair);
  }

  async pullPpNotifySettings(ppAh: ActionHash): Promise<[AgentPubKey, NotifySetting, ActionHash][]> {
    return this.call('pull_pp_notify_settings', ppAh);
  }

  async fetchPp(ah: ActionHash): Promise<[ParticipationProtocol, Timestamp, AgentPubKey]> {
    return this.call('fetch_pp', ah);
  }

  async probePpsFromSubjectHash(lh: AnyLinkableHash): Promise<[ActionHash, Timestamp][]> {
    return this.call('probe_pps_from_subject_hash', lh);
  }

  async probePpsFromSubjectAnchor(anchor: string): Promise<[ActionHash, Timestamp][]> {
    return this.call('probe_pps_from_subject_anchor', anchor);
  }

  async publishParticipationProtocol(pp: ParticipationProtocol): Promise<[ActionHash, Timestamp]> {
    return this.callBlocking('publish_participation_protocol', pp);
  }

  async probeLatestItems(): Promise<SweepResponse> {
    return this.call('probe_latest_items', null);
  }

  async queryAll(): Promise<void> {
    return this.call('query_all', null);
  }

  async queryPps(): Promise<void> {
    return this.call('query_pps', null);
  }

  async querySemanticTopics(): Promise<void> {
    return this.call('query_semantic_topics', null);
  }

  async queryAnyBeads(): Promise<void> {
    return this.call('query_any_beads', null);
  }

  async queryEntryBeads(): Promise<void> {
    return this.call('query_entry_beads', null);
  }

  async queryTextBeads(): Promise<void> {
    return this.call('query_text_beads', null);
  }

  async queryEncBeads(): Promise<void> {
    return this.call('query_enc_beads', null);
  }

  async publishSemanticTopic(semanticTopic: SemanticTopic): Promise<EntryHash> {
    return this.callBlocking('publish_semantic_topic', semanticTopic);
  }

  async pullAllSemanticTopics(): Promise<void> {
    return this.call('pull_all_semantic_topics', null);
  }

  async searchSemanticTopics(titleFilter: string): Promise<[EntryHash, string][]> {
    return this.call('search_semantic_topics', titleFilter);
  }

  async updateSemanticTopic(input: UpdateTopicInput): Promise<EntryHash> {
    return this.callBlocking('update_semantic_topic', input);
  }

  async broadcastTip(input: BroadcastTipInput): Promise<void> {
    return this.call('broadcast_tip', input);
  }

  async castNotificationTip(input: EmitNotificationTipInput): Promise<void> {
    return this.call('cast_notification_tip', input);
  }

  async findSubjectsByType(input: FindSubjectsInput): Promise<[DnaHash, AnyLinkableHash][]> {
    return this.call('find_subjects_by_type', input);
  }

  async findSubjectsForApplet(appletId: string): Promise<[DnaHash, AnyLinkableHash][]> {
    return this.call('find_subjects_for_applet', appletId);
  }

  async findSubjectTypesForApplet(appletId: string): Promise<[string, EntryHash][]> {
    return this.call('find_subject_types_for_applet', appletId);
  }

  async findHideLink(subjectHash: AnyLinkableHash): Promise<ActionHash | null> {
    return this.call('find_hide_link', subjectHash);
  }

  async hideSubject(subjectHash: AnyLinkableHash): Promise<ActionHash> {
    return this.callBlocking('hide_subject', subjectHash);
  }

  async unhideSubject(subjectHash: AnyLinkableHash): Promise<void> {
    return this.callBlocking('unhide_subject', subjectHash);
  }

  async probeAllHiddens(): Promise<void> {
    return this.call('probe_all_hiddens', null);
  }

  async pullAllSubjects(): Promise<Subject[]> {
    return this.call('pull_all_subjects', null);
  }

  async pullApplets(): Promise<string[]> {
    return this.call('pull_applets', null);
  }
}
