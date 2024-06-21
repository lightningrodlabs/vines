import {
  ActionHash,
  ActionHashB64,
  AgentPubKey,
  AgentPubKeyB64, AnyDhtHash, AnyLinkableHash,
  AppSignal,
  AppSignalCb,
  decodeHashFromBase64,
  DnaHashB64,
  encodeHashToBase64,
  EntryHashB64, HASH_TYPE_PREFIX,
  Link, sliceHashType,
  Timestamp,
} from "@holochain/client";
import {
  AddEntryAsBeadInput,
  AnyBead,
  BaseBeadKind,
  Bead,
  BeadLink,
  CommitGlobalLogInput,
  DM_SUBJECT_TYPE_NAME,
  EncryptedBead,
  EntryBead,
  EntryInfo,
  GlobalLastProbeLog,
  NotifiableEvent,
  NotifyPeerInput,
  NotifySetting,
  ParticipationProtocol,
  SEMANTIC_TOPIC_TYPE_NAME,
  SetNotifySettingInput,
  StateChange,
  StateChangeType,
  StateChangeVariantCreate,
  Subject,
  TextBead,
  ThreadLastProbeLog,
  ThreadsEntry,
  ThreadsEntryType,
  ThreadsEntryVariantAnyBead,
  ThreadsEntryVariantEncryptedBead,
  ThreadsEntryVariantEntryBead,
  ThreadsEntryVariantGlobalLastProbeLog,
  ThreadsEntryVariantParticipationProtocol,
  ThreadsEntryVariantSemanticTopic,
  ThreadsEntryVariantTextBead,
  ThreadsEntryVariantThreadLastProbeLog,
  ThreadsLinkType,
  ThreadsNotificationTip,
  ThreadsSignal,
  ThreadsSignalProtocol,
  ThreadsSignalProtocolType,
  TipProtocol,
} from "../bindings/threads.types";
import {ThreadsProxy} from "../bindings/threads.proxy";
import {Dictionary, LitHappSignal, prettyDate, SignalLog, SignalType, ZomeViewModel} from "@ddd-qc/lit-happ";
import {
  AnyBeadMat,
  AnyLinkableHashB64,
  base2typed,
  BaseBeadType,
  BeadInfo,
  BeadLinkMaterialized,
  BeadType, dematerializeAnyBead,
  dematerializeEntryBead,
  dematerializeParticipationProtocol, dematerializeTextBead,
  dematerializeTypedBead,
  EncryptedBeadContent,
  EntryBeadMat,
  intoExportable,
  materializeBead,
  materializeParticipationProtocol,
  materializeSubject,
  materializeTypedBead, NotificationTipBeadData, NotificationTipPpData,
  ParticipationProtocolMat,
  SubjectMat,
  TextBeadMat,
  ThreadsExportablePerspective,
  ThreadsNotification,
  ThreadsPerspective,
  TypedBaseBead,
  TypedBaseBeadMat,
  TypedBead,
  TypedBeadMat,
  TypedContent,
} from "./threads.perspective";
import {Thread} from "./thread";
import {TimeInterval} from "./timeInterval";
import {AppletId, WAL, weaveUrlFromWal} from "@lightningrodlabs/we-applet";
import {prettyTimestamp} from "@ddd-qc/files";
import {decode, encode} from "@msgpack/msgpack";
import {
  agent2eh, getEventType,
  getLinkType,
  getSettingType,
  intoAgentPubKey,
  isHashType,
  parseMentions,
  prettyState,
  weaveUrlToWal
} from "../utils";
import {SearchParameters} from "../search";
import {AuthorshipZvm} from "./authorship.zvm";


//generateSearchTest();


/**
 *
 */
export class ThreadsZvm extends ZomeViewModel {

  static readonly ZOME_PROXY = ThreadsProxy;
  get zomeProxy(): ThreadsProxy {return this._zomeProxy as ThreadsProxy;}

  readonly signalHandler?: AppSignalCb = this.handleSignal;

  /* */
  protected hasChanged(): boolean {
    if (!this._previousPerspective) {
      return true;
    }
    let hasChanged = true; // TODO
    return hasChanged;
  }


  /** Notify subscribers */
  /** TODO: structuredClone() fails because of Thread class. Refactor to a state object instead */
  protected notifySubscribers(): boolean {
    if (!this.hasChanged()) return false;
    //this._previousPerspective = structuredClone(this.perspective);
    this._previousPerspective = this.perspective;
    for (const [host, propName] of this._providedHosts) {
      (host as any)[propName] = this._previousPerspective;
    }
    this._dvmParent.zvmChanged(this);
    return true;
  }


  /** -- Perspective -- */

  /* */
  get perspective(): ThreadsPerspective {
    return {
      allSubjects: this._allSubjects,
      allSemanticTopics: this._allSemanticTopics,
      hiddens: this._hiddens,
      //allParticipationProtocols: this._allParticipationProtocols,
      threadsPerSubject: this._threadsPerSubject,
      threads: this._threads,
      beads: this._beads,

      dmAgents: this._dmAgents,
      decBeads: this._decBeads,

      appletSubjectTypes: this._appletSubjectTypes,
      subjectsPerType: this._subjectsPerType,
      emojiReactions:  this._emojiReactions,

      globalProbeLogTs: this._globalProbeLogTs,
      //newSubjects: this._newSubjects,
      //unreadSubjects: this._unreadSubjects,
      newThreads: this._newThreads,
      unreadThreads: this._unreadThreads,

      allAppletIds: this._allAppletIds,

      inbox: this._inbox,
      notifSettings: this._notifSettings,
      favorites: this._favorites,
    };
  }


  private _allAppletIds: string[] = [];
  /** ah -> Subject */
  private _allSubjects: Map<AnyLinkableHashB64, SubjectMat> = new Map();
  /** eh -> title */
  private _allSemanticTopics: Dictionary<string> = {};
  private _hiddens: Dictionary<boolean> = {}
  ///** ah -> ParticipationProtocol */
  //private _allParticipationProtocols: Dictionary<ParticipationProtocolMat> = {};
  /** ah -> (BeadInfo, Bead) */
  private _beads: Dictionary<[BeadInfo, TypedBeadMat]> = {};
  /** agentId -> ppAh */
  private _dmAgents: Dictionary<ActionHashB64> = {};
  /** encBeadAh -> [BeadInfo, TypedBead] */
  private _decBeads: Dictionary<[BeadInfo, TypedBaseBeadMat]> = {};

  /** lh -> ppAhs */
  private _threadsPerSubject: Dictionary<ActionHashB64[]> = {};
  /** Name -> ppAh */
  private _threadsByName: Dictionary<ActionHashB64> = {};
  /** ppAh -> Thread */
  private _threads: Map<ActionHashB64, Thread> = new Map();

  /**  -- Dna threads  -- */
  /** AppletId -> SubjectType PathEntryHash -> subjectType */
  private _appletSubjectTypes: Record<AppletId, Record<EntryHashB64, string>> = {}
  /** SubjectType PathEntryHash -> subjectHash[] */
  private _subjectsPerType: Dictionary<[DnaHashB64, AnyLinkableHashB64][]> = {}
  /** beadAh -> [agent, emoji] */
  private _emojiReactions: Dictionary<[AgentPubKeyB64, string][]> = {}

  /** New & Unreads */
  private _globalProbeLogTs?: Timestamp;
  /* ppAh -> subjectHash */
  private _newThreads: Record<ActionHashB64, AnyLinkableHashB64> = {};
  /* ppAh -> (subjectHash, newBeadAh[]) */
  private _unreadThreads: Dictionary<[AnyLinkableHashB64, ActionHashB64[]]> = {};

  /** Notification Inbox */
  /* linkAh -> (ppAh, Notif) */
  private _inbox: Dictionary<[ActionHashB64, ThreadsNotification]> = {};
  /* ppAh -> (agent -> value) */
  private _notifSettings: Record<ActionHashB64, Record<AgentPubKeyB64, NotifySetting>> = {};

  /** -- Favorites -- */
  private _favorites: ActionHashB64[] = [];


  /** -- Get: Return stored element(s) -- */

  getPpNotifSettings(ppAh: ActionHashB64): Record<AgentPubKeyB64, NotifySetting> | undefined {return this._notifSettings[ppAh]}

  getNotifSetting(ppAh: ActionHashB64, agent: AgentPubKeyB64): NotifySetting {
    const settings = this.getPpNotifSettings(ppAh);
    console.log("getNotifSetting()", settings);
    if (!settings) {
      /** Return default */
      return NotifySetting.MentionsOnly;
    }
    const maybeAgentSetting = settings[agent];
    if (!maybeAgentSetting) {
      /** Return default */
      return NotifySetting.MentionsOnly;
    }
    return maybeAgentSetting;
  }


  getSubject(subjectHash: AnyLinkableHashB64): SubjectMat | undefined {
    return this._allSubjects.get(subjectHash);
  }

  getSemanticTopic(eh: EntryHashB64): string | undefined {
    const maybeTopic = this._allSemanticTopics[eh];
    if (maybeTopic) {
      return maybeTopic[0];
    }
    return undefined;
  }

  getParticipationProtocol(ah: ActionHashB64): ParticipationProtocolMat | undefined {
    const thread = this._threads.get(ah);
    if (!thread) {
      return undefined;
    }
    return thread.pp;
  }


  getSubjectType(appletId: AppletId, pathHash: EntryHashB64): string | undefined {
    const typesForDna = this._appletSubjectTypes[appletId];
    if (!typesForDna) {
      return undefined;
    }
    return typesForDna[pathHash];
  }

  getSubjectTypes(h: EntryHashB64): Dictionary<string> | undefined {
    return this._appletSubjectTypes[h];
  }

  getSubjects(pathHash: EntryHashB64): [DnaHashB64, AnyLinkableHashB64][] | undefined {
    return this._subjectsPerType[pathHash];
  }

  getEmojiReactions(beadAh: ActionHashB64): [AgentPubKeyB64, string][] | undefined {
    return this._emojiReactions[beadAh];
  }

  getBeadInfo(beadAh: ActionHashB64): BeadInfo | undefined {
    const maybeBead = this._beads[beadAh];
    if (!maybeBead) {
      return undefined;
    }
    return maybeBead[0];
  }


  getBaseBeadInfo(beadAh: ActionHashB64): BeadInfo | undefined {
    const maybeBead = this._beads[beadAh];
    if (!maybeBead) {
      return undefined;
    }
    if (maybeBead[0].beadType != ThreadsEntryType.EncryptedBead) {
      return maybeBead[0];
    }
    const maybeDecBead = this._decBeads[beadAh];
    if (!maybeDecBead) {
      return undefined;
    }
    return maybeDecBead[0];
  }


  getBead(beadAh: ActionHashB64): TypedBeadMat | undefined {
    const maybeBead = this._beads[beadAh];
    if (!maybeBead) {
      return undefined;
    }
    return maybeBead[1];
  }


  getBaseBead(beadAh: ActionHashB64): TypedBaseBeadMat | undefined {
    const maybeBead = this._beads[beadAh];
    if (!maybeBead) {
      return undefined;
    }
    if (maybeBead[0].beadType != ThreadsEntryType.EncryptedBead) {
      return maybeBead[1] as TypedBaseBeadMat;
    }
    //console.log("getBaseBead()", beadAh);
    const maybeDecBead = this._decBeads[beadAh];
    if (!maybeDecBead) {
      return undefined;
    }
    return maybeDecBead[1];
  }


  /** */
  getMostRecentBeadsOnThread(ppAh: ActionHashB64): [BeadInfo, TypedBead][] {
    const thread = this._threads.get(ppAh);
    if (!thread) {
      return [];
    }
    const beadAhs = thread.getLast(10).map((bl) => bl.beadAh);
    let infos = [];
    for (const ah of beadAhs) {
      if (this._beads[ah]) {
        infos.push(this.getBaseBead(ah))
      }
    }
    //TODO: tuples.sort((a, b) => {return 1})
    return infos;
  }


  /** */
  getAllBeadsOnThread(ppAh: ActionHashB64): [ActionHashB64, BeadInfo, TypedBeadMat][] {
    const thread = this._threads.get(ppAh);
    if (!thread) {
      return [];
    }
    const beadAhs = thread.getAll().map((bl) => bl.beadAh);
    let infos = [];
    for (const ah of beadAhs) {
      if (this._beads[ah]) {
        infos.push([ah, this.getBaseBeadInfo(ah), this.getBaseBead(ah)]);
      }
    }
    //TODO: tuples.sort((a, b) => {return 1})
    return infos;
  }


