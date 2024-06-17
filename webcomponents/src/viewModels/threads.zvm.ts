import {
  ActionHash,
  ActionHashB64,
  AgentPubKey,
  AgentPubKeyB64, AppSignal, AppSignalCb,
  decodeHashFromBase64,
  DnaHashB64,
  encodeHashToBase64,
  EntryHashB64, Link,
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
  NotifySetting,
  ParticipationProtocol,
  SEMANTIC_TOPIC_TYPE_NAME,
  SetNotifySettingInput,
  StateChange,
  StateChangeType,
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
  ThreadsNotification,
  ThreadsSignal,
  ThreadsSignalProtocol,
  ThreadsSignalProtocolType,
  TipProtocol, TipProtocolVariantEmojiReactionChange,
  TipProtocolVariantNewBead,
  TipProtocolVariantNewPp,
  TipProtocolVariantNewSemanticTopic,
  TipProtocolVariantUpdateSemanticTopic,
  WeaveNotification,
} from "../bindings/threads.types";
import {ThreadsProxy} from "../bindings/threads.proxy";
import {delay, Dictionary, LitHappSignal, prettyDate, SignalLog, SignalType, ZomeViewModel} from "@ddd-qc/lit-happ";
import {
  AnyBeadMat,
  AnyLinkableHashB64,
  base2typed,
  BaseBeadType,
  BeadInfo,
  BeadLinkMaterialized,
  BeadType,
  dematerializeEntryBead,
  dematerializeParticipationProtocol,
  dematerializeTypedBead,
  EncryptedBeadContent,
  EntryBeadMat, intoExportable,
  materializeBead,
  materializeParticipationProtocol,
  materializeSubject,
  materializeTypedBead,
  ParticipationProtocolMat,
  SubjectMat,
  TextBeadMat,
  ThreadsExportablePerspective,
  ThreadsPerspective, ThreadsPerspectiveCore,
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
import {agent2eh, eh2agent, getLinkType, isHashType, prettyState, weaveUrlToWal} from "../utils";
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
  /** FIXME: structuredClone() fails because of Thread class. Refactor to a state object instead */
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
  private _inbox: Dictionary<[ActionHashB64, WeaveNotification]> = {};
  /* ppAh -> (agent -> value) */
  private _notifSettings: Record<ActionHashB64, Record<AgentPubKeyB64, NotifySetting>> = {};

  /** -- Favorites -- */
  private _favorites: ActionHashB64[] = [];


  /** -- Get: Return stored element(s) -- */

  getPpNotifSettings(ppAh: ActionHashB64): Record<AgentPubKeyB64, NotifySetting> | undefined {return this._notifSettings[ppAh]}

  getNotifSetting(ppAh: ActionHashB64, agent: AgentPubKeyB64): NotifySetting {
    const settings = this.getPpNotifSettings(ppAh);
    if (!settings) {
      /** Return default */
      return NotifySetting.MentionsOnly;
    }
    const maybeAgentSetting = settings[agent];
    if (!maybeAgentSetting) {
      // Return default
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
    //FIXME tuples.sort((a, b) => {return 1})
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
    //FIXME tuples.sort((a, b) => {return 1})
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
  getAllNotificationsForPp(argPpAh: ActionHashB64): [ActionHashB64, WeaveNotification][] {
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
    console.log("probeEmojiReactions()", beadAh);
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
  async publishTypedBead(type: BeadType, content: TypedContent | EncryptedBeadContent, ppAh: ActionHashB64, author?: AgentPubKeyB64, ments?: AgentPubKeyB64[], prevBead?: ActionHashB64) : Promise<[ActionHashB64, string, number, TypedBead]> {
    const creation_time = Date.now() * 1000;
    const nextBead = await this.createNextBead(ppAh, prevBead);
    const beadAuthor = author? author : this.cell.agentPubKey;
    const [ah, global_time_anchor, tm] = await this.publishTypedBeadAt(type, content, nextBead, creation_time, beadAuthor, ments);
    return [ah, global_time_anchor, creation_time, tm];
  }


  /** */
  async publishTypedBeadAt(
    beadTypeEx: BeadType | "EntryBeadImport",
    content: TypedContent | EntryBeadMat | EncryptedBeadContent,
    nextBead: Bead,
    creationTime: Timestamp,
    author: AgentPubKeyB64,
    ments?: AgentPubKeyB64[])
    : Promise<[ActionHashB64, string, TypedBead]>
  {
    const ppAh = encodeHashToBase64(nextBead.ppAh);
    /** Notify reply is prevBead in Bead is different from last known bead for pp and not in a DM thread */
    const prevBeadAh = encodeHashToBase64(nextBead.prevBeadAh);
    let canNotifyReply = false;
    if (prevBeadAh != ppAh) { // Thread's first bead has ppAh == prevBeadAh
      const prevBeadTuple = await this.fetchUnknownBead(prevBeadAh);
      const lastKnownBead = this._threads.get(ppAh).getLast(1);
      const isDmThread = this.isThreadDm(ppAh);
      console.log("publishTypedBeadAt()", isDmThread);
      const hasJumpedBead = lastKnownBead.length > 0 && lastKnownBead[0].beadAh != prevBeadAh && !isDmThread;
      const canNotifyPrevOwner = this.getNotifSetting(ppAh, prevBeadTuple[3]) != NotifySetting.Never;
      canNotifyReply = hasJumpedBead && canNotifyPrevOwner;
    }
    /** Commit Entry (& notify peers) */
    let typed: TypedBead;
    let global_time_anchor: string;
    let bucket_ts: Timestamp;
    let bead_ah: ActionHash;
    switch (beadTypeEx) {
      case ThreadsEntryType.TextBead:
        /** Keep only notifiable mentionees */
        const mentionees = ments
          ? ments
            .filter((m) => this.getNotifSetting(ppAh, m) != NotifySetting.Never)
            .map((m) => decodeHashFromBase64(m))
          : [];
        typed = {value: content as string, bead: nextBead} as TextBead;
        [bead_ah, global_time_anchor] = await this.zomeProxy.publishTextBeadAtAndNotify({textBead: typed, creationTime, mentionees, canNotifyReply});
        break;
      case ThreadsEntryType.EntryBead:
        const entryInfo = {
          eh: decodeHashFromBase64(content as EntryHashB64),
          bead: nextBead,
          zomeName: "zFiles", // FilesProxy.DEFAULT_ZOME_NAME,
          roleName: "rFiles", // FILES_CELL_NAME
          creationTime,
          author,
          canNotifyReply,
        };
        [bead_ah, typed, global_time_anchor, bucket_ts] = await this.zomeProxy.publishEntryAsBead(entryInfo);
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
        [bead_ah, global_time_anchor, bucket_ts] = await this.zomeProxy.publishAnyBead({anyBead, creationTime, canNotifyReply});
        typed = anyBead;
        break;
      case ThreadsEntryType.EncryptedBead:
        const encContent = content as EncryptedBeadContent;
        beadTypeEx = ThreadsEntryType.EncryptedBead;
        typed = encContent.encBead;
        [bead_ah, global_time_anchor, bucket_ts] = await this.zomeProxy.publishEncBead({encBead: encContent.encBead, otherAgent: encContent.otherAgent, creationTime, canNotifyReply});
        break;
      default: throw Error("Unknown beadType: " + beadTypeEx);
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
      dnaHash: decodeHashFromBase64(this.cell.dnaHash), // FIXME: remove this useless field?
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
    /** fetch each TextBead */
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
  async getPpFromNotification(notif: WeaveNotification): Promise<ActionHashB64> {
    console.log("getPpFromNotification()", notif.event);
    if (NotifiableEvent.Fork === notif.event || NotifiableEvent.NewDmThread === notif.event) {
      return encodeHashToBase64(notif.content);
    } else {
      const maybeBead = this._beads[encodeHashToBase64(notif.content)];
      if (maybeBead) {
        return maybeBead[0].bead.ppAh;
      }
      const [typed, beadType, _ts, _author] = await this.fetchUnknownBead(encodeHashToBase64(notif.content));
      const [base, _baseType] = await this.getBaseTypedBead(typed, beadType, encodeHashToBase64(notif.author)); // WARN: Assuming notif sender is also bead author
      return encodeHashToBase64(base.bead.ppAh);
    }
  }


  /** -- Store: Cache & index a materialized entry, and notify subscribers -- */

  /** */
  storeNotification(notif: WeaveNotification, ppAh?: ActionHashB64) {
    /** make sure we have the content signaled in the notification */
    if (!ppAh) {
      this.getPpFromNotification(notif).then((ppAh) => this.fetchPp(ppAh));
    } else {
      /*await*/ this.fetchPp(ppAh);
    }
    /* */
    //console.log("storeInboxItem()", notif.event, ppAh);
    this._inbox[encodeHashToBase64(notif.link_ah)] = [ppAh, notif];
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
    if (pp.subject.typeName == DM_SUBJECT_TYPE_NAME) {
      /** DM thread */
      const agent_hash = encodeHashToBase64(eh2agent(decodeHashFromBase64(ppMat.subject.hash)));
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
  async storeEmojiReaction(beadAh: ActionHashB64, agent: AgentPubKeyB64, emoji: string): Promise<void> {
    if (this.hasEmojiReaction(beadAh, agent, emoji)) {
      return;
    }
    if (!this._emojiReactions[beadAh]) {
      this._emojiReactions[beadAh] = [];
    }
    this._emojiReactions[beadAh].push([agent, emoji]);
  }


  /** */
  async unstoreEmojiReaction(beadAh: ActionHashB64, agent: AgentPubKeyB64, emoji: string) {
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
        const agent_hash = eh2agent(decodeHashFromBase64(thread.pp.subject.hash));
        other = encodeHashToBase64(agent_hash);
      }
      return other;
    }
  }


  /* Store Bead in its Thread */
  private storeBeadInThread(beadAh: ActionHashB64, ppAh: ActionHashB64, creationTime: Timestamp, isNew: boolean, beadType: string) {
    console.log("storeBeadInThread()", beadType, beadAh);
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
    console.log(`ThreadsZvm.broadcastTip() Sending Tip "${tip.type}" to`, filtered, this.cell.agentPubKey);
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
  async emitNotificationTip(agent: AgentPubKeyB64, notification: ThreadsNotification): Promise<boolean> {
    try {
      await this.zomeProxy.castNotificationTip({peer: decodeHashFromBase64(agent), notification});
      return true;
    } catch (e) {
      /** Peer might not be online, use notificationZome instead */
      // FIXME
    }
    return false;
  }


  /** */
  createNotificationSignal(notification: WeaveNotification, extra: Uint8Array): ThreadsNotification {
    let pp_ah = notification.content;
    if (NotifiableEvent.Mention === notification.event || NotifiableEvent.Reply === notification.event
        || NotifiableEvent.NewBead === notification.event) {
      const beadAh = encodeHashToBase64(notification.content);
      const beadInfo = this.getBeadInfo(beadAh);
      pp_ah = decodeHashFromBase64(beadInfo.bead.ppAh);
    }
    const notif: ThreadsNotification = {
      pp_ah,
      notification,
      data: extra,
    }
    return notif;
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
    for (const [ppAh, ppMat, creationTime, maybeOtherAgent] of Object.values(external.pps)) {
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
      this.storeTypedBead(beadAh, typedBead, beadInfo.beadType, authorshipLog[0], authorshipLog[1], true);
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
      ([ppAhA, ppMatA, creationTimeA], [ppAhB, ppMatB, creationTimeB]) => {
        return creationTimeA - creationTimeB
      })
    const beadAhMapping: Record<ActionHashB64, ActionHashB64> = {}
    /* Sort beads so they can get their prev bead equivalent ah */
    const sortedBeads: [string, [BeadInfo, TypedBeadMat]][] = Object.entries(impPersp.beads).sort(
      ([beadAhA, [beadInfoA, typedBeadA]], [beadAhB, [beadInfoB, typedBeadB]]) => {
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
          default:
            console.warn("PubImp() Unknown bead type: " + beadInfo.beadType);
            continue;
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
          canNotifyReply: false,
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
    for (const pulse of signal.pulses) {
      /** -- Handle Signal according to type -- */
      if (ThreadsSignalProtocolType.Tip in pulse) {
        all.push(this.handleTip(pulse.Tip as TipProtocol, from));
        continue;
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
    this.notifySubscribers()
  }


  /** */
  private async handleInboxSignal(linkAh: ActionHashB64, link: Link, state: StateChange, from: AgentPubKeyB64) {
    const author = encodeHashToBase64(link.author);
    const base = encodeHashToBase64((link as any).base);
    const target = encodeHashToBase64(link.target);

    if (StateChangeType.Update in state) {
      console.error("Not possible to Update a link");
      return;
    }
    if (StateChangeType.Delete in state) {
      //const isNew = linkInfo.state.Delete;
      if (target == this.cell.agentPubKey) {
        await this.unstoreNotification(linkAh);
      }
      return;
    }
    /** Create */
    const isNew = state.Create;
    const eventIndex = Number(link.tag)
    const event = NotifiableEvent[eventIndex];
    console.log("handleInboxSignal() eventIndex", eventIndex, event);
    const notif: WeaveNotification = {
      event,
      author: link.author,
      timestamp: link.timestamp,
      link_ah: decodeHashFromBase64(linkAh),
      content: link.target,
    };
    /** I got notified */
    if (base == this.cell.agentPubKey) {
      /** Store Notification */
      await this.storeNotification(notif);
      /** Publish a NotifySetting.AllMessages for this thread if non exists */
      if (NotifiableEvent.NewDmThread === event && isNew) {
        const ppAh = encodeHashToBase64(notif.content);
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
      let extra;
      if (NotifiableEvent.NewDmThread === event || NotifiableEvent.Fork === event) {
        console.log("Signaling new PP notification to peer", base, target);
        const ppAh = encodeHashToBase64(link.target);
        const ppMat = this.getParticipationProtocol(ppAh);
        extra = encode(dematerializeParticipationProtocol(ppMat));
      } else {
        /** NewBead, Mention, Reply */
        console.log("Signaling new Bead notification to peer", base, target);
        const beadAh = encodeHashToBase64(link.target);
        const beadPair = this.perspective.beads[beadAh];
        extra = encode({typed: beadPair[1], beadType: beadPair[0].beadType});
      }
      const notifPulse = this.createNotificationSignal(notif, extra);
      await this.emitNotificationTip(target, notifPulse);
    }
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
        this.handleInboxSignal(linkAh, link, state, from);
        break;
      case ThreadsLinkType.Hide:
        this.storeHidden(target, StateChangeType.Create in state);
        break;
      case ThreadsLinkType.EmojiReaction: {
        if (StateChangeType.Create in state) {
          const isNew = state.Create;
          const decoder = new TextDecoder('utf-8');
          const emoji = decoder.decode(link.tag);
          console.warn("EmojiReaction CreateLink:", link.tag, emoji);
          await this.storeEmojiReaction(base, author, emoji);
          if (isNew) {
            tip = {type: "EmojiReactionChange", bead_ah: base, author, emoji, is_added: true};
          }
        }
        if (StateChangeType.Delete in state) {
          const isNew = state.Delete;
          const decoder = new TextDecoder('utf-8');
          const emoji = decoder.decode(link.tag);
          console.warn("EmojiReaction DeleteLink:", link.tag, emoji);
          await this.unstoreEmojiReaction(base, author, emoji);
          if (isNew) {
            tip = {type: "EmojiReactionChange", bead_ah: base, author, emoji, is_added: false};
          }
        }
      }
        break;
      case ThreadsLinkType.NotifySetting: {
        if (StateChangeType.Create in state) {
          const decoder = new TextDecoder('utf-8');
          const setting = decoder.decode(link.tag);
          console.warn("NotifySetting CreateLink:", link.tag, setting);
          this.storeNotifSetting(base, target, setting as NotifySetting);
        }
        // if (StateChangeType.Delete in state) {
        //   this.threadsZvm.storeNotifSetting(target);
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
          tip = await this.handleBeadEntry(entryInfo, anyBead, ThreadsEntryType.AnyBead, entryInfo.state.Create);
        }
        break;
      case "EntryBead":
        const entryBead = (kind as ThreadsEntryVariantEntryBead).EntryBead;
        if (StateChangeType.Create in entryInfo.state) {
          tip = await this.handleBeadEntry(entryInfo, entryBead, ThreadsEntryType.EntryBead, entryInfo.state.Create);
        }
        break;
      case "TextBead":
        const textBead = (kind as ThreadsEntryVariantTextBead).TextBead;
        if (StateChangeType.Create in entryInfo.state) {
          tip = await this.handleBeadEntry(entryInfo, textBead, ThreadsEntryType.TextBead, entryInfo.state.Create);
        }
        break;
      case "EncryptedBead":
        const encBead = (kind as ThreadsEntryVariantEncryptedBead).EncryptedBead;
        if (StateChangeType.Create in entryInfo.state) {
          tip = await this.handleBeadEntry(entryInfo, encBead, ThreadsEntryType.EncryptedBead, entryInfo.state.Create);
        }
        break;
      case "SemanticTopic":
        const semTopic = (kind as ThreadsEntryVariantSemanticTopic).SemanticTopic;
        if (StateChangeType.Create in entryInfo.state) {
          const isNew = entryInfo.state.Create;
          this.storeSemanticTopic(hash, semTopic.title);
          if (isNew) {
            tip = {type: "NewSemanticTopic", topic_eh: hash, title: semTopic.title};
          }
        }
        break;
      case "ParticipationProtocol":
        const pp= (kind as ThreadsEntryVariantParticipationProtocol).ParticipationProtocol;
        if (StateChangeType.Create in entryInfo.state) {
          const isNew = entryInfo.state.Create;
          this.storeThread(hash, pp, entryInfo.ts, author, isNew);
          if (isNew) {
            tip = {type: "NewPp", creation_ts: entryInfo.ts, ah: hash, pp};
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
  private async handleBeadEntry(entryInfo: EntryInfo, bead: TypedBead, beadType: BeadType, isNew: boolean): Promise<TipProtocol> {
    console.log("handleBeadEntry()", beadType, encodeHashToBase64(entryInfo.hash));
    if (!isHashType(entryInfo.author, 'Agent') || !isHashType(entryInfo.hash, 'Action')) {
      console.error("Bad hash typed in EntryInfo", entryInfo);
      return;
    }
    const author = encodeHashToBase64(entryInfo.author);
    const beadAh = encodeHashToBase64(entryInfo.hash);
    const typed = materializeTypedBead(bead, beadType);
    let tip: TipProtocol;
    this.storeTypedBead(beadAh, typed, beadType, entryInfo.ts, author, isNew);

    const ppAh = beadType == ThreadsEntryType.EncryptedBead
      ? this.perspective.decBeads[beadAh][0].bead.ppAh
      : (typed as unknown as TypedBaseBeadMat).bead.ppAh;
    const data = encode({typed, beadType});
    if (isNew) {
      //await delay(100); // Wait a bit because recipients don't handle signals with async and there could be two NewBead signals.
      tip = {type: "NewBead", creation_ts: entryInfo.ts, bead_ah: beadAh, bead_type: beadType, pp_ah: ppAh, data};
    }
    /** */
    return tip;
  }


  /** */
  private async handleTip(tip: TipProtocol, from: AgentPubKeyB64) {
    /* Send pong response */
    if (tip.type != "Pong") {
      console.log("PONGING ", from)
      const pong: TipProtocol = {type: "Pong", from: this.cell.agentPubKey};
      this.broadcastTip(pong, [from])
    }
    /* Handle signal */
    switch (tip.type) {
      case "Ping":
      case "Pong":
        break;
      case "Notification": {
        return this.handleNotificationTip(tip.value, from);
      }
        break;
      case "UpdateSemanticTopic": {
        const {old_topic_eh, new_topic_eh, title} = tip as TipProtocolVariantUpdateSemanticTopic;
        this.unstoreSemanticTopic(old_topic_eh);
        this.storeSemanticTopic(new_topic_eh, title);
      }
        break;
      case "NewSemanticTopic":
        const {topic_eh, title} = tip as TipProtocolVariantNewSemanticTopic;
        this.storeSemanticTopic(topic_eh, title);
        break;
      case "NewPp": {
        const {creation_ts, ah, pp} = tip as TipProtocolVariantNewPp;
        ///*await */ this.threadsZvm.fetchPp(newPpAh);
        this.storeThread(ah, pp, creation_ts, from, true);
      }
        break;
      case "NewBead":
        const {creation_ts, bead_ah, bead_type, pp_ah, data} = tip as TipProtocolVariantNewBead;
        console.log("Signal is NewBead of type", bead_type);
        const {typed, beadType} = decode(data) as {typed: TypedBeadMat, beadType: BeadType};
        console.log("NewBead", bead_ah, typed, beadType, bead_type);
        //const beadType = beadTypeStr as BeadType;
        /* await*/ this.storeTypedBead(bead_ah, typed, beadType, creation_ts, from, true);
        break;
      case "EmojiReactionChange": {
        const {bead_ah, author, emoji, is_added} = tip as TipProtocolVariantEmojiReactionChange;
        if (is_added) {
          this.storeEmojiReaction(bead_ah, author, emoji);
        } else {
          this.unstoreEmojiReaction(bead_ah, author, emoji);
        }
      }
        break;
    }
  }


  /** */
  private async handleNotificationTip(notifTip: ThreadsNotification, from: AgentPubKeyB64) {
    const notif = notifTip.notification as WeaveNotification;
    const extra: Uint8Array = notifTip.data;

    let ppAh: ActionHashB64;
    /** Store received Entry */
    if (NotifiableEvent.Mention == notif.event || NotifiableEvent.Reply == notif.event || NotifiableEvent.NewBead == notif.event) {
      const {typed, beadType} = decode(extra) as {typed: TypedBeadMat, beadType: BeadType};
      const beadAh = encodeHashToBase64(notif.content);
      //ppAh = typedMat.bead.ppAh;
      // if (!notifSignal.maybePpHash) {
      //   console.error("Missing ppAh in ThreadsSignal");
      // }
      ppAh = encodeHashToBase64(notifTip.pp_ah);
      console.log(`Received NotificationSignal of type ${JSON.stringify(notif.event)}:`, beadAh, typed);
      await this.storeTypedBead(beadAh, typed, beadType, notif.timestamp, encodeHashToBase64(notif.author), true);
    }
    /* Set notif setting */
    if (NotifiableEvent.NewDmThread == notif.event) {
      ppAh = encodeHashToBase64(notif.content);
      /* skip if known thread */
      const dmThread = this.perspective.threads.get(ppAh);
      if (dmThread) {
        return;
      }
      /** Store thread */
      const pp = decode(extra) as ParticipationProtocol;
      this.storeThread(ppAh, pp, notif.timestamp, encodeHashToBase64(notif.author), false);
      /* Set NotifSetting */
      console.log("NewDmThread.publishNotifSetting() signal", ppAh);
      await this.publishNotifSetting(ppAh, NotifySetting.AllMessages);
    }
    if (NotifiableEvent.Fork === notif.event) {
      const pp = decode(extra) as ParticipationProtocol;
      ppAh = encodeHashToBase64(notif.content);
      console.log(`Received NotificationSignal of type ${NotifiableEvent.Fork}:`, pp);
      this.storeThread(ppAh, pp, notif.timestamp, encodeHashToBase64(notif.author), false);
    }

    /* Brutal way to make sure we have the content signaled in the notification */
    await this.probeAllLatest();
    this.storeNotification(notif, ppAh);
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
