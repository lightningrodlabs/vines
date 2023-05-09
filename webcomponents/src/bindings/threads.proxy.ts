/* This file is generated by zits. Do not edit manually */

import {THREADS_ZOME_NAME, ROOT_ANCHOR_SEMANTIC_TOPICS, ROOT_ANCHOR_SUBJECTS, SEMANTIC_TOPIC_TYPE_NAME, GLOBAL_TIME_INDEX, DirectMessage, ThreadsEntry, ThreadsLinkType, TopicType, AppletTopicType, GetLatestBeadsInput, BeadLink, AddTextMessageAtInput, AddManyTextMessageAtInput, CreatePpInput, MyLinkFilter, GetItemsInput, ItemLink, TypedAnchor, SignalPayload, NotifyInput, Subject, GetProtocolsInput, SearchResponse, SearchInterval, TimedItemTag, Bead, TextMessage, SemanticTopic, ParticipationProtocol, GlobalQueryLog, ThreadQueryLog, } from './threads.types';
import {
/** types.ts */
HoloHash,
AgentPubKey,
DnaHash,
WasmHash,
EntryHash,
ActionHash,
AnyDhtHash,
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
Timestamp,
Duration,
HoloHashed,
NetworkInfo,
FetchQueueInfo,
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
ZomeCallCapGrant,
CapAccess,
CapGrant,
GrantedFunctionsType,
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

import {ZomeProxy} from '@ddd-qc/lit-happ';
import {threadsFunctionNames} from './threads.fn';

/**
 *
 */
export class ThreadsProxy extends ZomeProxy {
  static readonly DEFAULT_ZOME_NAME = "zThreads"
  static readonly FN_NAMES = threadsFunctionNames
 
  async getAllBeads(ppAh: ActionHash): Promise<[SearchInterval, BeadLink[]]> {
    return this.call('get_all_beads', ppAh);
  }

  async getLatestBeads(input: GetLatestBeadsInput): Promise<[SearchInterval, BeadLink[]]> {
    return this.call('get_latest_beads', input);
  }

  async getTextMessage(ah: ActionHash): Promise<[Timestamp, AgentPubKey, string]> {
    return this.call('get_text_message', ah);
  }

  async getManyTextMessage(ahs: ActionHash[]): Promise<[Timestamp, AgentPubKey, string][]> {
    return this.call('get_many_text_message', ahs);
  }

  async addTextMessage(texto: TextMessage): Promise<[ActionHash, string, Timestamp]> {
    return this.call('add_text_message', texto);
  }

  async addTextMessageAt(input: AddTextMessageAtInput): Promise<[ActionHash, string, Timestamp]> {
    return this.call('add_text_message_at', input);
  }

  async addManyTextMessageAt(input: AddManyTextMessageAtInput): Promise<[ActionHash, string, Timestamp][]> {
    return this.call('add_many_text_message_at', input);
  }



  async createParticipationProtocol(input: CreatePpInput): Promise<ActionHash> {
    return this.call('create_participation_protocol', input);
  }

  async createPpFromSemanticTopic(pp: ParticipationProtocol): Promise<ActionHash> {
    return this.call('create_pp_from_semantic_topic', pp);
  }

  async getPpsFromSubjectHash(lh: Uint8Array): Promise<ActionHash[]> {
    return this.call('get_pps_from_subject_hash', lh);
  }

  async getPpsFromSubjectAnchor(anchor: string): Promise<ActionHash[]> {
    return this.call('get_pps_from_subject_anchor', anchor);
  }

  async getPp(ah: ActionHash): Promise<ParticipationProtocol> {
    return this.call('get_pp', ah);
  }

  async getAllRootAnchors(): Promise<TypedAnchor[]> {
    return this.call('get_all_root_anchors', null);
  }

  async getItems(input: GetItemsInput): Promise<ItemLink[]> {
    return this.call('get_items', input);
  }

  async getAllItems(leafAnchor: string): Promise<ItemLink[]> {
    return this.call('get_all_items', leafAnchor);
  }

  async getAllItemsFromB64(b64: Uint8Array): Promise<ItemLink[]> {
    return this.call('get_all_items_from_b64', b64);
  }

  async getLeafAnchors(ta: TypedAnchor): Promise<TypedAnchor[]> {
    return this.call('get_leaf_anchors', ta);
  }

  async getTypedAnchor(anchor: string): Promise<[EntryHashB64, TypedAnchor | null]> {
    return this.call('get_typed_anchor', anchor);
  }

  async getTypedChildren(parentTa: TypedAnchor): Promise<TypedAnchor[]> {
    return this.call('get_typed_children', parentTa);
  }

  async createSemanticTopic(semanticTopic: SemanticTopic): Promise<EntryHash> {
    return this.call('create_semantic_topic', semanticTopic);
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


  async notifyPeers(input: NotifyInput): Promise<void> {
    return this.call('notify_peers', input);
  }

  async getAllSubjects(): Promise<Subject[]> {
    return this.call('get_all_subjects', null);
  }

  async getSubjectsForDna(dnaHash: DnaHash): Promise<Uint8Array[]> {
    return this.call('get_subjects_for_dna', dnaHash);
  }

  async getSubjectsForEntryType(input: GetProtocolsInput): Promise<Uint8Array[]> {
    return this.call('get_subjects_for_entry_type', input);
  }

  async getLatestItems(): Promise<SearchResponse> {
    return this.call('get_latest_items', null);
  }
}