  /** */
  hasReachedBeginning(ppAh: ActionHashB64): boolean {
    let thread = this._threads.get(ppAh);
    if (!thread) {
        return false;
    }
    return thread.hasSearchedOldestBead;
  }


  /** */
  getCommentThreadForSubject(subject: AnyLinkableHashB64): ActionHashB64 | null {
    const ppAhs = this._threadsPerSubject[subject];
    if (!ppAhs) {
      return null;
    }
    for (const ppAh of ppAhs) {
      const thread = this._threads.get(ppAh);
      if (thread && thread.pp.purpose == "comment") {
        return ppAh;
      }
    }
    return null;
  }


  /** */
  getAllNotificationsForPp(argPpAh: ActionHashB64): [ActionHashB64, ThreadsNotification][] {
    let result = [];
    for (const [linkAh, [ppAh, notif]] of Object.entries(this._inbox)) {
      if (argPpAh == ppAh) {
        result.push([linkAh, notif]);
      }
    }
    return result;
  }


  /** */
  getLatestThread(): [ActionHashB64, Thread] | undefined {
    let res = undefined;
    this._threads.forEach((thread, ah, _map) => {
      if (!res || thread.creationTime > res.creationTime) {
        res = [ah, thread];
      }
    });
    return res;
  }


  /** unreadSubjects: subject has at least one unread thread */
  getUnreadSubjects(): AnyLinkableHashB64[] {
    let unreadSubjects = Object.values(this._unreadThreads).map(([subjectHash, _beads]) => subjectHash);
    /** Dedup */
    return [...new Set(unreadSubjects)];
  }


  /** Returns SubjectHash -> OldestNewThreadTs, i.e. creationTime of Subject */
  getNewSubjects(): Dictionary<Timestamp> {
    /** newSubjects: Store subject's oldest 'new' thread time for each new thread */
    const oldestNewThreadBySubject: Dictionary<Timestamp> = {};
    for (const [ppAh, subjectHash] of Object.entries(this._newThreads)) {
      const thread = this._threads.get(ppAh);
      if (!thread) {
        console.error("Thread not found");
        continue;
      }
      if (!oldestNewThreadBySubject[subjectHash] || thread.creationTime < oldestNewThreadBySubject[subjectHash]) {
        oldestNewThreadBySubject[subjectHash] = thread.creationTime;
      }
    }
    //console.log("oldestThreadTimeBySubject", oldestThreadTimeBySubject);

    /* Figure out if subjects are new: no older "none-new" threads found for this subject */
    let newSubjects = {};
    for (const [subjectHash, oldestNewThreadTs] of Object.entries(oldestNewThreadBySubject)) {
      //const pairs = await this.zomeProxy.getPpsFromSubjectHash(decodeHashFromBase64(subjectHash));
      const pairs: [AnyLinkableHashB64, Timestamp][] = this._threadsPerSubject[subjectHash].map((ppAh) => {
        const thread = this._threads.get(ppAh);
        if (!thread) {
          console.error("Thread not found");
          return [ppAh, 0];
        }
        return [ppAh, thread.creationTime];
      })
      //newSubjects[subjectHash] = pairs.map(([ppAh, _ts]) => ppAh);
      newSubjects[subjectHash] = oldestNewThreadTs;
      for (const [_ppAh, ppCreationTime] of pairs) {
        if (ppCreationTime < oldestNewThreadTs) {
          delete newSubjects[subjectHash];
          break;
        }
      }
    }
    return newSubjects;
  }


  /** -- Search -- */


  // /** search Threads */
  // const matchingThreadPurposes = Object.entries(this._threads)
  //   .filter(([_ppAh, thread]) => thread.pp.purpose.toLowerCase().includes(searchLC))
  //   .map(([ppAh, thread]) => thread);



  // beadText(info: BeadInfo, typed: TypedBead): string {
  //   switch (info.beadType) {
  //     case ThreadsEntryType.TextBead: return (typed as TextBead).value; break;
  //     case ThreadsEntryType.EntryBead: return (typed as EntryBead); break;
  //     case ThreadsEntryType.AnyBead: return (typed as AnyBead).value; break;
  //   }
  //   throw Error("Unknown beadType", info.beadType);
  // }


  /** Return matching beadAhs */
  searchTextBeads(parameters: SearchParameters): [ActionHashB64, BeadInfo, string][] {
    console.log("searchTextBeads()", parameters);
    /** Must have at least one param */
    if (Object.keys(parameters).length == 1) {
      return [];
    }
    if (parameters.beforeTs && parameters.afterTs && parameters.afterTs < parameters.beforeTs) {
      throw new Error(`Invalid search parameters. Search time interval: [${parameters.afterTs}; ${parameters.beforeTs}]'.`);
    }

    /** Filter bead type */
    let matchingTextBeads: [ActionHashB64, BeadInfo, string][] = Object.entries(this._beads)
      .filter(([_beadAh, beadPair]) => beadPair[0].beadType == ThreadsEntryType.TextBead)
      .map(([beadAh, beadPair]) => [beadAh, beadPair[0], (beadPair[1] as TextBeadMat).value.toLowerCase()]);
    let decMatchingTextBeads: [ActionHashB64, BeadInfo, string][] = Object.entries(this._decBeads)
      .filter(([_beadAh, beadPair]) => beadPair[0].beadType == ThreadsEntryType.TextBead)
      .map(([beadAh, beadPair]) => [beadAh, beadPair[0], (beadPair[1] as TextBeadMat).value.toLowerCase()]);
    matchingTextBeads = matchingTextBeads.concat(decMatchingTextBeads);

    /** filter applet */
    if (parameters.appletByName) {
      // TODO
    }
    /** filter thread */
    if (parameters.threadByName) {
      /** Bail if thread does not exist */
      if (!this._threadsByName[parameters.threadByName]) {
        return [];
      }
      const ppAh = this._threadsByName[parameters.threadByName]
      matchingTextBeads = matchingTextBeads.filter(([_beadAh, beadInfo, _textLC]) => beadInfo.bead.ppAh == ppAh);
    }
    /** filter author */
    if (parameters.author) {
      matchingTextBeads = matchingTextBeads.filter(([_beadAh, beadInfo, _textLC]) => beadInfo.author == parameters.author) //
    }
    /** filter mention */
    if (parameters.mentionsAgentByName) {
      const mentionLC = `@${parameters.mentionsAgentByName}`.toLowerCase();
      matchingTextBeads = matchingTextBeads.filter(([_beadAh, _beadInfo, textLC]) => textLC.includes(mentionLC))
    }
    /** filter beforeTs */
    if (parameters.beforeTs) {
      matchingTextBeads = matchingTextBeads.filter(([_beadAh, beadInfo, _textLC]) => beadInfo.creationTime <= parameters.beforeTs);
    }
    /** filter afterTs */
    if (parameters.afterTs) {
      matchingTextBeads = matchingTextBeads.filter(([_beadAh, beadInfo, _textLC]) => beadInfo.creationTime >= parameters.afterTs);
    }
    /** Filter by keywords OR */
    if (parameters.keywords) {
        const keywordsLC = parameters.keywords.map((word) => word.toLowerCase());
        matchingTextBeads = matchingTextBeads.filter(([_beadAh, _beadPair, textLC]) => {
          for (const keywordLC of keywordsLC) {
            if (textLC.includes(keywordLC)) {
              //console.log("searchTextBeads() has", keywordLC, textLC);
              return true;
            }
          }
        })
    }
    /** DONE */
    console.log("searchTextBeads() result", /*matchingTextBeads.length,*/ matchingTextBeads);
    return matchingTextBeads;
  }


  /** TODO */
  async searchAndProbe(parameters: SearchParameters, limit: number): Promise<[ActionHashB64, BeadInfo, string][]> {
    console.log("searchAndProbe()", parameters);
    let result: [ActionHashB64, BeadInfo, string][] = [];

    /** Maybe initial search is enough */
    const initialResult = this.searchTextBeads(parameters);
    if (initialResult.length > limit) {
      return initialResult;
    }

    /** Full probe thread if possible */
    if (parameters.threadByName && this._threadsByName[parameters.threadByName]) {
      const ppAh = this._threadsByName[parameters.threadByName];
      await this.pullAllBeads(ppAh)
      result = this.searchTextBeads(parameters);
    } else {
      // TODO: progressive timeframe search
      /** Get beads on all threads within timeframe */
      for (const ppAh of this._threads.keys()) {
        await this.pullLatestBeads(ppAh, parameters.afterTs, parameters.beforeTs, limit);
      }
      result = this.searchTextBeads(parameters);
    }
    /** */
    return result;
  }


  /** -- Init -- */

  /** Query all entries from local source-chain */
  async initializePerspectiveOffline(): Promise<void> {
    //await delay(1000);
    console.log("threadsZvm.initializePerspectiveOffline() START");
    await this.zomeProxy.queryAll();
    // await this.querySemanticTopics();
    // await this.queryThreads();
    // await this.queryBeads();
    // await this.queryProbeLogs(true);
    console.log("threadsZvm.initializePerspectiveOffline() END");
    //this.notifySubscribers(); // check if this is useful
  }


  /** */
  async initializePerspectiveOnline(): Promise<void> {
    console.log("threadsZvm.initializePerspectiveOnline() START");
    await this.zomeProxy.probeAllHiddens();
    await this.zomeProxy.pullAllSemanticTopics();
    await this.pullAppletIds();
    await this.pullAllSubjects();
    await this.zomeProxy.probeDmThreads();
    console.log("threadsZvm.initializePerspectiveOnline() END");
  }


  /** */
  probeAllInner() {
    this.probeAllInnerAsync();
  }


  /** */
  async probeAllInnerAsync() {
    console.log("threadsZvm.probeAllInner()", this._allSubjects.size)
    await this.initializePerspectiveOnline();
    /** Grab all threads of other subjects to see if there are new ones */
    let probes = []
    for (const hash of this._allSubjects.keys()) {
      probes.push(this.pullSubjectThreads(hash));
    }
    await Promise.all(probes);

    /** Get last elements since last time (global probe log) */
    await this.probeAllLatest();
    await this.probeInbox();
    await this.pullFavorites();
  }


  /** */
  async probeInbox() {
    this._inbox = {};
    await this.zomeProxy.probeInbox();
  }


  /** -- Probe: Query the DHT, and store the results (async) -- */

  /** */
  async pullAppletIds(): Promise<string[]> {
    console.log("threadsZvm.probeAllAppletIds()")
    // const appletIds = await this.zomeProxy.getApplets();
    // this._allAppletIds = appletIds.map((eh) => encodeHashToBase64(eh));
    this._allAppletIds = await this.zomeProxy.pullApplets();
    console.log("threadsZvm.probeAllAppletIds() res", this._allAppletIds);
    this.notifySubscribers();
    return this._allAppletIds;
  }


  /** Get all Subjects from the RootAnchor */
  async pullAllSubjects(): Promise<Map<AnyLinkableHashB64, SubjectMat>> {
    const subjects = await this.zomeProxy.pullAllSubjects();
    for (const subject of subjects) {
      const subjectMat = materializeSubject(subject);
      this._allSubjects.set(subjectMat.hash, subjectMat);
    }
    console.log("threadsZvm.probeAllSubjects()", this._allSubjects.size);
    this.notifySubscribers();
    return this._allSubjects;
  }

  // TODO: probeDnaSubjects()
  // TODO: probeEntryTypeSubjects()


  /** Get all Threads for a subject */
  async pullSubjectThreads(subjectHash: AnyLinkableHashB64): Promise<Dictionary<[ParticipationProtocol, Timestamp, AgentPubKeyB64]>> {
    console.log("threadsZvm.pullSubjectThreads()", subjectHash);
    let res = {};
    const pps = await this.zomeProxy.probePpsFromSubjectHash(decodeHashFromBase64(subjectHash));
    for (const [pp_ah, _linkTs] of pps) {
      const ppAh = encodeHashToBase64(pp_ah);
      const [pp, ts, author] = await this.zomeProxy.fetchPp(pp_ah);
      //this.storeThread(ppAh, pp, ts, encodeHashToBase64(author), false, false);
      res[ppAh] = [pp, ts, encodeHashToBase64(author)];
    }
    return res;
  }


