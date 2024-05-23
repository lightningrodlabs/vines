/* This file is generated by zits. Do not edit manually */

import {GLOBAL_TIME_INDEX, PP_ITEM_TYPE, ROOT_ANCHOR_SEMANTIC_TOPICS, ROOT_ANCHOR_SUBJECTS, SEMANTIC_TOPIC_TYPE_NAME, THREADS_DEFAULT_COORDINATOR_ZOME_NAME, THREADS_DEFAULT_INTEGRITY_ZOME_NAME, VINES_DEFAULT_ROLE_NAME, BaseBeadKind, DirectGossip, NotifiableEvent, NotifySetting, SignalPayload, ThreadsEntry, ThreadsLinkType, AddAnyBeadInput, AddEncBeadInput, AddEntryAsBeadInput, AddEntryBeadInput, AddManyTextBeadAtInput, AddReactionInput, AddTextAtAndNotifyInput, AddTextBeadAtInput, AnyBead, Bead, BeadLink, CommitGlobalLogInput, DecryptBeadInput, EncryptBeadInput, EncryptedBead, EntryBead, GetDataTypeInput, GetLatestBeadsInput, GetProtocolsInput, GlobalLastProbeLog, NotifyNewDmThreadInput, NotifyPeerInput, ParticipationProtocol, ProbeAllOutput, SemanticTopic, SendInboxItemInput, SetNotifySettingInput, SignalPeersInput, Subject, TextBead, ThreadLastProbeLog, ThreadsProperties, UpdateTopicInput, WeaveNotification, WeaveSignal, } from './threads.types';
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
 
  async addAnyBead(input: AddAnyBeadInput): Promise<[ActionHash, string, Timestamp, [AgentPubKey, WeaveNotification][]]> {
    return this.callBlocking('add_any_bead', input);
  }

  async getAnyBeadOption(beadAh: ActionHash): Promise<[Timestamp, AgentPubKey, AnyBead] | null> {
    return this.call('get_any_bead_option', beadAh);
  }

  async getAnyBead(beadAh: ActionHash): Promise<[Timestamp, AgentPubKey, AnyBead]> {
    return this.call('get_any_bead', beadAh);
  }

  async getManyAnyBeads(ahs: ActionHash[]): Promise<[Timestamp, AgentPubKey, AnyBead][]> {
    return this.call('get_many_any_beads', ahs);
  }

  async queryAnyBeads(): Promise<[Timestamp, ActionHash, AnyBead][]> {
    return this.call('query_any_beads', null);
  }

  async addReaction(input: AddReactionInput): Promise<void> {
    return this.callBlocking('add_reaction', input);
  }

  async removeReaction(beadAh: ActionHash): Promise<void> {
    return this.callBlocking('remove_reaction', beadAh);
  }

  async getReactions(beadAh: ActionHash): Promise<[AgentPubKey, string][]> {
    return this.call('get_reactions', beadAh);
  }

  async addEntryBead(input: AddEntryBeadInput): Promise<[ActionHash, EntryBead, string, Timestamp]> {
    return this.callBlocking('add_entry_bead', input);
  }

  async addEntryAsBead(input: AddEntryAsBeadInput): Promise<[ActionHash, EntryBead, string, Timestamp, [AgentPubKey, WeaveNotification][]]> {
    return this.callBlocking('add_entry_as_bead', input);
  }

  async getEntryBeadOption(beadAh: ActionHash): Promise<[Timestamp, AgentPubKey, EntryBead] | null> {
    return this.call('get_entry_bead_option', beadAh);
  }

  async getEntryBead(beadAh: ActionHash): Promise<[Timestamp, AgentPubKey, EntryBead]> {
    return this.call('get_entry_bead', beadAh);
  }

  async getManyEntryBeads(ahs: ActionHash[]): Promise<[Timestamp, AgentPubKey, EntryBead][]> {
    return this.call('get_many_entry_beads', ahs);
  }

  async queryEntryBeads(): Promise<[Timestamp, ActionHash, EntryBead][]> {
    return this.call('query_entry_beads', null);
  }

  async getAllBeads(ppAh: ActionHash): Promise<[SweepInterval, BeadLink[]]> {
    return this.call('get_all_beads', ppAh);
  }

  async getLatestBeads(input: GetLatestBeadsInput): Promise<[SweepInterval, BeadLink[]]> {
    return this.call('get_latest_beads', input);
  }

  async addTextBead(texto: TextBead): Promise<[ActionHash, string, Timestamp]> {
    return this.callBlocking('add_text_bead', texto);
  }

  async getTextBeadOption(ah: ActionHash): Promise<[Timestamp, AgentPubKey, TextBead] | null> {
    return this.call('get_text_bead_option', ah);
  }

  async getTextBead(ah: ActionHash): Promise<[Timestamp, AgentPubKey, TextBead]> {
    return this.call('get_text_bead', ah);
  }

  async getManyTextBead(ahs: ActionHash[]): Promise<[Timestamp, AgentPubKey, TextBead][]> {
    return this.call('get_many_text_bead', ahs);
  }

  async queryTextBeads(): Promise<[Timestamp, ActionHash, TextBead][]> {
    return this.call('query_text_beads', null);
  }

  async addTextBeadAt(input: AddTextBeadAtInput): Promise<[ActionHash, string]> {
    return this.callBlocking('add_text_bead_at', input);
  }

  async addManyTextBeadAt(input: AddManyTextBeadAtInput): Promise<[ActionHash, string, Timestamp][]> {
    return this.callBlocking('add_many_text_bead_at', input);
  }

  async addTextBeadAtAndNotify(input: AddTextAtAndNotifyInput): Promise<[ActionHash, string, [AgentPubKey, WeaveNotification][]]> {
    return this.callBlocking('add_text_bead_at_and_notify', input);
  }


  async createDmThread(otherAgent: AgentPubKey): Promise<ActionHash> {
    return this.callBlocking('create_dm_thread', otherAgent);
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

  async addEncBead(input: AddEncBeadInput): Promise<[ActionHash, string, Timestamp, [AgentPubKey, WeaveNotification][]]> {
    return this.callBlocking('add_enc_bead', input);
  }

  async getEncBeadOption(beadAh: ActionHash): Promise<[Timestamp, AgentPubKey, EncryptedBead] | null> {
    return this.call('get_enc_bead_option', beadAh);
  }

  async getEncBead(beadAh: ActionHash): Promise<[Timestamp, AgentPubKey, EncryptedBead]> {
    return this.call('get_enc_bead', beadAh);
  }

  async getManyEncBeads(ahs: ActionHash[]): Promise<[Timestamp, AgentPubKey, EncryptedBead][]> {
    return this.call('get_many_enc_beads', ahs);
  }

  async queryEncBeads(): Promise<[Timestamp, ActionHash, EncryptedBead][]> {
    return this.call('query_enc_beads', null);
  }

  async getDmThreads(): Promise<[AgentPubKey, ActionHash][]> {
    return this.call('get_dm_threads', null);
  }

  async notifyNewDmThread(input: NotifyNewDmThreadInput): Promise<WeaveNotification> {
    return this.call('notify_new_dm_thread', input);
  }

  async setFavorite(beadAh: ActionHash): Promise<ActionHash> {
    return this.callBlocking('set_favorite', beadAh);
  }

  async unsetFavorite(beadAh: ActionHash): Promise<void> {
    return this.callBlocking('unset_favorite', beadAh);
  }

  async getMyFavorites(): Promise<ActionHash[]> {
    return this.call('get_my_favorites', null);
  }

  async getLatestItems(): Promise<SweepResponse> {
    return this.call('get_latest_items', null);
  }

  async getGlobalLog(): Promise<GlobalLastProbeLog> {
    return this.call('get_global_log', null);
  }

  async commitGlobalLog(input: CommitGlobalLogInput): Promise<Timestamp> {
    return this.callBlocking('commit_global_log', input);
  }

  async queryGlobalLog(): Promise<[Timestamp, GlobalLastProbeLog][]> {
    return this.call('query_global_log', null);
  }

  async probeAllLatest(begin: Timestamp): Promise<ProbeAllOutput> {
    return this.call('probe_all_latest', begin);
  }

  async probeAllBetween(searchedInterval: SweepInterval): Promise<ProbeAllOutput> {
    return this.call('probe_all_between', searchedInterval);
  }

  async getThreadLog(eh: EntryHash): Promise<ThreadLastProbeLog> {
    return this.call('get_thread_log', eh);
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

  async notifyPeer(input: NotifyPeerInput): Promise<void> {
    return this.call('notify_peer', input);
  }

  async sendInboxItem(input: SendInboxItemInput): Promise<[ActionHash, WeaveNotification] | null> {
    return this.callBlocking('send_inbox_item', input);
  }

  async probeInbox(): Promise<WeaveNotification[]> {
    return this.call('probe_inbox', null);
  }

  async deleteInboxItem(linkAh: ActionHash): Promise<void> {
    return this.callBlocking('delete_inbox_item', linkAh);
  }

  async setNotifySetting(input: SetNotifySettingInput): Promise<ActionHash | null> {
    return this.callBlocking('set_notify_setting', input);
  }

  async getMyNotifySettings(ppAh: ActionHash): Promise<[NotifySetting, ActionHash | null]> {
    return this.call('get_my_notify_settings', ppAh);
  }

  async getNotifySettings(pair: [ActionHash, AgentPubKey]): Promise<[NotifySetting, ActionHash | null]> {
    return this.call('get_notify_settings', pair);
  }

  async getPpNotifySettings(ppAh: ActionHash): Promise<[AgentPubKey, NotifySetting, ActionHash][]> {
    return this.call('get_pp_notify_settings', ppAh);
  }

  async createParticipationProtocol(pp: ParticipationProtocol): Promise<[ActionHash, Timestamp, [AgentPubKey, WeaveNotification] | null]> {
    return this.callBlocking('create_participation_protocol', pp);
  }

  async getPpsFromSubjectHash(lh: AnyLinkableHash): Promise<[ActionHash, Timestamp][]> {
    return this.call('get_pps_from_subject_hash', lh);
  }

  async getPpsFromSubjectAnchor(anchor: string): Promise<[ActionHash, Timestamp][]> {
    return this.call('get_pps_from_subject_anchor', anchor);
  }

  async queryPps(): Promise<[Timestamp, AgentPubKey, ActionHash, ParticipationProtocol][]> {
    return this.call('query_pps', null);
  }

  async getPp(ah: ActionHash): Promise<[ParticipationProtocol, Timestamp, AgentPubKey]> {
    return this.call('get_pp', ah);
  }

  async createSemanticTopic(semanticTopic: SemanticTopic): Promise<EntryHash> {
    return this.callBlocking('create_semantic_topic', semanticTopic);
  }

  async getAllSemanticTopics(): Promise<[EntryHash, string][]> {
    return this.call('get_all_semantic_topics', null);
  }

  async searchSemanticTopics(titleFilter: string): Promise<[EntryHash, string][]> {
    return this.call('search_semantic_topics', titleFilter);
  }

  async getTopic(eh: EntryHash): Promise<SemanticTopic> {
    return this.call('get_topic', eh);
  }

  async querySemanticTopics(): Promise<[Timestamp, EntryHash, SemanticTopic][]> {
    return this.call('query_semantic_topics', null);
  }

  async updateSemanticTopic(input: UpdateTopicInput): Promise<EntryHash> {
    return this.callBlocking('update_semantic_topic', input);
  }


  async signalPeers(input: SignalPeersInput): Promise<void> {
    return this.call('signal_peers', input);
  }

  async getAllSubjects(): Promise<Subject[]> {
    return this.call('get_all_subjects', null);
  }

  async getApplets(): Promise<string[]> {
    return this.call('get_applets', null);
  }

  async getSubjectsByType(input: GetProtocolsInput): Promise<[DnaHash, AnyLinkableHash][]> {
    return this.call('get_subjects_by_type', input);
  }

  async getSubjectsForApplet(appletId: string): Promise<[DnaHash, AnyLinkableHash][]> {
    return this.call('get_subjects_for_applet', appletId);
  }

  async getSubjectTypesForApplet(appletId: string): Promise<[string, EntryHash][]> {
    return this.call('get_subject_types_for_applet', appletId);
  }

  async getHideLink(subjectHash: AnyLinkableHash): Promise<ActionHash | null> {
    return this.call('get_hide_link', subjectHash);
  }

  async hideSubject(subjectHash: AnyLinkableHash): Promise<ActionHash> {
    return this.callBlocking('hide_subject', subjectHash);
  }

  async unhideSubject(subjectHash: AnyLinkableHash): Promise<void> {
    return this.callBlocking('unhide_subject', subjectHash);
  }

  async getHiddenSubjects(): Promise<AnyLinkableHash[]> {
    return this.call('get_hidden_subjects', null);
  }
}