  /** Get all SubjectTypes for a AppletId */
  async pullAppletSubjectTypes(appletId: AppletId): Promise<Dictionary<string>> {
    //const appletHash = decodeHashFromBase64(appletId);
    let subjectTypesRaw = await this.zomeProxy.findSubjectTypesForApplet(appletId);
    let subjectTypes: Dictionary<string> = {}//subjectTypesRaw.map(([st, hash]) => [st, encodeHashToBase64(hash)]);
    console.log("pullAppletSubjectTypes()", subjectTypes);
    for (const [subjectType, pathHash] of subjectTypesRaw) {
      subjectTypes[encodeHashToBase64(pathHash)] = subjectType;
    }
    this._appletSubjectTypes[appletId] = subjectTypes;
    this.notifySubscribers();
    return subjectTypes;
  }


  /** Get all subjects from a subjectType path */
  async findSubjects(appletId: AppletId, typePathHash: EntryHashB64): Promise<[DnaHashB64, AnyLinkableHashB64][]> {
    if (!this._appletSubjectTypes[appletId] || !Object.keys(this._appletSubjectTypes[appletId]).includes(typePathHash)) {
      return Promise.reject("Unknown appletId or typePathHash");
    }
    const subjectType = this.getSubjectType(appletId, typePathHash);
    const subjects = await this.zomeProxy.findSubjectsByType({appletId, subjectType});
    const subjectB64s: [DnaHashB64, AnyLinkableHashB64][] = subjects.map(([dnaHash, subjectHash]) => [encodeHashToBase64(dnaHash), encodeHashToBase64(subjectHash)]);
    this._subjectsPerType[typePathHash] = subjectB64s;
    this.notifySubscribers();
    return subjectB64s;
  }


  /** */
  async probeAllLatest(): Promise<void> {
    const latest = await this.zomeProxy.probeAllLatest(this._globalProbeLogTs);
    await this.commitGlobalProbeLog(latest.searchedInterval.end);

    /* newThreads (filter out my threads) */
    const newThreads: Dictionary<AnyLinkableHashB64> = {};
    for (const [subject_hash, pp_ah] of latest.newThreadsBySubject) {
      const ppAh = encodeHashToBase64(pp_ah)
      //const _ppMat = await this.fetchPp(ppAh);
      let maybeThread = this._threads.get(ppAh);
      if (maybeThread.author != this.cell.agentPubKey) {
        newThreads[ppAh] = encodeHashToBase64(subject_hash);
      }
    }
    //console.log("probeAllLatest:     newThreads", newThreads);
    this._newThreads = newThreads;

    /* unreadThreads: Map new beads to their threads */
    let unreadThreads: Dictionary<[AnyLinkableHashB64, ActionHashB64[]]> = {};
    latest.newBeadsByThread.map(async ([pp_ah, bl]) => {
      const ppAh =  encodeHashToBase64(pp_ah);
      let maybeThread = this._threads.get(ppAh);
      if (!maybeThread) {
        ///* _ppMat = */ await this.fetchPp(ppAh);
        maybeThread = this._threads.get(ppAh);
        if (!maybeThread) {
          console.warn("Thread not found", ppAh);
          return;
        }
      }
      if (bl.creationTime <= maybeThread.latestProbeLogTime ||
          encodeHashToBase64(bl.author) == this.cell.agentPubKey) {
        return;
      }
      const subjectHash = maybeThread.pp.subject.hash
      if (!unreadThreads[ppAh]) {
        unreadThreads[ppAh] = [subjectHash, []];
      }
      unreadThreads[ppAh][1].push(encodeHashToBase64(bl.beadAh));
    });
    console.log("threadsZvm.probeAllLatest() unreadThreads done", JSON.stringify(unreadThreads));
    this._unreadThreads = unreadThreads;

    /** Done */
    this.notifySubscribers();
  }


  /**  */
  async pullNotifSettings(ppAh: ActionHashB64): Promise<[AgentPubKey, NotifySetting, ActionHash][]> {
    delete this._notifSettings[ppAh];
    const notifSettings = await this.zomeProxy.pullPpNotifySettings(decodeHashFromBase64(ppAh));
    //this.storeNotifSetting(ppAh, this.cell.agentPubKey, NotifySetting.MentionsOnly, true); // add default for self to prove that we did a probe
    // for (const [agent_key, setting, _link_ah] of notifSettings) {
    //   console.log("probeNotifSettings:", setting);
    //   let value = NotifySetting.MentionsOnly;
    //   if (NotifySetting.Never === setting) {
    //     value = NotifySetting.Never;
    //   }
    //   if (NotifySetting.AllMessages === setting) {
    //     value = NotifySetting.AllMessages;
    //   }
    //   this.storeNotifSetting(ppAh, encodeHashToBase64(agent_key), value, true);
    // }
    //this.notifySubscribers();
    return notifSettings;
  }


  /**  */
  async pullFavorites() {
    const favorites = await this.zomeProxy.probeMyFavorites();
    this._favorites = [];
    for (const fav_ah of favorites) {
      const beadAh = encodeHashToBase64(fav_ah);
      //this._favorites.push(beadAh);
      await this.fetchUnknownBead(beadAh);
    }
  }


  /** Probe all emojis on this bead */
  async pullEmojiReactions(beadAh: ActionHashB64) {
    //console.log("probeEmojiReactions()", beadAh);
    this._emojiReactions[beadAh] = [];
    await this.zomeProxy.pullReactions(decodeHashFromBase64(beadAh));
    // let prevReactions = this._emojiReactions[beadAh];
    // if (!prevReactions) prevReactions = [];
    // const reactions: [AgentPubKeyB64, string][] = (await this.zomeProxy.getReactions(decodeHashFromBase64(beadAh)))
    //   .map(([key, emoji]) => [encodeHashToBase64(key), emoji]);
    // const notEqual = JSON.stringify(prevReactions) !== JSON.stringify(reactions);
    // //console.log("probeEmojiReactions() count", reactions.length, notEqual);
    // if (notEqual) {
    //   this._emojiReactions[beadAh] = reactions;
    //   this.notifySubscribers();
    // }
  }


  /** Get all beads from a thread */
  async pullAllBeads(ppAh: ActionHashB64): Promise<BeadLink[]> {
    console.log("pullAllBeads()", ppAh)
    const thread = this._threads.get(ppAh);
    if (!thread) {
      console.warn("pullAllBeads() Failed. Unknown thread:", ppAh);
      return [];
    }
    /** Probe */
    const [interval, beadLinks] = await this.zomeProxy.findBeads(decodeHashFromBase64(ppAh));
    console.log("pullAllBeads()", TimeInterval.new(interval).toStringSec(), beadLinks)
    /** Fetch */
    await this.fetchBeads(ppAh, beadLinks, TimeInterval.new(interval));
    thread.setHasSearchedOldestBead();
    console.log("setSearchedOldestBead for", ppAh, thread.hasSearchedOldestBead);
    /** Done */
    return beadLinks;
  }


  /** Get all beads from "now" and back until `limit` is reached or `startTime` is reached */
  async pullLatestBeads(ppAh: ActionHashB64, begin_time?: Timestamp, end_time?: Timestamp, target_limit?: number): Promise<BeadLink[]> {
    console.log("pullLatestBeads()", ppAh);
    let thread = this._threads.get(ppAh);
    if (!thread) {
      // try {
      //   await this.fetchPp(ppAh);
      // } catch(e) {
        console.error("pullLatestBeads() Failed. ParticipationProtocol not found");
        return [];
      //}
      //thread = this._threads.get(ppAh);
    }
    /** Probe the latest beads */
    const [searchedInterval, beadLinks] = await this.zomeProxy.findLatestBeads({
      pp_ah: decodeHashFromBase64(ppAh), begin_time, end_time, target_limit
    });
    /** Cache them */
    await this.fetchBeads(ppAh, beadLinks, TimeInterval.new(searchedInterval));
    /** Check if beginning of time reached */
    console.log("pullLatestBeads() begin", searchedInterval.begin, thread.creationTime);
    if (searchedInterval.begin <= thread.creationTime) {
      thread.setHasSearchedOldestBead();
    }
    /** Done */
    return beadLinks;
  }


  /** Try to get older beads from the currently known oldest bead of a thread */
  async probePreviousBeads(ppAh: ActionHashB64, limit: number): Promise<BeadLink[]> {
    // if (this.reachedBeginning(ppAh)) {
    //   return [];
    // }
    const thread = this._threads.get(ppAh);
    console.log("probePreviousBeads", ppAh, thread);
    if (!thread) {
      return Promise.reject("No Thread data found for given ParticipationProtocol");
    }
    // const oldestTime = thread.beadLinksTree.begin.key;
    const oldestTime = thread.probedUnion? thread.probedUnion.begin : undefined;
    const endTime = oldestTime? oldestTime : Date.now() * 1000;
    return this.pullLatestBeads(ppAh, undefined, endTime, limit);
  }


  /** */
  async createNextBead(ppAh: ActionHashB64, prevBeadAh?: ActionHashB64): Promise<Bead> {
    console.log("createNextBead()", ppAh, prevBeadAh);
    /** Figure out last known bead for this thread */
    let thread = this._threads.get(ppAh);
    if (!thread) {
      // await this.fetchPp(ppAh);
      // thread = this._threads.get(ppAh);
      if (!thread) {
        return Promise.reject("Unknown thread: " + ppAh);
      }
    }
    if (!prevBeadAh) {
      const lastKnownBeadOnThread = thread.getLast(1);
      if (lastKnownBeadOnThread && lastKnownBeadOnThread.length > 0) {
        prevBeadAh = lastKnownBeadOnThread[0].beadAh;
      }
      if (!prevBeadAh) {
        prevBeadAh = ppAh;
      }
    }
    /** Make bead */
    const bead: Bead = {
      ppAh: decodeHashFromBase64(ppAh),
      prevBeadAh: decodeHashFromBase64(prevBeadAh),
    }
    //console.log("createNextBead() bead", prevKnownBeadAh? encodeHashToBase64(prevKnownBeadAh): undefined, ppAh);
    return bead;
  }


  /** -- Publish: Commit to source-chain (and possibly the DHT) and store it (async because the commit could fail) -- */

  /** */
  async publishTypedBead(type: BeadType, content: TypedContent | EncryptedBeadContent, ppAh: ActionHashB64, author?: AgentPubKeyB64, prevBead?: ActionHashB64) : Promise<[ActionHashB64, string, number, TypedBead]> {
    const creation_time = Date.now() * 1000;
    const nextBead = await this.createNextBead(ppAh, prevBead);
    const beadAuthor = author? author : this.cell.agentPubKey;
    const [ah, global_time_anchor, tm] = await this.publishTypedBeadAt(type, content, nextBead, creation_time, beadAuthor);
    return [ah, global_time_anchor, creation_time, tm];
  }


  /** */
  async publishTypedBeadAt(
    beadTypeEx: BeadType | "EntryBeadImport",
    content: TypedContent | EntryBeadMat | EncryptedBeadContent,
    nextBead: Bead,
    creationTime: Timestamp,
    author: AgentPubKeyB64)
    : Promise<[ActionHashB64, string, TypedBead]>
  {
    const ppAh = encodeHashToBase64(nextBead.ppAh);
    /** Commit Entry (& notify peers) */
    let typed: TypedBead;
    let global_time_anchor: string;
    let bucket_ts: Timestamp;
    let bead_ah: ActionHash;
    switch (beadTypeEx) {
      case ThreadsEntryType.TextBead:
        typed = {value: content as string, bead: nextBead} as TextBead;
        [bead_ah, global_time_anchor] = await this.zomeProxy.publishTextBeadAt({textBead: typed, creationTime});
        break;
      case ThreadsEntryType.EntryBead: {
        const input: AddEntryAsBeadInput = {
          eh: decodeHashFromBase64(content as EntryHashB64),
          bead: nextBead,
          zomeName: "zFiles", // FilesProxy.DEFAULT_ZOME_NAME,
          roleName: "rFiles", // FILES_CELL_NAME
          originalCreationTime: creationTime,
          originalAuthor: decodeHashFromBase64(author),
        };
        [bead_ah, typed, global_time_anchor, bucket_ts] = await this.zomeProxy.publishEntryAsBead(input);
      }
      break;
      case "EntryBeadImport":
        const entryBead: EntryBead = dematerializeEntryBead(content as EntryBeadMat);
        entryBead.bead = nextBead;
        beadTypeEx = ThreadsEntryType.EntryBead;
        [bead_ah, typed, global_time_anchor, bucket_ts] = await this.zomeProxy.publishEntryBead({entryBead, creationTime});
        break;
      case ThreadsEntryType.AnyBead:
        //const encHrl = encodeHrl(content as Hrl);
        const wurl = weaveUrlFromWal(content as WAL);
        const anyBead: AnyBead = {
          bead: nextBead,
          value: wurl,
          typeInfo: "wal",
        } as AnyBead;
        console.log("publishHrlBeadAt()", wurl, anyBead);
        [bead_ah, global_time_anchor, bucket_ts] = await this.zomeProxy.publishAnyBead({anyBead, creationTime});
        typed = anyBead;
        break;
      case ThreadsEntryType.EncryptedBead:
        const encContent = content as EncryptedBeadContent;
        beadTypeEx = ThreadsEntryType.EncryptedBead;
        typed = encContent.encBead;
        [bead_ah, global_time_anchor, bucket_ts] = await this.zomeProxy.publishEncBead({encBead: encContent.encBead, otherAgent: encContent.otherAgent, creationTime});
        break;
    }
    /** Insert in ThreadInfo */
    console.log("publishTypedBeadAt() added bead", encodeHashToBase64(bead_ah), creationTime);
    /** Done */
    return [encodeHashToBase64(bead_ah), global_time_anchor, typed];
  }


  /** */
  async publishNotifSetting(ppAh: ActionHashB64, setting: NotifySetting, agent?: AgentPubKeyB64) : Promise<void> {
    if (!ppAh) {
      return;
    }
    if (!agent) {
      agent = this.cell.agentPubKey;
    }
    const _maybe_link_ah = await this.zomeProxy.publishNotifySetting({
      pp_ah: decodeHashFromBase64(ppAh),
      setting,
      agent: decodeHashFromBase64(agent),
    } as SetNotifySettingInput);
  }


  /** */
  async editSemanticTopic(old_eh: EntryHashB64, title: string, preventStoring?: boolean) : Promise<EntryHashB64> {
    const eh = await this.zomeProxy.updateSemanticTopic({eh: decodeHashFromBase64(old_eh), topic: {title}});
    const ehB64 = encodeHashToBase64(eh);
    this.unstoreSemanticTopic(old_eh);
    if (!preventStoring) {
      this.storeSemanticTopic(ehB64, title);
    }
    console.log("editSemanticTopic()", title, ehB64);
    console.log("editSemanticTopic()", this._allSemanticTopics);
    /** Done */
    this.notifySubscribers();
    return ehB64;
  }


  /** */
  async publishSemanticTopic(title: string) : Promise<EntryHashB64> {
    const eh = await this.zomeProxy.publishSemanticTopic({title});
    return encodeHashToBase64(eh);
  }


  /** */
  async publishParticipationProtocol(pp: ParticipationProtocol): Promise<[Timestamp, ActionHashB64]> {
    const [pp_ah, ts] = await this.zomeProxy.publishParticipationProtocol(pp);
    return [ts, encodeHashToBase64(pp_ah)];
  }


    /** */
  async publishThreadFromSemanticTopic(appletId: AppletId, subjectHash: AnyLinkableHashB64, purpose: string): Promise<[number, ActionHashB64]> {
    console.log("publishThreadFromSemanticTopic()", appletId);
    const subject: Subject = {
      hash: decodeHashFromBase64(subjectHash),
      typeName: SEMANTIC_TOPIC_TYPE_NAME,
      appletId,
      dnaHash: decodeHashFromBase64(this.cell.dnaHash), // TODO: remove this useless field?
    };
    const semTopicTitle = this.perspective.allSemanticTopics[subjectHash];
    const pp: ParticipationProtocol = {
      purpose,
      rules: "N/A",
      subject,
      subject_name: `${semTopicTitle}`
    }
    const [pp_ah, ts] = await this.zomeProxy.publishParticipationProtocol(pp);
    /** */
    return [ts, encodeHashToBase64(pp_ah)];
  }



  /** -- Fetch: Grab an entry from the DHT and store it -- */

  /** */
  async fetchPp(ppAh: ActionHashB64): Promise<[ParticipationProtocolMat, Timestamp, AgentPubKeyB64]> {
    const maybeThread = this._threads.get(ppAh);
    console.log("ThreadsZvm.fetchPp()", ppAh, !!maybeThread);
    if (maybeThread) {
      return [maybeThread.pp, maybeThread.creationTime, maybeThread.author];
    }
    const [pp, ts, author] = await this.zomeProxy.fetchPp(decodeHashFromBase64(ppAh));
    if (pp === null) {
      Promise.reject("ParticipationProtocol not found at " + ppAh)
    }
    //await this.fetchThreadHideState(ppAh, pp, encodeHashToBase64(author));
    //return this.storeThread(ppAh, pp, ts, encodeHashToBase64(author), /*isHidden ,*/ false, preventNotify);
    return [materializeParticipationProtocol(pp), ts, encodeHashToBase64(author)];
  }


  // /** */
  // async fetchThreadHideState(ppAh: ActionHashB64, pp: ParticipationProtocol, author: AgentPubKeyB64): Promise<boolean> {
  //   let hash;
  //   if (pp.subject.typeName == DM_SUBJECT_TYPE_NAME) {
  //     const other = author == this.cell.agentPubKey? pp.subject.hash : decodeHashFromBase64(author);
  //     hash = encodeHashToBase64(agent2eh(other));
  //   } else {
  //     hash = ppAh;
  //   }
  //   const isHidden = await this.zomeProxy.findHideLink(decodeHashFromBase64(hash)) != null;
  //   //this.storeHidden(hash, isHidden, false);
  //   return isHidden;
  // }


  /** */
  async fetchUnknownBead(beadAh: ActionHashB64, /*canNotify: boolean, alternateCreationTime?: Timestamp*/): Promise<[TypedBead, BeadType, Timestamp, AgentPubKeyB64]> {
    console.log("fetchUnknownBead()", beadAh);
    if (this._beads[beadAh]) {
      const pair = this._beads[beadAh];
      return [dematerializeTypedBead(pair[1], pair[0].beadType), pair[0].beadType, pair[0].creationTime, pair[0].author];
    }
    let bead_ah = decodeHashFromBase64(beadAh);
    let creationTime: Timestamp;
    let author: AgentPubKey;
    let typed: TypedBead;
    let type: BeadType;

    const textTuple = await this.zomeProxy.fetchTextBeadOption(bead_ah);
    if (textTuple == null) {
      const entryTuple = await this.zomeProxy.fetchEntryBeadOption(bead_ah);
      if (entryTuple == null) {
        const anyTuple = await this.zomeProxy.fetchAnyBeadOption(bead_ah);
        if (anyTuple == null) {
          try {
            [creationTime, author, typed] = await this.zomeProxy.fetchEncBead(bead_ah);
            type = ThreadsEntryType.EncryptedBead;
          } catch (e) {
            //console.error(e);
            return Promise.reject(`Bead not found at hash ${beadAh} : ${e}`);
          }
        } else {
          type = ThreadsEntryType.AnyBead;
          [creationTime, author, typed] = anyTuple;
        }
      } else {
        type = ThreadsEntryType.EntryBead;
        [creationTime, author, typed] = entryTuple;
      }
    } else {
      type = ThreadsEntryType.TextBead;
      [creationTime, author, typed] = textTuple;
    }
    //const ts = alternateCreationTime? alternateCreationTime : creationTime;
    //await this.storeTypedBead(beadAh, materializeTypedBead(typed, type), type, ts, encodeHashToBase64(author), canNotify, false);
    return [typed, type, creationTime, encodeHashToBase64(author)];
  }


  /** */
  async fetchTypedBead(beadAh: ActionHash, beadType: BeadType/*, canNotify: boolean, alternateCreationTime?: Timestamp*/): Promise<void> {
    if (this._beads[encodeHashToBase64(beadAh)]) {
      return;
    }
    // let creationTime: Timestamp;
    // let author: AgentPubKey;
    // let typed: TypedBead;
    try {
      switch (beadType) {
        case ThreadsEntryType.TextBead: /*[creationTime, author, typed] =*/ await this.zomeProxy.fetchTextBead(beadAh); break;
        case ThreadsEntryType.EntryBead: /*[creationTime, author, typed] =*/ await this.zomeProxy.fetchEntryBead(beadAh); break;
        case ThreadsEntryType.AnyBead: /*[creationTime, author, typed] =*/ await this.zomeProxy.fetchAnyBead(beadAh); break;
        case ThreadsEntryType.EncryptedBead: /*[creationTime, author, typed] =*/ await this.zomeProxy.fetchEncBead(beadAh); break;
      }
      //const ts = alternateCreationTime? alternateCreationTime : creationTime;
      //await this.storeTypedBead(encodeHashToBase64(beadAh), materializeTypedBead(typed, beadType), beadType, ts, encodeHashToBase64(author), canNotify, false);
      //return typed;
    } catch(e) {
      console.error(e);
      Promise.reject("Bead not found at " + encodeHashToBase64(beadAh));
    }
  }


  /** */
  private async fetchBeads(ppAh: ActionHashB64, beadLinks: BeadLink[], probedInterval: TimeInterval): Promise<void> {
    //console.log("fetchBeads() len = ", beadLinks.length, searchedInterval);
    if (beadLinks.length == 0) {
      return;
    }
    let thread = this._threads.get(ppAh);
    if (!thread) {
      console.warn("Fetching beads for unknown thread", ppAh);
      return;
      //await this.fetchPp(ppAh, true);
      //thread = this._threads.get(ppAh);
    }
    /** fetch each Bead */
    for (const bl of beadLinks) {
      console.log("fetchBeads()", bl.beadType)
      await this.fetchTypedBead(bl.beadAh, bl.beadType as BeadType/*, false, bl.creationTime*/);
    }
    thread.addProbedInterval(probedInterval);
  }


  /** */
  async hideDmThread(agent: AgentPubKeyB64) {
    const agent_eh = agent2eh(decodeHashFromBase64(agent));
    await this.hideSubject(encodeHashToBase64(agent_eh));
  }


  /** */
  async unhideDmThread(agent: AgentPubKeyB64) {
    const agent_eh = agent2eh(decodeHashFromBase64(agent));
    await this.unhideSubject(encodeHashToBase64(agent_eh));
  }


  /** */
  async hideSubject(subjectHash: AnyLinkableHashB64) {
    await this.zomeProxy.hideSubject(decodeHashFromBase64(subjectHash));
  }


  /** */
  async unhideSubject(subjectHash: AnyLinkableHashB64) {
    await this.zomeProxy.unhideSubject(decodeHashFromBase64(subjectHash));
  }


  /** */
  async deleteNotification(linkAh: ActionHashB64): Promise<void> {
    await this.zomeProxy.unpublishNotification(decodeHashFromBase64(linkAh));
  }


  /** */
  async flushInbox(): Promise<void> {
    for (const linkAh of Object.keys(this._inbox)) {
      await this.deleteNotification(linkAh);
    }
  }


  /** */
  async addFavorite(beadAh: ActionHashB64): Promise<void> {
    await this.zomeProxy.publishFavorite(decodeHashFromBase64(beadAh));
  }


  /** */
  async removeFavorite(beadAh: ActionHashB64): Promise<void> {
    await this.zomeProxy.unpublishFavorite(decodeHashFromBase64(beadAh));
  }


  /** get ppAh of Notif */
  async getPpFromNotification(notif: ThreadsNotification): Promise<ActionHashB64> {
    console.log("getPpFromNotification()", notif.event);
    if (NotifiableEvent.Fork === notif.event || NotifiableEvent.NewDmThread === notif.event) {
      return notif.content;
    } else {
      const maybeBead = this._beads[notif.content];
      if (maybeBead) {
        return maybeBead[0].bead.ppAh;
      }
      const [typed, beadType, _ts, _author] = await this.fetchUnknownBead(notif.content);
      const [base, _baseType] = await this.getBaseTypedBead(typed, beadType, notif.author); // WARN: Assuming notif sender is also bead author
      return encodeHashToBase64(base.bead.ppAh);
    }
  }


  /** -- Store: Cache & index a materialized entry, and notify subscribers -- */

  /** */
  storeNotification(notif: ThreadsNotification, ppAh?: ActionHashB64) {
    /** make sure we have the content signaled in the notification */
    if (!ppAh) {
      this.getPpFromNotification(notif).then((ppAh) => this.fetchPp(ppAh));
    } else {
      /*await*/ this.fetchPp(ppAh);
    }
    /* */
    console.log("storeNotification()", notif.event, ppAh);
    this._inbox[notif.createLinkAh] = [ppAh, notif];
  }


  /** */
  unstoreNotification(linkAh: ActionHashB64) {
    delete this._inbox[linkAh]; // = undefined;
  }


  /** */
  storeHidden(hash: AnyLinkableHashB64, isHidden: boolean) {
    this._hiddens[hash] = isHidden;
  }


  /** */
  storeSemanticTopic(eh: EntryHashB64, title: string): void {
    this._allSemanticTopics[eh] = title;
  }

  /** */
  unstoreSemanticTopic(eh: EntryHashB64): void {
    delete this._allSemanticTopics[eh];
  }


  /** */
  storeNotifSetting(ppAh: ActionHashB64, agent: AgentPubKeyB64, setting: NotifySetting): void {
    if (!this._notifSettings[ppAh]) {
      this._notifSettings[ppAh] = {}
    }
    this._notifSettings[ppAh][agent] = setting;
  }


  /** */
  unstoreFavorite(beadAh: ActionHashB64): void {
    if (!this._favorites.includes(beadAh)) {
      return;
    }
    this._favorites = this._favorites.filter(item => item !== beadAh);
  }

  /** */
  storeFavorite(beadAh: ActionHashB64): void {
    if (this._favorites.includes(beadAh)) {
      return;
    }
    this._favorites.push(beadAh);
  }


  /** */
  storeThread(ppAh: ActionHashB64, pp: ParticipationProtocol, creationTime: Timestamp, author: AgentPubKeyB64, isNew: boolean): ParticipationProtocolMat {
    /** Return already stored PP */
    if (this._threads.has(ppAh)) {
      return this._threads.get(ppAh).pp;
    }
    let ppMat = materializeParticipationProtocol(pp);
    const thread = new Thread(ppMat, this.cell.dnaModifiers.origin_time, creationTime, author);
    console.log(`storeThread() thread "${ppAh}" for subject "${ppMat.subject.hash}"| creationTime: ${creationTime}"`);
    this._threads.set(ppAh, thread);
    /** Add already stored beads */
    for (const [beadAh, [info, typed]] of Object.entries(this._beads)) {
      if (info.bead.ppAh == ppAh) {
        this.storeBeadInThread(beadAh, ppAh, info.creationTime, false, info.beadType);
      }
    }
    if (pp.subject.typeName == DM_SUBJECT_TYPE_NAME) {
      /** DM thread */
      const agent_hash = encodeHashToBase64(intoAgentPubKey(decodeHashFromBase64(ppMat.subject.hash)));
      let otherAgent = author == this.cell.agentPubKey? agent_hash : author;
      console.log("storeThread() dmThread", otherAgent);
      this._dmAgents[otherAgent] = ppAh;
    } else {
      /** isNew */
      if (isNew) {
        this._newThreads[ppAh] = ppMat.subject.hash;
      }
      /** threadsPerSubject */
      if (!this._threadsPerSubject[ppMat.subject.hash]) {
        this._threadsPerSubject[ppMat.subject.hash] = [];
      }
      this._threadsPerSubject[ppMat.subject.hash].push(ppAh);

      /** All Subjects */
      if (!this._allSubjects.get(ppMat.subject.hash)) {
        this._allSubjects.set(ppMat.subject.hash, materializeSubject(pp.subject));
      }
    }
    //console.log("storePp()", ppMat.subjectHash, ppAh)
    /** Done */
    return ppMat;
  }


  /** */
  hasEmojiReaction(beadAh: ActionHashB64, agent: AgentPubKeyB64, emoji: string): boolean {
    if (!this._emojiReactions[beadAh]) {
      return false;
    }
    /** Look for pair */
    const maybeAlready = Object.values(this._emojiReactions[beadAh]).find(([a, e]) => (agent == a && e == emoji));
    return maybeAlready && maybeAlready.length > 0;
  }


  /** */
  storeEmojiReaction(beadAh: ActionHashB64, agent: AgentPubKeyB64, emoji: string) {
    if (this.hasEmojiReaction(beadAh, agent, emoji)) {
      return;
    }
    if (!this._emojiReactions[beadAh]) {
      this._emojiReactions[beadAh] = [];
    }
    this._emojiReactions[beadAh].push([agent, emoji]);
  }


  /** */
  unstoreEmojiReaction(beadAh: ActionHashB64, agent: AgentPubKeyB64, emoji: string) {
    if (!this._emojiReactions[beadAh]) {
      //this._emojiReactions[beadAh] = [];
      return;
    }
    const filtered = this._emojiReactions[beadAh].filter(([a, e]) => !(agent == a && e == emoji));
    if (filtered.length < this._emojiReactions[beadAh].length) {
      this._emojiReactions[beadAh] = filtered;
      if (this._emojiReactions[beadAh].length == 0) {
        delete this._emojiReactions[beadAh];
      }
    }
  }


  /** */
  storeGlobalLog(latestGlobalLogTime: Timestamp) {
    this._globalProbeLogTs = latestGlobalLogTime;
    this._unreadThreads = {};
    this._newThreads = {};
  }


  /** */
  storeThreadLog(log: ThreadLastProbeLog) {
    const ppAh = encodeHashToBase64(log.ppAh);
    const thread = this._threads.get(ppAh);
    if (!thread) {
      console.warn("Getting ThreadLastProbeLog for unknown thread", ppAh);
      return;
    }
    thread.setLatestProbeLogTime(log.ts);
    delete this._unreadThreads[ppAh];
  }


  /** */
  async storeTypedBead(beadAh: ActionHashB64, typedBead: TypedBeadMat, beadType: BeadType, creationTime: Timestamp, author: AgentPubKeyB64, isNew: boolean) {
    console.log("storeTypedBead()", beadAh);
    if (this._beads[beadAh]) {
      return;
    }
    if (!typedBead) {
      console.error("storeBead() Trying to store a null Bead");
      return;
    }
    if (beadType == ThreadsEntryType.EncryptedBead) {
      console.log("storeTypedBead() EncryptedBead", beadAh);
      /** Get inner */
      const [innerTyped, innerBeadType] = await this.getBaseTypedBead(dematerializeTypedBead(typedBead, beadType), beadType, author);
      /** Store inner Bead */
      const bead = innerTyped.bead;
      const innerBeadInfo = {creationTime, author, beadType: innerBeadType, bead: materializeBead(bead)} as BeadInfo;
      this._decBeads[beadAh] = [innerBeadInfo, materializeTypedBead(innerTyped, innerBeadType) as TypedBaseBeadMat];
      /** Store EncryptedBead */
      const beadInfo = {creationTime, author, beadType: ThreadsEntryType.EncryptedBead, bead: materializeBead(bead)} as BeadInfo;
      console.log("storeBead() encrypted", beadAh, typedBead, author);
      this._beads[beadAh] = [beadInfo, typedBead];
      this.storeBeadInThread(beadAh, encodeHashToBase64(bead.ppAh), creationTime, isNew, beadInfo.beadType);
    } else {
      /** Store normal base Bead */
      const bead = (typedBead as TypedBaseBeadMat).bead;
      const beadInfo = {creationTime, author, beadType, bead} as BeadInfo;
      console.log("storeBead()", beadAh, bead.ppAh, typedBead, author);
      this._beads[beadAh] = [beadInfo, typedBead];
      this.storeBeadInThread(beadAh, bead.ppAh, creationTime, isNew, beadInfo.beadType);
    }
  }


  /** -- -- */

  /** */
  async createDmThread(otherAgent: AgentPubKeyB64): Promise<ActionHashB64> {
    if (otherAgent == this.cell.agentPubKey) {
      return Promise.reject("Can't DM self");
    }
    /** Give current if already exists */
    const pair = this._dmAgents[otherAgent];
    if (pair) {
      await this.unhideDmThread(otherAgent);
      return pair[0];
    }
    /** Create new Thread */
    const pp_ah = await this.zomeProxy.publishDmThread(decodeHashFromBase64(otherAgent));
    const ppAh = encodeHashToBase64(pp_ah);
    //let ppMat = await this.fetchPp(ppAh); // trigger storage
    await this.publishNotifSetting(ppAh, NotifySetting.AllMessages);
    /* */
    return ppAh;
  }


  /** */
  isThreadDm(ppAh: ActionHashB64): AgentPubKeyB64 | null {
    const thread = this._threads.get(ppAh);
    if (!thread) {
      return null;
    }
    if (thread.pp.subject.typeName == DM_SUBJECT_TYPE_NAME) {
      let other = thread.author;
      if (other == this.cell.agentPubKey) {
        const agent_hash = intoAgentPubKey(decodeHashFromBase64(thread.pp.subject.hash));
        other = encodeHashToBase64(agent_hash);
      }
      return other;
    }
  }


  /* Store Bead in its Thread */
  private storeBeadInThread(beadAh: ActionHashB64, ppAh: ActionHashB64, creationTime: Timestamp, isNew: boolean, beadType: BeadType) {
    console.log("storeBeadInThread()", beadType, beadAh, creationTime);
    const thread = this._threads.get(ppAh);
    if (!thread) {
      // await this.fetchPp(ppAh);
      // if (!this._threads.has(ppAh)) {
      //   return Promise.reject("Unknown ppAh");
      // }
      return;
    }
    const blMat: BeadLinkMaterialized = {creationTime, beadAh, beadType};
    thread.addItem(blMat);
    if (isNew) {
      if (!this._unreadThreads[ppAh]) {
        this._unreadThreads[ppAh] = [thread.pp.subject.hash, []];
      }
      this._unreadThreads[ppAh][1].push(beadAh);
    }
  }


  /** */
  async getBaseTypedBead(typedBead: TypedBead, beadType: BeadType, author: AgentPubKeyB64): Promise<[TypedBaseBead, BaseBeadType]> {
    if (beadType == ThreadsEntryType.EncryptedBead) {
      let innerBead: BaseBeadKind;
      if (author == this.cell.agentPubKey) {
        innerBead = await this.zomeProxy.decryptMyBead(typedBead as EncryptedBead);
      } else {
        innerBead = await this.zomeProxy.decryptBead({
          encBead: typedBead as EncryptedBead,
          otherAgent: decodeHashFromBase64(author)
        });
      }
      return base2typed(innerBead);
    }
    return [typedBead as TypedBaseBead, beadType];
  }


  /** -- commit search logs -- */

  /** */
  async commitAllProbeLogs(): Promise<void> {
    console.log("commitAllProbeLogs() start");
    await this.commitGlobalProbeLog();
    /** Commit each Thread Log */
    for (const ppAh of this._threads.keys()) {
      await this.commitThreadProbeLog(ppAh);
    }
  }


  /** Commit Global Log */
  async commitGlobalProbeLog(maybe_ts?: Timestamp): Promise<void> {
    const maybeLatest = this.getLatestThread();
    console.log("commitGlobalProbeLog() maybeLatest", maybeLatest);
    const input: CommitGlobalLogInput = {
      maybe_ts,
      maybe_last_known_pp_ah: maybeLatest? decodeHashFromBase64(maybeLatest[0]) : undefined,
    }
    let latestGlobalLogTime = await this.zomeProxy.commitGlobalLog(input);
    console.log("commitGlobalProbeLog()", prettyTimestamp(latestGlobalLogTime));
  }


  /** */
  async commitThreadProbeLog(ppAh: ActionHashB64): Promise<void> {
    const thread = this._threads.get(ppAh);
    console.log(`commitThreadProbeLog() Thread "${thread.pp.purpose}":`, thread.probedUnion, thread.latestProbeLogTime, thread.beadLinksTree, thread.beadLinksTree.length);
    if (!thread || !thread.probedUnion || thread.probedUnion.end <= thread.latestProbeLogTime) {
      return;
    }
    const probeLog: ThreadLastProbeLog = {
      maybeLastKnownBeadAh: decodeHashFromBase64(thread.beadLinksTree.end.value.beadAh),
      ts: thread.beadLinksTree.end.key,
      ppAh: decodeHashFromBase64(ppAh),
    }
    console.log(`commitThreadProbeLog() ppAh:`,ppAh);
    const _ah = await this.zomeProxy.commitThreadLog(probeLog);
  }


  /** -- Signaling / Notifying -- */

  /** */
  async broadcastTip(tip: TipProtocol, agents?: Array<AgentPubKeyB64>): Promise<void> {
    agents = agents? agents : this._dvmParent.livePeers;
    /** Skip if no recipients or sending to self only */
    const filtered = agents.filter((key) => key != this.cell.agentPubKey);
    console.log(`ThreadsZvm.broadcastTip() Sending Tip "${tip.type}" to`, filtered, this.cell.agentPubKey, tip);
    //if (!agents || agents.length == 1 && agents[0] === this._cellProxy.cell.agentPubKey) {
    if (!filtered || filtered.length == 0) {
      console.log("ThreadsZvm.broadcastTip() aborted: No recipients")
      return;
    }
    /** Broadcast */
    const peers = agents.map((key) => decodeHashFromBase64(key));
    return this.zomeProxy.broadcastTip({tip, peers});
  }


  /** Return true if sent synchronously */
  async castNotificationTip(linkAh: ActionHashB64, agent: AgentPubKeyB64, notification: ThreadsNotification, extra: Uint8Array): Promise<boolean> {
    let pp_ah = decodeHashFromBase64(notification.content);
    if (NotifiableEvent.Mention === notification.event || NotifiableEvent.Reply === notification.event
      || NotifiableEvent.NewBead === notification.event) {
      const beadAh = notification.content;
      const beadInfo = this.getBeadInfo(beadAh);
      pp_ah = decodeHashFromBase64(beadInfo.bead.ppAh);
    }
    const notificationTip: ThreadsNotificationTip = {
      event: notification.event,
      author: decodeHashFromBase64(notification.author),
      timestamp: notification.timestamp,
      content: decodeHashFromBase64(notification.content),
      /** */
      link_ah: decodeHashFromBase64(linkAh),
      pp_ah,
      //data: Array.from(extra),
      data: extra,
    }
    console.log("castNotificationTip()", notificationTip, agent/*, notification.author*/);
    //try {
      await this.zomeProxy.castNotificationTip({peer: decodeHashFromBase64(agent), notificationTip});
    //   return true;
    // } catch (e) {
    //   /** Peer might not be online, use notificationZome instead */
    //   // FIXME
    // }
    return true;
  }


  /** -- Misc. -- */


  /** Dump perspective as JSON */
  exportPerspective(originalsZvm: AuthorshipZvm): string {
    const exPersp = intoExportable(this.perspective, originalsZvm);
    return JSON.stringify(exPersp, null, 2);
  }


  /** */
  async importPerspective(json: string, canPublish: boolean, authorshipZvm: AuthorshipZvm) {
    const external = JSON.parse(json) as ThreadsExportablePerspective;

    console.log("Importing perspective", external);

    if (canPublish) {
      await this.publishAllFromPerspective(external, authorshipZvm);
      return;
    }
    /** this._allAppletIds */
    for (const appletId of Object.values(external.allAppletIds)) {
      this._allAppletIds.push(appletId);
    }
    /** this._appletSubjectTypes */
    for (const [appletId, dict] of Object.entries(external.appletSubjectTypes)) {
      if (!this._appletSubjectTypes[appletId]) {
        this._appletSubjectTypes[appletId] = {};
      }
      for (const [pathHash, subjectType] of Object.entries(dict)) {
        this._appletSubjectTypes[appletId][pathHash] = subjectType
      }
    }
    /** this._allSemanticTopics */
    for (const [topicEh, title] of Object.entries(external.allSemanticTopics)) {
      this.storeSemanticTopic(topicEh, title);
    }
    /** this._allSubjects */
    for (const [subjectHash, subject] of Object.values(external.allSubjects)) {
      this._allSubjects.set(subjectHash, subject)
    }
    /** this._threads */
    for (const [ppAh, ppMat, creationTime, _maybeOtherAgent] of Object.values(external.pps)) {
      const authorshipLog: [Timestamp, AgentPubKeyB64 | null] = authorshipZvm.perspective.allLogs[ppAh] != undefined
        ? authorshipZvm.perspective.allLogs[ppAh]
        : [creationTime, this.cell.agentPubKey];
      this.storeThread(ppAh, dematerializeParticipationProtocol(ppMat), authorshipLog[0], authorshipLog[1], false);
    }
    /** this._beads */
    for (const [beadAh, [beadInfo, typedBead]] of Object.entries(external.beads)) {
      const authorshipLog: [Timestamp, AgentPubKeyB64 | null] = authorshipZvm.perspective.allLogs[beadAh] != undefined
        ? authorshipZvm.perspective.allLogs[beadAh]
        : [beadInfo.creationTime, beadInfo.author];
      /*await*/ this.storeTypedBead(beadAh, typedBead, beadInfo.beadType, authorshipLog[0], authorshipLog[1], true);
    }
    console.log("importPerspective() beads", this._beads);

    /** this._emojiReactions */
    for (const [beadAh, pairs] of Object.entries(external.emojiReactions)) {
      if (!this._emojiReactions[beadAh]) {
        this._emojiReactions[beadAh] = [];
      }
      this._emojiReactions[beadAh] = this._emojiReactions[beadAh].concat(pairs);
    }

    /** this._favorites */
    this._favorites = this._favorites.concat(external.favorites);


    /** Done */
    this.notifySubscribers();
  }


  /** */
  async publishAllFromPerspective(impPersp: ThreadsExportablePerspective, authorshipZvm: AuthorshipZvm) {
    /** this._allSemanticTopics */
    for (const [_topicEh, title] of Object.entries(impPersp.allSemanticTopics)) {
      /* const newTopicEh = */ await this.publishSemanticTopic(title);
    }
    /** this._allSubjects */
    const ppAhs = impPersp.pps.map((tuple) => tuple[0]);
    const entryAsSubjects: Dictionary<ThreadsEntryType> = {};
    for (const [subjectHash, _subject] of Object.values(impPersp.allSubjects)) {
      if (ppAhs.includes(subjectHash)) {
        entryAsSubjects[subjectHash] = ThreadsEntryType.ParticipationProtocol;
        continue;
      }
      const maybeBeadPair = impPersp.beads[subjectHash];
      if (maybeBeadPair) {
        entryAsSubjects[subjectHash] = maybeBeadPair[0].beadType as ThreadsEntryType;
        continue;
      }
      // FIXME: Figure out how to map ppAh used as subjectHash
      // Check if its an ActionHash?
      // or check on export if ppAh has "threads" link off of it and add that to the perspective?
    }

    /** -- Threads & Beads -- */
    const ppAhMapping: Record<ActionHashB64, ActionHashB64> = {}
    /* Sort by creation time */
    const sortedPps: [ActionHashB64, ParticipationProtocolMat, Timestamp, AgentPubKeyB64][] = Object.values(impPersp.pps).sort(
      ([_ppAhA, _ppMatA, creationTimeA], [_ppAhB, _ppMatB, creationTimeB]) => {
        return creationTimeA - creationTimeB
      })
    const beadAhMapping: Record<ActionHashB64, ActionHashB64> = {}
    /* Sort beads so they can get their prev bead equivalent ah */
    const sortedBeads: [string, [BeadInfo, TypedBeadMat]][] = Object.entries(impPersp.beads).sort(
      ([_beadAhA, [beadInfoA, _typedBeadA]], [_beadAhB, [beadInfoB, _typedBeadB]]) => {
        return beadInfoA.creationTime - beadInfoB.creationTime
      })

    /* loop until all beads & pps have been processed ; check if progress is made, otherwise abort */
    let loopCount = 0;
    while(Object.keys(ppAhMapping).length != sortedPps.length && Object.keys(beadAhMapping).length != sortedBeads.length ) {
      const totalStart = Object.keys(ppAhMapping).length + Object.keys(beadAhMapping).length;
      /* Threads */
      for (const [ppAh, ppMat, creationTime] of Object.values(sortedPps)) {
        if (ppAhMapping[ppAh]) {
          continue;
        }
        /* Grab subject mapping */
        const maybeEntrySubject = entryAsSubjects[ppMat.subject.hash];
        if (maybeEntrySubject) {
          if (maybeEntrySubject == ThreadsEntryType.ParticipationProtocol) {
            const newSubjectHash = ppAhMapping[ppMat.subject.hash];
            if (!newSubjectHash) {
              continue;
            }
            ppMat.subject.hash = newSubjectHash;
          } else {
            const newSubjectHash = beadAhMapping[ppMat.subject.hash];
            if (!newSubjectHash) {
              continue;
            }
            ppMat.subject.hash = newSubjectHash;
          }
        }
        /* publish pp */
        const pp = dematerializeParticipationProtocol(ppMat);
        const [pp_ah, _ts] = await this.zomeProxy.publishParticipationProtocol(pp);
        const newPpAh = encodeHashToBase64(pp_ah);
        ppAhMapping[ppAh] = newPpAh;
        const authorshipLog: [Timestamp, AgentPubKeyB64 | null] = authorshipZvm.perspective.allLogs[ppAh] != undefined
          ? authorshipZvm.perspective.allLogs[ppAh]
          : [creationTime, this.cell.agentPubKey];
        /* store pp */
        this.storeThread(newPpAh, pp, authorshipLog[0], authorshipLog[1], false);
        /** commit authorshipLog for new pp */
        if (authorshipZvm.perspective.allLogs[ppAh] != undefined) {
          await authorshipZvm.ascribeTarget(ThreadsEntryType.ParticipationProtocol, newPpAh, authorshipLog[0], authorshipLog[1]);
        }
      }
      // FIXME: use Promise.AllSettled();

      /* Beads */
      for (const [beadAh, [beadInfo, typedBead]] of Object.values(sortedBeads)) {
        if (beadAhMapping[beadAh]) {
          continue;
        }
        console.log("PubImp() Bead", prettyTimestamp(beadInfo.creationTime), beadAh);
        /* Grab pp mapping */
        if (!ppAhMapping[beadInfo.bead.ppAh]) {
          console.warn("PubImp() Pp not found in mapping", beadInfo.bead.ppAh);
          continue;
        }
        /* Grab prev bead mapping */
        let prevBeadAh = beadInfo.bead.ppAh;
        if (beadInfo.bead.prevBeadAh != beadInfo.bead.ppAh) {
          const prevKnownBeadAh = beadAhMapping[beadInfo.bead.prevBeadAh];
          if (!prevKnownBeadAh) {
            console.warn("PubImp() Missing prev Bead", beadInfo.bead.prevBeadAh);
            continue;
          }
        }
        /* Determine typed bead content */
        let content: TypedContent | EntryBeadMat | EncryptedBeadContent;
        switch(beadInfo.beadType) {
          case ThreadsEntryType.EncryptedBead: {
            const encBead = typedBead as EncryptedBead;
            const otherAgent = beadInfo.author != this.cell.agentPubKey? beadInfo.author : this._threads.get(beadInfo.bead.ppAh).pp.subject.hash;
            content = {encBead, otherAgent: decodeHashFromBase64(otherAgent)};
          } break;
          case ThreadsEntryType.TextBead: content = (typedBead as TextBeadMat).value; break;
          //case ThreadsEntryType.EntryBead: content = (typedBead as EntryBeadMat).sourceEh; break;
          case ThreadsEntryType.EntryBead: content = (typedBead as EntryBeadMat); break;
          case ThreadsEntryType.AnyBead:
            const typedAny = typedBead as AnyBeadMat;
            content = weaveUrlToWal(typedAny.value);
            break;
        }
        /* Publish */
        const newPpAh = decodeHashFromBase64(ppAhMapping[beadInfo.bead.ppAh]);
        console.log(`PubImp() Bead newPpAh: ${ppAhMapping[beadInfo.bead.ppAh]}`);
        const nextBead: Bead = {ppAh: newPpAh, prevBeadAh: decodeHashFromBase64(prevBeadAh)};
        const authorshipLog: [Timestamp, AgentPubKeyB64 | null] = authorshipZvm.perspective.allLogs[beadAh] != undefined
          ? authorshipZvm.perspective.allLogs[beadAh]
          : [beadInfo.creationTime, this.cell.agentPubKey];
        const beadType = beadInfo.beadType == ThreadsEntryType.EntryBead ? "EntryBeadImport" : beadInfo.beadType as BeadType; // copy entry bead verbatim
        const [newBeadAh, _global_time_anchor, _newTm] = await this.publishTypedBeadAt(beadType, content, nextBead, authorshipLog[0], authorshipLog[1]);
        beadAhMapping[beadAh] = newBeadAh;
        /** commit authorshipLog for new beads */
        if (authorshipZvm.perspective.allLogs[beadAh] != undefined) {
          await authorshipZvm.ascribeTarget(beadInfo.beadType, newBeadAh, beadInfo.creationTime, beadInfo.author);
        }
        console.log(`PubImp() Bead ${beadAh} -> ${newBeadAh}`, authorshipLog[0]);
      }
      /* Break loop if no progress made */
      const totalEnd = Object.keys(ppAhMapping).length + Object.keys(beadAhMapping).length;
      if (totalEnd == totalStart) {
        console.warn("PubImp() Publish loop ended because no progress made: " + totalEnd + " / " + sortedPps.length + sortedBeads.length);
        break;
      }
      loopCount += 1
    }
    console.log(`PubImp() looped ${loopCount} times. pps: ${Object.keys(ppAhMapping).length} ; beads: ${Object.keys(beadAhMapping).length}`);
    console.log("PubImp() beads", this.perspective.beads);

    /** this._emojiReactions */
    for (const [beadAh, pairs] of Object.entries(impPersp.emojiReactions)) {
      for (const [author, emoji] of pairs) {
        if (!beadAhMapping[beadAh]) {
          console.warn("PubImp() Bead not found in mapping", beadAh);
          continue;
        }
        const bead_ah = decodeHashFromBase64(beadAhMapping[beadAh]);
        await this.zomeProxy.publishReaction({bead_ah, from: decodeHashFromBase64(author), emoji});
        /*const succeeded =*/ await this.storeEmojiReaction(beadAh, author, emoji);
      }
    }

    /** favorites */
    for (const oldBeadAh of impPersp.favorites) {
      const newBeadAh = beadAhMapping[oldBeadAh];
      if (!newBeadAh) {
        console.log("Favorite bead not found:", oldBeadAh, beadAhMapping);
        continue;
      }
      await this.addFavorite(newBeadAh);
    }

    /** other */
    await this.pullAllSubjects();
  }



  /** */
  async content2Typed(bead: Bead, content: TypedContent, beadType: BaseBeadType): Promise<TypedBaseBead> {
    switch (beadType) {
      case ThreadsEntryType.TextBead:
        return {value: content as string, bead} as TextBead;
        break;
      case ThreadsEntryType.EntryBead:
        const entryInfo: AddEntryAsBeadInput = {
          eh: decodeHashFromBase64(content as EntryHashB64),
          bead,
          zomeName: "zFiles", // FilesProxy.DEFAULT_ZOME_NAME,
          roleName: "rFiles", // FILES_CELL_NAME
          // creationTime,
          // author,
        };
        const [entry_bead, _creation_ts] = await this.zomeProxy.createEntryBead(entryInfo);
        return entry_bead;
        break;
      case ThreadsEntryType.AnyBead:
        //const encHrl = encodeHrl(content as Hrl);
        const wurl = weaveUrlFromWal(content as WAL);
        return {
          bead,
          value: wurl,
          typeInfo: "wal",
        } as AnyBead;
        break;
      default:
        throw Error("Unknown beadType: " + beadType);
        break;
    }
  }


  /** */
  handleSignal(signal: AppSignal) {
    if (signal.zome_name !== ThreadsZvm.DEFAULT_ZOME_NAME) {
      return;
    }
    console.log("ThreadsZvm.handleSignal()", signal);
    const threadsSignal = signal.payload as ThreadsSignal;
    //console.log("THREADS received signal", threadsSignal);
    if (!("pulses" in threadsSignal)) {
      return;
    }
    /*await*/ this.handleThreadsSignal(threadsSignal);
  }


  /** */
  async handleThreadsSignal(signal: ThreadsSignal): Promise<void> {
    const from = encodeHashToBase64(signal.from);
    let all = [];
    for (let pulse of signal.pulses) {
      /** -- Handle Signal according to type -- */
      /** Change tip to Entry or Link signal */
      if (ThreadsSignalProtocolType.Tip in pulse) {
        pulse = this.handleTip(pulse.Tip as TipProtocol, from);
      }
      if (ThreadsSignalProtocolType.Entry in pulse) {
        all.push(this.handleEntrySignal(pulse.Entry as [EntryInfo, ThreadsEntry], from));
        continue;
      }
      if (ThreadsSignalProtocolType.Link in pulse) {
        all.push(this.handleLinkSignal(pulse.Link as [Link, StateChange], from));
        continue;
      }
    }
    await Promise.all(all);
    /** */
    this.notifySubscribers();
  }


  /** */
  private async handleLinkSignal([link, state]: [Link, StateChange], from: AgentPubKeyB64) {
    const author = encodeHashToBase64(link.author);
    const base = encodeHashToBase64((link as any).base);
    const target = encodeHashToBase64(link.target);
    const linkAh = encodeHashToBase64(link.create_link_hash);
    let tip: TipProtocol;
    switch(getLinkType(link.link_type)) {
      case ThreadsLinkType.Inbox:
        this.handleInboxLink(linkAh, link, state, from);
      break;
      case ThreadsLinkType.Hide:
        console.log("handleLinkSignal() hide", target);
        this.storeHidden(target, StateChangeType.Create in state);
      break;
      case ThreadsLinkType.Dm:
        await this.fetchPp(target);
        const isNew = (state as StateChangeVariantCreate).Create;
        /** Notify peer of DmThread */
        const peer = encodeHashToBase64(intoAgentPubKey(decodeHashFromBase64(base)));
        if (peer != this.cell.agentPubKey && isNew) {
          await this.zomeProxy.notifyPeer({ content: link.target, who: decodeHashFromBase64(peer), event: NotifiableEvent.NewDmThread });
        }
      break;
      case ThreadsLinkType.EmojiReaction: {
        if (StateChangeType.Create in state) {
          const isNew = state.Create;
          const decoder = new TextDecoder('utf-8');
          const emoji = decoder.decode(link.tag);
          //console.warn("EmojiReaction CreateLink:", link.tag, emoji);
          await this.storeEmojiReaction(base, author, emoji);
          if (isNew) {
            tip = {type: "Link", link, state: {Create: true}};
          }
        }
        if (StateChangeType.Delete in state) {
          const isNew = state.Delete;
          const decoder = new TextDecoder('utf-8');
          const emoji = decoder.decode(link.tag);
          //console.warn("EmojiReaction DeleteLink:", link.tag, emoji);
          await this.unstoreEmojiReaction(base, author, emoji);
          if (isNew) {
            tip = {type: "Link", link, state: {Delete: true}};
          }
        }
      }
      break;
      case ThreadsLinkType.NotifySetting: {
        if (StateChangeType.Create in state) {
          const index = link.tag[0];
          const setting = getSettingType(index);
          //console.warn("NotifySetting CreateLink:", link.tag, setting, index);
          const peer = encodeHashToBase64(intoAgentPubKey(decodeHashFromBase64(target)));
          this.storeNotifSetting(base, peer, setting as NotifySetting);
        }
        // if (StateChangeType.Delete in state) {
        //   this.unstoreNotifSetting(encodeHashToBase64(intoAgentPubKey(decodeHashFromBase64(target))));
        // }
      }
      break;
      case ThreadsLinkType.Favorite: {
        if (StateChangeType.Create in state) {
          this.storeFavorite(target);
        }
        if (StateChangeType.Delete in state) {
          this.unstoreFavorite(target);
        }
      }
      break;
    }
    /** */
    if (tip) {
      await this.broadcastTip(tip);
    }
  }


  /** */
  private async handleEntrySignal([entryInfo, kind]: [EntryInfo, ThreadsEntry], from: AgentPubKeyB64) {
    const entryType = Object.keys(kind)[0];
    const author = encodeHashToBase64(entryInfo.author);
    const hash = encodeHashToBase64(entryInfo.hash);
    let tip: TipProtocol;
    switch(entryType) {
      case "AnyBead":
        const anyBead = (kind as ThreadsEntryVariantAnyBead).AnyBead;
        if (StateChangeType.Create in entryInfo.state) {
          tip = await this.handleBeadEntry(entryInfo, anyBead, ThreadsEntryType.AnyBead, entryInfo.state.Create, from);
        }
        break;
      case "EntryBead":
        const entryBead = (kind as ThreadsEntryVariantEntryBead).EntryBead;
        if (StateChangeType.Create in entryInfo.state) {
          tip = await this.handleBeadEntry(entryInfo, entryBead, ThreadsEntryType.EntryBead, entryInfo.state.Create, from);
        }
        break;
      case "TextBead":
        const textBead = (kind as ThreadsEntryVariantTextBead).TextBead;
        if (StateChangeType.Create in entryInfo.state) {
          tip = await this.handleBeadEntry(entryInfo, textBead, ThreadsEntryType.TextBead, entryInfo.state.Create, from);
        }
        break;
      case "EncryptedBead":
        const encBead = (kind as ThreadsEntryVariantEncryptedBead).EncryptedBead;
        if (StateChangeType.Create in entryInfo.state) {
          tip = await this.handleBeadEntry(entryInfo, encBead, ThreadsEntryType.EncryptedBead, entryInfo.state.Create, from);
        }
        break;
      case "SemanticTopic":
        const semTopic = (kind as ThreadsEntryVariantSemanticTopic).SemanticTopic;
        if (StateChangeType.Create in entryInfo.state) {
          const isNew = entryInfo.state.Create;
          this.storeSemanticTopic(hash, semTopic.title);
          if (isNew) {
            tip = {type: "Entry", entry: {SemanticTopic: semTopic}, info: entryInfo};
          }
        }
        break;
      case "ParticipationProtocol":
        const pp= (kind as ThreadsEntryVariantParticipationProtocol).ParticipationProtocol;
        if (StateChangeType.Create in entryInfo.state) {
          const isNew = entryInfo.state.Create;
          this.storeThread(hash, pp, entryInfo.ts, author, isNew);
          if (isNew) {
            if (from == this.cell.agentPubKey) {
              /** Notify Subject author */
              if (encodeHashToBase64(pp.subject.dnaHash) == this.cell.dnaHash) {
                //if (subject_hash == AnyDhtHash::try_from(pp.subject.hash) {
                let author = await this.zomeProxy.getRecordAuthor(pp.subject.hash);
                await this.zomeProxy.notifyPeer({
                  content: decodeHashFromBase64(hash),
                  who: author,
                  event: NotifiableEvent.Fork
                });
                //}
              }
              /** Tip all about new Pp */
              tip = {type: "Entry", entry: {ParticipationProtocol: pp}, info: entryInfo};
            } else {
              if (sliceHashType(pp.subject.hash)[1] == HASH_TYPE_PREFIX["Agent"][1]) {
                /* Set NotifSetting for new DmThread */
                console.log("NewDmThread.publishNotifSetting() signal", hash);
                await this.publishNotifSetting(hash, NotifySetting.AllMessages);
              }
            }
          }
        }
        break;
      case "GlobalLastProbeLog": {
        const globalLog = (kind as ThreadsEntryVariantGlobalLastProbeLog).GlobalLastProbeLog;
        this.storeGlobalLog(globalLog.ts);
      }
        break;
      case "ThreadLastProbeLog": {
        const threadLog = (kind as ThreadsEntryVariantThreadLastProbeLog).ThreadLastProbeLog;
        this.storeThreadLog(threadLog);
      }
        break;
    }
    /** */
    if (tip) {
      await this.broadcastTip(tip);
    }
  }


  /** */
  private async handleInboxLink(linkAh: ActionHashB64, link: Link, state: StateChange, from: AgentPubKeyB64) {
    const base = encodeHashToBase64(intoAgentPubKey((link as any).base));
    const target = encodeHashToBase64(link.target);

    if (StateChangeType.Update in state) {
      console.error("Not possible to Update a link");
      return;
    }
    if (StateChangeType.Delete in state) {
      //const isNew = linkInfo.state.Delete;
      console.log("handleInboxSignal() Delete", base, this.cell.agentPubKey);
      if (base == this.cell.agentPubKey) {
        await this.unstoreNotification(linkAh);
      }
      return;
    }
    /** Create */
    const isNew = state.Create;
    const index = link.tag[0];
    const event = getEventType(index);
    console.log("handleInboxSignal() Create", isNew, event, link.tag);
    const notif: ThreadsNotification = {
      event,
      author: encodeHashToBase64(link.author),
      timestamp: link.timestamp,
      createLinkAh: linkAh,
      content: encodeHashToBase64(link.target),
    };
    /** I got notified by a peer */
    if (base == this.cell.agentPubKey) {
      /** Store Notification */
      this.storeNotification(notif);
      /** Publish a NotifySetting.AllMessages for this thread if non exists */
      if (NotifiableEvent.NewDmThread === event && isNew) {
        const ppAh = notif.content;
        console.log("NewDmThread in inbox:", ppAh);
        const notifSettings = this.getPpNotifSettings(ppAh);
        const notifSetting = notifSettings[this.cell.agentPubKey];
        if (!notifSetting) {
          await this.publishNotifSetting(ppAh, NotifySetting.AllMessages);
          console.log("NewDmThread.publishNotifSetting() inbox", ppAh);
        }
      }
    } else {
      if (!isNew) {
        return;
      }
      /** I notified a peer */
      /** Tip peer that we send them a notification */
      let extra: Uint8Array;
      if (NotifiableEvent.NewDmThread === event || NotifiableEvent.Fork === event) {
        console.log("Signaling new PP notification to peer", base, target);
        const ppAh = encodeHashToBase64(link.target);
        const thread = this._threads.get(ppAh);
        const ppData: NotificationTipPpData = {pp: dematerializeParticipationProtocol(thread.pp), creationTime: thread.creationTime};
        extra = encode(ppData);
      } else {
        /** NewBead, Mention, Reply */
        console.log("Signaling new Bead notification to peer", base, target);
        const beadAh = encodeHashToBase64(link.target);
        const beadPair = this.perspective.beads[beadAh];
        const beadData: NotificationTipBeadData = {typed: beadPair[1], beadType: beadPair[0].beadType, creationTime: beadPair[0].creationTime};
        extra = encode(beadData);
      }
      await this.castNotificationTip(linkAh, base, notif, extra);
    }
  }


  /** */
  private async notifyPeers(ppAh: ActionHashB64, content: AnyLinkableHash, notifs: NotifyPeerInput[]) {
    console.log("notifyPeers()", ppAh, notifs);
    /** Get latest notif settings */
    let settings = await this.pullNotifSettings(ppAh);
    /** Get alls & nevers */
    let nevers = [];
    let alls = [];
    for (const [agent, setting, _ah] of settings) {
      const peer = encodeHashToBase64(agent);
      switch (setting) {
        case NotifySetting.Never: nevers.push(peer); break;
        case NotifySetting.AllMessages: alls.push(peer); break;
        default: break;
      }
    }
    /** Keep only notifiable peers */
    const notifieds = [];
    const notifies = notifs
      .filter((notif) => !nevers.includes(encodeHashToBase64(notif.who)))
      .map((notif) => {
        notifieds.push(encodeHashToBase64(notif.who));
        return this.zomeProxy.notifyPeer(notif);
      });
    /** notify peers with AllMessage notifSetting */
    for (const peer of alls) {
      if (notifieds.includes(peer)) {
        continue;
      }
      const newNotif = {
        content,
        who: decodeHashFromBase64(peer),
        event: NotifiableEvent.NewBead,
      }
      notifies.push(this.zomeProxy.notifyPeer(newNotif));
    }
    /** */
    await Promise.all(notifies);
  }


  /** */
  private async handleBeadEntry(entryInfo: EntryInfo, typed: TypedBead, beadType: BeadType, isNew: boolean, from: AgentPubKeyB64): Promise<TipProtocol> {
    console.log("handleBeadEntry()", beadType, encodeHashToBase64(entryInfo.hash));
    if (!isHashType(entryInfo.author, 'Agent') || !isHashType(entryInfo.hash, 'Action')) {
      console.error("Bad hash typed in EntryInfo", entryInfo);
      return;
    }
    /** Store Bead */
    const author = encodeHashToBase64(entryInfo.author);
    const beadAh = encodeHashToBase64(entryInfo.hash);
    const typedMat = materializeTypedBead(typed, beadType);
    await this.storeTypedBead(beadAh, typedMat, beadType, entryInfo.ts, author, isNew);
    /** Notify / Tip if new bead from this agent */
    let tip: TipProtocol;
    let notifs: NotifyPeerInput[] = [];
    if (isNew && from == this.cell.agentPubKey) {
      /** Get base info */
      let ppAh: ActionHashB64;
      let prevBeadAh: ActionHashB64;
      if (beadType == ThreadsEntryType.EncryptedBead) {
        console.log("handleBeadEntry() EncryptedBead", beadAh);
        const decBeadPair = this._decBeads[beadAh];
        ppAh = decBeadPair[0].bead.ppAh;
        prevBeadAh = decBeadPair[0].bead.prevBeadAh;
      } else {
        const baseBead = typedMat as unknown as TypedBaseBeadMat;
        ppAh = baseBead.bead.ppAh;
        prevBeadAh = baseBead.bead.prevBeadAh;
        /* Notify Mentions */
        if (beadType == ThreadsEntryType.TextBead) {
          const textBead = typed as TextBead;
          const mentionees = parseMentions(textBead.value, (this._dvmParent as any).profilesZvm);
          for (const mentionee of mentionees) {
            notifs.push({
              content: decodeHashFromBase64(beadAh),
              who: decodeHashFromBase64(mentionee),
              event: NotifiableEvent.Mention
            });
          }
        }
      }
      /** Notify Reply */
      /** Notify reply if prevBead in Bead is different from last known bead for pp and not in a DM thread */
      if (prevBeadAh != ppAh) { // Thread's first bead has ppAh == prevBeadAh
        const isDmThread = this.isThreadDm(ppAh);
        const lastKnownBead = this._threads.get(ppAh).getLast(2); // new bead is already stored in thread, get the one before that
        const hasJumpedBead = lastKnownBead.length > 1 && lastKnownBead[0].beadAh != prevBeadAh;
        //console.log("handleBeadEntry() hasJumpedBead", hasJumpedBead, isDmThread, lastKnownBead, prevBeadAh);
        if (hasJumpedBead && !isDmThread) {
          let reply_author = await this.zomeProxy.getRecordAuthor(decodeHashFromBase64(prevBeadAh));
          notifs.push({content: decodeHashFromBase64(beadAh), who: reply_author, event: NotifiableEvent.Reply});
        }
      }
      await this.notifyPeers(ppAh, decodeHashFromBase64(beadAh), notifs);
      /** Form "Entry" Tip to broadcast */
      let bead: ThreadsEntry;
      switch (beadType) {
        case ThreadsEntryType.EncryptedBead: bead = {EncryptedBead: typed as EncryptedBead}; break;
        case ThreadsEntryType.AnyBead: bead = {AnyBead: typed as AnyBead}; break;
        case ThreadsEntryType.TextBead: bead = {TextBead: typed as TextBead}; break;
        case ThreadsEntryType.EntryBead: bead = {EntryBead: typed as EntryBead}; break;
      }
      tip = {type: "Entry", entry: bead, info: entryInfo};
    }
    /** */
    return tip;
  }


  /** */
  private handleTip(tip: TipProtocol, from: AgentPubKeyB64): ThreadsSignalProtocol {
    console.log("handleTip()", tip.type, tip);
    /* Send pong response */
    if (tip.type != "Pong") {
      console.log("PONGING ", from)
      const pong: TipProtocol = {type: "Pong"};
      /*await*/ this.broadcastTip(pong, [from])
    }
    /* Handle signal */
    switch (tip.type) {
      case "Ping":
      case "Pong":
        break;
      case "Notification": return this.handleNotificationTip(tip.value, from); break;
      case "Entry": return {Entry: [tip.info, tip.entry]};break;
      case "Link": return {Link: [tip.link, tip.state]}; break;
    }
  }


  /** */
  private handleNotificationTip(notifTip: ThreadsNotificationTip, from: AgentPubKeyB64): ThreadsSignalProtocol | undefined {
    let ppAh: ActionHashB64;
    let signal: ThreadsSignalProtocol;
    /** Store received Entry */
    if (NotifiableEvent.Mention == notifTip.event || NotifiableEvent.Reply == notifTip.event || NotifiableEvent.NewBead == notifTip.event) {
      const {typed, beadType, creationTime} = decode(notifTip.data) as NotificationTipBeadData;
      const beadAh = encodeHashToBase64(notifTip.content);
      ppAh = encodeHashToBase64(notifTip.pp_ah);
      console.log(`Received NotificationSignal of type ${JSON.stringify(notifTip.event)}:`, beadAh, typed);
      const info: EntryInfo = {
        hash: notifTip.content,
        ts: creationTime,
        author: decodeHashFromBase64(from),
        state: {Create: true},
      };
      let bead: ThreadsEntry;
      switch (beadType) {
        case ThreadsEntryType.EncryptedBead: bead = {EncryptedBead: typed as EncryptedBead}; break;
        case ThreadsEntryType.AnyBead: bead = {AnyBead: dematerializeAnyBead(typed as AnyBeadMat)}; break;
        case ThreadsEntryType.TextBead: bead = {TextBead: dematerializeTextBead(typed as TextBeadMat)}; break;
        case ThreadsEntryType.EntryBead: bead = {EntryBead: dematerializeEntryBead(typed as EntryBeadMat)}; break;
      }
      signal = {Entry: [info, bead]};
      ///*await*/ this.storeTypedBead(beadAh, typed, beadType, creationTime, encodeHashToBase64(notifTip.author), true);
    }
    if (NotifiableEvent.NewDmThread == notifTip.event || NotifiableEvent.Fork === notifTip.event) {
      const {pp, creationTime} = decode(notifTip.data) as NotificationTipPpData;
      const info: EntryInfo = {
        hash: notifTip.content,
        ts: creationTime,
        author: decodeHashFromBase64(from),
        state: {Create: true},
      };
      signal = {Entry: [info, {ParticipationProtocol: pp}]};
    }

    /* Brutal way to make sure we have the content signaled in the notification */
    //await this.probeAllLatest();
    /** */
    const notif: ThreadsNotification = {
      event: notifTip.event,
      author: encodeHashToBase64(notifTip.author),
      timestamp: notifTip.timestamp,
      content: encodeHashToBase64(notifTip.content),
      createLinkAh: encodeHashToBase64(notifTip.link_ah),
    }
    /** */
    this.storeNotification(notif, ppAh);
    return signal;
  }


  /** */
  dumpSignalLogs(signalLogs: SignalLog[]) {
    console.warn(`App signals from zome "${this.zomeName}"`);
    let appSignals: any[] = [];
    signalLogs
      .filter((log) => log.type == SignalType.LitHapp)
      .map((log) => {
        const signal = log.payload as LitHappSignal;
        const pulses = signal.pulses as ThreadsSignalProtocol[];
        const timestamp = prettyDate(new Date(log.ts));
        const from = encodeHashToBase64(signal.from) == this.cell.agentPubKey? "self" : encodeHashToBase64(signal.from);
        for (const pulse of pulses) {
          if (ThreadsSignalProtocolType.Tip in pulse) {
            const tip: TipProtocol  = pulse.Tip;
            appSignals.push({timestamp, from, type: ThreadsSignalProtocolType.Tip, subType: tip.type, payload: tip});
          }
          if (ThreadsSignalProtocolType.Entry in pulse) {
            const [entryInfo, threadsEntry] = pulse.Entry;
            const entryType = Object.keys(threadsEntry)[0];
            appSignals.push({timestamp, from, type: ThreadsSignalProtocolType.Entry, subType: entryType, state: prettyState(entryInfo.state), payload: threadsEntry, hash: encodeHashToBase64(entryInfo.hash)});
          }
          if (ThreadsSignalProtocolType.Link in pulse) {
            const [link, state] = pulse.Link;
            const hash = `${encodeHashToBase64((link as any).base)} -> ${encodeHashToBase64(link.target)}`;
            appSignals.push({timestamp, from, type: ThreadsSignalProtocolType.Link, subType: getLinkType(link.link_type), state: prettyState(state), payload: link.tag, hash});
          }
        }
      });
    console.table(appSignals);
  }

}
