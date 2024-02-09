import {
  ActionHash,
  ActionHashB64,
  AgentPubKeyB64,
  decodeHashFromBase64,
  DnaHashB64,
  encodeHashToBase64,
  EntryHashB64,
  Timestamp,
} from "@holochain/client";
import {
  AnyBead,
  Bead,
  BeadLink,
  GlobalLastProbeLog,
  NotifiableEventType,
  ParticipationProtocol,
  SEMANTIC_TOPIC_TYPE_NAME,
  SignalPayloadType,
  TextBead,
  ThreadLastProbeLog,
  ThreadsEntryType,
  WeaveNotification,
  WeaveSignal,
} from "../bindings/threads.types";
import {ThreadsProxy} from "../bindings/threads.proxy";
import {Dictionary, ZomeViewModel} from "@ddd-qc/lit-happ";
import {
  AnyLinkableHashB64,
  BeadInfo,
  BeadInfoMat,
  BeadLinkMaterialized,
  BeadType,
  dematerializedTypedBead,
  dematerializeParticipationProtocol,
  EntryBeadMat,
  materializedTypedBead,
  materializeParticipationProtocol,
  materializeSubject,
  ParticipationProtocolMat,
  SubjectMat,
  TextBeadMat,
  ThreadsPerspective,
  ThreadsPerspectiveMat,
  TypedBead,
  TypedBeadMat,
} from "./threads.perspective";
import {Thread} from "./thread";
import {TimeInterval} from "./timeInterval";
import {AppletId, Hrl} from "@lightningrodlabs/we-applet";
import {prettyTimestamp} from "@ddd-qc/files";
import {encode} from "@msgpack/msgpack";
import {decodeHrl, encodeHrl} from "../utils";
import {generateSearchTest, SearchParameters} from "../search";
import {OriginalsZvm} from "./originals.zvm";


generateSearchTest();


/**
 *
 */
export class ThreadsZvm extends ZomeViewModel {

  static readonly ZOME_PROXY = ThreadsProxy;
  get zomeProxy(): ThreadsProxy {return this._zomeProxy as ThreadsProxy;}

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
      //allParticipationProtocols: this._allParticipationProtocols,
      threadsPerSubject: this._threadsPerSubject,
      threadsByName: this._threadsByName,
      threads: this._threads,
      beads: this._beads,
      appletSubjectTypes: this._appletSubjectTypes,
      subjectsPerType: this._subjectsPerType,
      emojiReactions:  this._emojiReactions,

      globalProbeLog: this._globalProbeLog,
      newSubjects: this._newSubjects,
      unreadSubjects: this._unreadSubjects,
      newThreads: this._newThreads,
      unreadThreads: this._unreadThreads,

      allAppletIds: this._allAppletIds,

      inbox: this._inbox,

    };
  }


  private _allAppletIds: string[] = [];
  /** ah -> Subject */
  private _allSubjects: Map<AnyLinkableHashB64, SubjectMat> = new Map();
  /** eh -> (title, isHidden) */
  private _allSemanticTopics: Dictionary<[string, boolean]> = {};
  ///** ah -> ParticipationProtocol */
  //private _allParticipationProtocols: Dictionary<ParticipationProtocolMat> = {};
  /** ah -> (BeadInfo, Bead) */
  private _beads: Dictionary<[BeadInfo, TypedBead]> = {};
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

  private _emojiReactions: Dictionary<[AgentPubKeyB64, string][]> = {}

  /** */
  private _globalProbeLog?: GlobalLastProbeLog;
  /** New & Unreads */
  private _newSubjects: Dictionary<[ActionHash, Timestamp][]> = {};
  private _unreadSubjects: AnyLinkableHashB64[] = [];
  private _newThreads: ActionHashB64[] = [];
  private _unreadThreads: Dictionary<ActionHashB64[]> = {};

  /** */
  private _inbox: Dictionary<WeaveNotification> = {};


  /** -- Get: Return a stored element -- */

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

  getThread(ppAh: ActionHashB64): Thread | undefined {
    return this._threads.get(ppAh);
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

  getBead(beadAh: ActionHashB64): TypedBead | undefined {
    const maybeBead = this._beads[beadAh];
    if (!maybeBead) {
      return undefined;
    }
    return maybeBead[1];
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
        infos.push(this._beads[ah])
      }
    }
    //FIXME tuples.sort((a, b) => {return 1})
    return infos;
  }


  /** */
  getAllBeadsOnThread(ppAh: ActionHashB64): [BeadInfo, TypedBead][] {
    const thread = this._threads.get(ppAh);
    if (!thread) {
      return [];
    }
    const beadAhs = thread.getAll().map((bl) => bl.beadAh);
    let infos = [];
    for (const ah of beadAhs) {
      if (this._beads[ah]) {
        infos.push(this._beads[ah])
      }
    }
    //FIXME tuples.sort((a, b) => {return 1})
    return infos;
  }


  /** */
  hasReachedBeginning(ppAh: ActionHashB64): boolean {
    const thread = this._threads.get(ppAh);
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


  /** Search */


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

    if (parameters.beforeTs && parameters.afterTs && parameters.afterTs < parameters.beforeTs) {
      throw new Error(`Invalid search parameters. Search time interval: [${parameters.afterTs}; ${parameters.beforeTs}]'.`);
    }

    /** Filter bead type */
    let matchingTextBeads: [ActionHashB64, BeadInfo, string][] = Object.entries(this._beads)
      .filter(([_beadAh, beadPair]) => beadPair[0].beadType == ThreadsEntryType.TextBead)
      .map(([beadAh, beadPair]) => [beadAh, beadPair[0], (beadPair[1] as TextBead).value.toLowerCase()]);

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
      matchingTextBeads = matchingTextBeads.filter(([_beadAh, beadInfo, _textLC]) => encodeHashToBase64(beadInfo.bead.ppAh) == ppAh);
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
              console.log("searchTextBeads() has", keywordLC, textLC);
              return true;
            }
          }
        })
    }
    /** DONE */
    console.log("searchTextBeads() result", matchingTextBeads.length, matchingTextBeads);
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
      await this.probeAllBeads(ppAh)
      result = this.searchTextBeads(parameters);
    } else {
      // TODO: progressive timeframe search
      /** Get beads on all threads within timeframe */
      for (const ppAh of this._threads.keys()) {
        await this.probeLatestBeads(ppAh, parameters.afterTs, parameters.beforeTs, limit);
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
    await this.querySemanticTopics();
    await this.queryThreads();
    await this.queryBeads();
    await this.queryProbeLogs(true);

    this.notifySubscribers(); // check if this is useful
  }


  /** */
  async initializePerspectiveOnline(): Promise<void> {
    /** Grab all semantic topics to see if there are new ones */
    await this.probeSemanticTopics();

    /** Grab all threads of SemanticTopics to see if there are new ones */
    let probes = []
    for (const topicEh of Object.keys(this._allSemanticTopics)) {
      probes.push(this.probeSubjectThreads(topicEh));
    }
    await Promise.all(probes);

    /** Get last elements since last time (global search log) */
    await this.probeAllLatest();

    await this.probeInbox();

    /** */
    await this.probeAllAppletIds();
  }


  /** */
  async probeHiddens(): Promise<AnyLinkableHashB64[]> {
    const hiddens = await this.zomeProxy.getHiddenSubjects();
    return hiddens.map((hidden) => encodeHashToBase64(hidden))
  }


  /** */
  async probeInbox() {
    const items = await this.zomeProxy.probeInbox();
    this._inbox = {};
    items.map((notif) => {
      this._inbox[encodeHashToBase64(notif.link_ah)] = notif;
    });
    this.notifySubscribers();
  }


  /** -- Query: Query the local source-chain, and store the results (async) -- */

  /** */
  private async queryProbeLogs(retryOnFail: boolean): Promise<void> {
    console.log("queryProbeLogs()", retryOnFail);
    /** HACK: retry on fail as this is called twice by We, which can cause "head has moved" error */
    if (retryOnFail) {
      try {
        this._globalProbeLog = await this.zomeProxy.getGlobalLog();
      } catch(e) {
        this._globalProbeLog = await this.zomeProxy.getGlobalLog();
      }
    } else {
      this._globalProbeLog = await this.zomeProxy.getGlobalLog();
    }
    /** Thread logs */
    const threadLogs = await this.zomeProxy.queryThreadLogs();
    for (const threadLog of threadLogs) {
      const ppAh = encodeHashToBase64(threadLog.ppAh)
      if (!this._threads.has(ppAh)) {
        //this._threads[ppAh] = new Thread();
        try {
          await this.fetchPp(ppAh);
        } catch(e) {
          console.warn("Thread not found when querying log", ppAh);
          continue;
        }
      }
      this._threads.get(ppAh).setLatestProbeLogTime(threadLog.ts);
    }
  }


  /** Get all SemanticTopics from the RootAnchor */
  private async querySemanticTopics(): Promise<Dictionary<[string, boolean]>> {
    const tuples = await this.zomeProxy.querySemanticTopics();
    const hiddens = await this.probeHiddens();
    for (const [_ts, eh, st] of tuples) {
      const topicEh = encodeHashToBase64(eh);
      this.storeSemanticTopic(topicEh, st.title, hiddens.includes(topicEh), false);
    }
    console.log("querySemanticTopics()", Object.keys(this._allSemanticTopics).length);
    return this._allSemanticTopics;
  }


  /** Get all Threads from a subject */
  async queryThreads(): Promise<void> {
    const tuples = await this.zomeProxy.queryPps();
    const hiddens = await this.probeHiddens();
    for (const [ts, author, ah, pp] of tuples) {
      const ppAh = encodeHashToBase64(ah);
      this.storePp(encodeHashToBase64(ah), pp, ts, encodeHashToBase64(author), hiddens.includes(ppAh), false, true);
    }
    console.log("queryThreads()", this._threads.size);
    this.notifySubscribers();
  }


  /** Get all local beads */
  async queryBeads(): Promise<void> {
    const tmTuples = await this.zomeProxy.queryTextBeads() as unknown as [Timestamp, ActionHash, TypedBead][];
    const anyTuples = await this.zomeProxy.queryAnyBeads() as unknown as [Timestamp, ActionHash, TypedBead][];
    const entryTuples = await this.zomeProxy.queryEntryBeads() as unknown as [Timestamp, ActionHash, TypedBead][];
    const all: [Timestamp, ActionHash, TypedBead][] = tmTuples.concat(anyTuples).concat(entryTuples);
    for (const [ts, ah, typed] of all) {
      await this.storeBead(encodeHashToBase64(ah), ts, this.cell.agentPubKey, typed, false, false);
    }
    console.log("queryBeads()", this._threads.size);
  }


  /** -- Probe: Query the DHT, and store the results (async) -- */

  /** */
  probeAllInner() {
    /* await */ this.initializePerspectiveOnline();
  }


  /** */
  async probeAllAppletIds(): Promise<string[]> {
    console.log("probeAllAppletIds()")
    // const appletIds = await this.zomeProxy.getApplets();
    // this._allAppletIds = appletIds.map((eh) => encodeHashToBase64(eh));
    this._allAppletIds = await this.zomeProxy.getApplets();
    console.log("probeAllAppletIds() res", this._allAppletIds);
    this.notifySubscribers();
    return this._allAppletIds;
  }


  /** Get all Subjects from the RootAnchor */
  async probeAllSubjects(): Promise<Map<AnyLinkableHashB64, SubjectMat>> {
    const subjects = await this.zomeProxy.getAllSubjects();
    for (const subject of subjects) {
      const subjectMat = materializeSubject(subject);
      this._allSubjects.set(subjectMat.hash, subjectMat);
    }
    console.log("probeAllSubjects()", this._allSubjects.size);
    this.notifySubscribers();
    return this._allSubjects;
  }

  // TODO: probeDnaSubjects()
  // TODO: probeEntryTypeSubjects()


  /** Get all SemanticTopics from the RootAnchor */
  async probeSemanticTopics(): Promise<Dictionary<[string, boolean]>> {
    const sts = await this.zomeProxy.getAllSemanticTopics();
    const hiddens = await this.probeHiddens();
    for (const tuple of sts) {
      const topicEh = encodeHashToBase64(tuple[0]);
      this.storeSemanticTopic(topicEh, tuple[1], hiddens.includes(topicEh), false);
    }
    console.log("probeSemanticTopics()", Object.keys(this._allSemanticTopics).length);
    return this._allSemanticTopics;
  }


  /** Get all Threads from a subject */
  async probeSubjectThreads(subjectHash: AnyLinkableHashB64): Promise<Dictionary<ParticipationProtocol>> {
    let res = {};
    const pps = await this.zomeProxy.getPpsFromSubjectHash(decodeHashFromBase64(subjectHash));
    const hiddens = await this.probeHiddens();
    // FIXME resolve promise all at once
    for (const [pp_ah, _linkTs] of pps) {
      const ppAh = encodeHashToBase64(pp_ah);
      const [pp, ts, author] = await this.zomeProxy.getPp(pp_ah);
      this.storePp(ppAh, pp, ts, encodeHashToBase64(author), hiddens.includes(ppAh), false);
      res[ppAh] = pp;
    }
    return res;
  }


  /** Get all SubjectTypes for a AppletId */
  async probeSubjectTypes(appletId: AppletId): Promise<Dictionary<string>> {
    //const appletHash = decodeHashFromBase64(appletId);
    let subjectTypesRaw = await this.zomeProxy.getSubjectTypesForApplet(appletId);
    let subjectTypes: Dictionary<string> = {}//subjectTypesRaw.map(([st, hash]) => [st, encodeHashToBase64(hash)]);
    console.log("probeSubjectTypes()", subjectTypes);
    for (const [subjectType, pathHash] of subjectTypesRaw) {
      subjectTypes[encodeHashToBase64(pathHash)] = subjectType;
    }
    this._appletSubjectTypes[appletId] = subjectTypes;
    return subjectTypes;
  }


  /** Get all subjects from a subjectType path */
  async probeSubjects(appletId: AppletId, pathHash: EntryHashB64): Promise<[DnaHashB64, AnyLinkableHashB64][]> {
    if (!this._appletSubjectTypes[appletId] || !Object.keys(this._appletSubjectTypes[appletId]).includes(pathHash)) {
      return Promise.reject("Unknown pathHash for dnaHash");
    }
    const subjectType = this.getSubjectType(appletId, pathHash);
    const subjects = await this.zomeProxy.getSubjectsByType({appletId, subjectType});
    const subjectB64s: [DnaHashB64, AnyLinkableHashB64][] = subjects.map(([dnaHash, subjectHash]) => [encodeHashToBase64(dnaHash), encodeHashToBase64(subjectHash)]);
    this._subjectsPerType[pathHash] = subjectB64s;
    return subjectB64s;
  }


  /** */
  async probeAllLatest(): Promise<void> {
    const latest = await this.zomeProxy.probeAllLatest(this._globalProbeLog.ts);
    const newThreads = latest.newThreadsBySubject.map(([_topicHash, ppAh]) => encodeHashToBase64(ppAh));
    let unreadSubjects = latest.newThreadsBySubject.map(([topicHash, _ppAh]) => encodeHashToBase64(topicHash));

    /** Map new beads to their threads */
    let unreadThreads: Dictionary<ActionHashB64[]> = {};
    latest.newBeadsByThread.map(([pp_ah, bl]) => {
      const ppAh =  encodeHashToBase64(pp_ah);
      if (!unreadThreads[ppAh]) {
        unreadThreads[ppAh] = [];
      }
      unreadThreads[ppAh].push(encodeHashToBase64(bl.beadAh));
    });


    /** Mark subject as unread if it has an unread thread */
    for (const ppAh of Object.keys(unreadThreads)) {
      const thread = this._threads.get(ppAh);
      if (!thread) {
        console.error("Unread thread is unknown");
        continue;
      }
      const topicHash = thread.pp.subject.hash;
      unreadSubjects.push(topicHash);
    }
    /** Dedup */
    unreadSubjects = [...new Set(unreadSubjects)];

    /** Store subject's oldest 'new' thread time for each new thread */
    const oldestNewThreadBySubject: Dictionary<Timestamp> = {};
    for (const ppAh of newThreads) {
      const thread = this._threads.get(ppAh);
      if (!thread) {
        console.error("Thread not found");
        continue;
      }
      const topicHash = thread.pp.subject.hash;
      if (!oldestNewThreadBySubject[topicHash] || thread.creationTime < oldestNewThreadBySubject[topicHash]) {
        oldestNewThreadBySubject[topicHash] = thread.creationTime;
      }
    }
    /** Figure out if subjects are new: no older "none-new" threads found for this subject */
    //console.log("oldestThreadTimeBySubject", oldestThreadTimeBySubject);
    let newSubjects = {};
    for (const [subjectHash, oldestNewThreadTime] of Object.entries(oldestNewThreadBySubject)) {
      const pps = await this.zomeProxy.getPpsFromSubjectHash(decodeHashFromBase64(subjectHash));
      //console.log(`Subject "${subjectHash}" oldestNewThreadBySubject: `, new Date(oldestNewThreadTime / 1000), oldestNewThreadTime)
      newSubjects[subjectHash] = pps.map(([ppAh, ts]) => [encodeHashToBase64(ppAh), ts]);
      for (const [_ppAh, ppCreationTime] of pps) {
        //let diff = oldestNewThreadTime - ppCreationTime;
        //console.log(`Subject "${subjectHash}" thread "${encodeHashToBase64(ppAh)}" creationTime: `, new Date(ppCreationTime / 1000), ppCreationTime)
        //console.log(`Diff for ${subjectHash} thread ${encodeHashToBase64(ppAh)}`, diff)
        if (ppCreationTime < oldestNewThreadTime) {
          delete newSubjects[subjectHash];
          break;
        }
      }
    }
    // /** DEBUG */
    // console.log("probeAllLatest:    newSubjects", newSubjects);
    // console.log("probeAllLatest: unreadSubjects", unreadSubjects);
    // console.log("probeAllLatest:     newThreads", newThreads);
    // console.log("probeAllLatest:  unreadThreads", unreadThreads);
    /** Done */
    this._newSubjects = newSubjects;
    this._unreadSubjects = unreadSubjects;
    this._newThreads = newThreads;
    this._unreadThreads = unreadThreads;
    this.notifySubscribers();
  }


  /** Probe all emojis on this bead */
  async probeEmojiReactions(beadAh: ActionHashB64) {
    console.log("probeEmojiReactions()", beadAh);
    const reactions = await this.zomeProxy.getReactions(decodeHashFromBase64(beadAh));
    console.log("probeEmojiReactions() count", reactions.length);
    if (reactions.length > 0) {
      this._emojiReactions[beadAh] = reactions.map(([key, emoji]) => [encodeHashToBase64(key), emoji]);
    }
    this.notifySubscribers();
  }


  /** */
  async storeEmojiReaction(beadAh: ActionHashB64, agent: AgentPubKeyB64, emoji: string): Promise<boolean> {
    if (!this._emojiReactions[beadAh]) {
      this._emojiReactions[beadAh] = [];
    } else {
      /** Make sure this reaction is not already stored */
      const maybeAlready = Object.values(this._emojiReactions[beadAh]).find(([a, e]) => (agent == a && e == emoji));
      if (maybeAlready) {
        return false;
      }
    }
    this._emojiReactions[beadAh].push([agent, emoji]);
    this.notifySubscribers();
    return true;
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
      this.notifySubscribers();
    }
  }


  /** Get all beads from a thread */
  async probeAllBeads(ppAh: ActionHashB64): Promise<BeadLink[]> {
    console.log("probeAllBeads()", ppAh)
    // FIXME: Remove this weird guard
    if (ppAh.length == 0) {
      console.warn("probeAllBeads() Failed. ppAh not provided.")
      return [];
    }
    /** Probe */
    const [interval, beadLinks] = await this.zomeProxy.getAllBeads(decodeHashFromBase64(ppAh));
    console.log("probeAllBeads()", TimeInterval.new(interval).toStringSec(), beadLinks)
    /** Store */
    await this.fetchBeads(ppAh, beadLinks, TimeInterval.new(interval));
    if (this._threads.get(ppAh)) {
      this._threads.get(ppAh).setSearchedOldestBead();
      console.log("setSearchedOldestBead for", ppAh, this._threads.get(ppAh).hasSearchedOldestBead);
    }
    /** Done */
    return beadLinks;
  }


  /** Get all beads from "now" and back until `limit` is reached or `startTime` is reached */
  async probeLatestBeads(ppAh: ActionHashB64, begin_time?: Timestamp, end_time?: Timestamp, target_limit?: number): Promise<BeadLink[]> {
    console.log("probeLatestBeads()", ppAh);
    let thread = this._threads.get(ppAh);
    if (!thread) {
      try {
        await this.fetchPp(ppAh);
      } catch(e) {
        console.error("probeLatestBeads() Failed. ParticipationProtocol not found");
        return [];
      }
      thread = this._threads.get(ppAh);
    }
    /** Probe the latest beads */
    const [searchedInterval, beadLinks] = await this.zomeProxy.getLatestBeads({
      pp_ah: decodeHashFromBase64(ppAh), begin_time, end_time, target_limit
    });
    /** Cache them */
    await this.fetchBeads(ppAh, beadLinks, TimeInterval.new(searchedInterval));
    /** Check if beginning of time reached */
    if (searchedInterval.begin <= thread.creationTime) {
      thread.setSearchedOldestBead();
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
    const oldestTime = thread.probedUnion.begin;
    const endTime = oldestTime? oldestTime : Date.now() * 1000;
    return this.probeLatestBeads(ppAh, undefined, endTime, limit);
  }


  /** */
  async createNextBead(ppAh: ActionHashB64): Promise<Bead> {
    /** Figure out last known bead for this thread */
    let thread = this._threads.get(ppAh);
    if (!thread) {
      await this.fetchPp(ppAh);
      thread = this._threads.get(ppAh);
      if (!thread) {
        return Promise.reject("Unknown thread: " + ppAh);
      }
    }
    const lastKnownBeadOnThread = thread.getLast(1);
    let prevKnownBeadAh;
    if (lastKnownBeadOnThread && lastKnownBeadOnThread.length > 0) {
      prevKnownBeadAh = decodeHashFromBase64(lastKnownBeadOnThread[0].beadAh)
    }
    /** Make bead */
    const bead: Bead = {
      ppAh: decodeHashFromBase64(ppAh),
      prevKnownBeadAh,
    }
    console.log("createNextBead() bead", prevKnownBeadAh? encodeHashToBase64(prevKnownBeadAh): undefined, ppAh);
    return bead;
  }


  /** -- Publish: Commit to source-chain (and possibly the DHT) and store it (async because the commit could fail) -- */

  /** */
  async publishTypedBead(type: BeadType, content: string | Hrl | EntryHashB64, ppAh: ActionHashB64, ments?: AgentPubKeyB64[]) : Promise<[ActionHashB64, string, number, TypedBead]> {
    const creation_time = Date.now() * 1000;
    const nextBead = await this.createNextBead(ppAh);
    const [ah, global_time_anchor, tm] = await this.publishTypedBeadAt(type, content, nextBead, creation_time, ments);
    return [ah, global_time_anchor, creation_time, tm];
  }



  /** */
  async publishTypedBeadAt(beadType: BeadType, content: string | Hrl | EntryHashB64, nextBead: Bead, creationTime: Timestamp, ments?: AgentPubKeyB64[], dontStore?: boolean)
    : Promise<[ActionHashB64, string, TypedBead]>
  {
    const mentionees = ments? ments.map((m) => decodeHashFromBase64(m)) : [];
    /** Commit Entry */
    let typed, global_time_anchor, bucket_ts, notifPairs;
    let bead_ah: ActionHash;
    switch (beadType) {
      case ThreadsEntryType.TextBead:
        typed = {value: content as string, bead: nextBead} as TextBead;
        [bead_ah, global_time_anchor, notifPairs] = await this.zomeProxy.addTextBeadAtWithMentions({texto: typed, creationTime, mentionees});
        break;
      case ThreadsEntryType.EntryBead:
        const entryInfo = {
          eh: decodeHashFromBase64(content as EntryHashB64),
          bead: nextBead,
          zomeName: "zFiles", // FilesProxy.DEFAULT_ZOME_NAME,
          roleName: "rFiles", // FILES_CELL_NAME
        };
        [bead_ah, typed, global_time_anchor, bucket_ts, notifPairs] = await this.zomeProxy.addEntryAsBead(entryInfo);
        break;
      case ThreadsEntryType.AnyBead:
        const encHrl = encodeHrl(content as Hrl);
        const anyBead: AnyBead = {
          bead: nextBead,
          value: encHrl,
          typeInfo: "hrl",
        }
        console.log("publishHrlBeadAt()", encHrl, anyBead);
        [bead_ah, global_time_anchor, bucket_ts, notifPairs] = await this.zomeProxy.addAnyBead(anyBead);
        break;
      default: throw Error("Unknown beadType: " + beadType);
        break;
    }
    /** Insert in ThreadInfo */
    console.log("publishTypedBeadAt() added bead", encodeHashToBase64(bead_ah), creationTime);
    //const beadLink: BeadLink = {creationTime, beadAh: bead_ah, beadType}
    if (!dontStore) {
      //await this.fetchTypedBead(bead_ah, beadType, true, creationTime);
      await this.storeBead(encodeHashToBase64(bead_ah), creationTime, this.cell.agentPubKey /* fixme */, typed, true, false);

    }
    /** Notify Mentions/reply asychronously */
    for (const [recip, notif] of notifPairs) {
      const recipient = encodeHashToBase64(recip);
      const extra = encode(typed);
      const signal = this.createNotificationSignal(notif, extra);
      console.log("publishTypedBeadAt() signaling notification to peer", recipient, (signal.payload.content[0] as WeaveNotification).event)
      /*await*/ this.notifyPeer(recipient, signal);
    }
    /** Done */
    return [encodeHashToBase64(bead_ah), global_time_anchor, typed];
  }



  // /** */
  // async publishManyTextBeadAt(msg: string, protocolAh: ActionHashB64, intervalUs: Timestamp, count: number, dontStore?: boolean) : Promise<void> {
  //   /** Make out bead */
  //   const bead: Bead = {
  //     ppAh: decodeHashFromBase64(protocolAh)
  //   }
  //   /** Commit Entry */
  //   const texto = {value: msg, bead}
  //   const tuples = await this.zomeProxy.addManyTextBeadAt({texto, intervalUs, count});
  //   for (const [ah, _global_time_anchor, _indexTime] of tuples) {
  //     const beadLink: BeadLink = {creationTime: intervalUs, beadAh: ah, beadType: ThreadsEntryType.TextBead}
  //     /** Insert in ThreadInfo */
  //     if (!dontStore) {
  //       await this.fetchBeads(protocolAh, [beadLink], TimeInterval.instant(beadLink.creationTime));
  //     }
  //   }
  // }



  /** */
  async publishSemanticTopic(title: string, preventStoring?: boolean) : Promise<EntryHashB64> {
    const eh = await this.zomeProxy.createSemanticTopic({title});
    const ehB64 = encodeHashToBase64(eh);
    if (!preventStoring) {
      this.storeSemanticTopic(ehB64, title, false, false);
    }
    console.log("publishSemanticTopic()", title, ehB64);
    console.log("publishSemanticTopic()", this._allSemanticTopics);
    /** Done */
    this.notifySubscribers();
    return ehB64;
  }


  /** */
  async publishParticipationProtocol(pp: ParticipationProtocol): Promise<[ActionHashB64, ParticipationProtocolMat]> {
    const [pp_ah, ts, maybeNotifPair] = await this.zomeProxy.createParticipationProtocol(pp);
    /** Notify subject author */
    if (maybeNotifPair) {
      const recipient = encodeHashToBase64(maybeNotifPair[0]);
      const extra = encode(pp);
      const signal = this.createNotificationSignal(maybeNotifPair[1], extra);
      console.log("publishParticipationProtocol() signaling notification to peer", recipient, (signal.payload.content[0] as WeaveNotification).event)
      /*await*/ this.notifyPeer(recipient, signal);
    }
    /** Store PP */
    const ppAh = encodeHashToBase64(pp_ah);
    const [pp2, _ts2, author] = await this.zomeProxy.getPp(pp_ah);
    const ppMat = this.storePp(ppAh, pp2, ts, encodeHashToBase64(author), false, false);
    /** */
    return [ppAh, ppMat];
  }


    /** */
  async publishThreadFromSemanticTopic(appletId: AppletId, dnaHashB64: DnaHashB64, subjectHash: AnyLinkableHashB64, purpose: string): Promise<[number, ActionHashB64, ParticipationProtocol]> {
    console.log("publishThreadFromSemanticTopic()", appletId);
    const pp: ParticipationProtocol = {
      purpose,
      rules: "FFA",
      subject: {
        hash: decodeHashFromBase64(subjectHash),
        typeName: SEMANTIC_TOPIC_TYPE_NAME,
        appletId,
        dnaHash: decodeHashFromBase64(dnaHashB64),
      },
    }
    const [pp_ah, ts, _maybeNotif] = await this.zomeProxy.createParticipationProtocol(pp);
    const ppAh = encodeHashToBase64(pp_ah);
    this.storePp(ppAh, pp, ts, this.cell.agentPubKey, false, false);
    /** */
    return [ts, ppAh, pp];
  }



  /** -- Fetch: Grab an entry from the DHT and store it (async) -- */

  /** */
  async fetchPp(ppAh: ActionHashB64, preventNotify?: boolean): Promise<ParticipationProtocolMat> {
    const [pp, ts, author] = await this.zomeProxy.getPp(decodeHashFromBase64(ppAh));
    if (pp === null) {
      Promise.reject("ParticipationProtocol not found at " + ppAh)
    }
    const isHidden = await this.zomeProxy.getHideLink(decodeHashFromBase64(ppAh));
    const ppMat = this.storePp(ppAh, pp, ts, encodeHashToBase64(author), isHidden != null, false, preventNotify);
    return ppMat;
  }


  /** */
  async fetchTypedBead(beadAh: ActionHash, beadType: BeadType, canNotify: boolean, alternateCreationTime?: Timestamp): Promise<TypedBead> {
    let creationTime, author, typed;
    try {
      switch (beadType) {
        case ThreadsEntryType.TextBead: [creationTime, author, typed] = await this.zomeProxy.getTextBead(beadAh); break;
        case ThreadsEntryType.EntryBead: [creationTime, author, typed] = await this.zomeProxy.getEntryBead(beadAh); break;
        case ThreadsEntryType.AnyBead: [creationTime, author, typed] = await this.zomeProxy.getAnyBead(beadAh); break;
      }
      const ts = alternateCreationTime? alternateCreationTime : creationTime;
      await this.storeBead(encodeHashToBase64(beadAh), ts, encodeHashToBase64(author), typed, canNotify, false);
      return typed;
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
      await this.fetchPp(ppAh, true);
      thread = this._threads.get(ppAh);
    }
    /** fetch each TextBead */
    for (const bl of beadLinks) {
      console.log("fetchBeads()", bl.beadType)
      await this.fetchTypedBead(bl.beadAh, bl.beadType as BeadType, false, bl.creationTime);
    }
    thread.addProbedInterval(probedInterval);
    this.notifySubscribers();
  }


  /** */
  async hideSubject(subjectHash: AnyLinkableHashB64) {
    await this.zomeProxy.hideSubject(decodeHashFromBase64(subjectHash));
    this.changeHideState(subjectHash, true);
  }


  /** */
  async unhideSubject(subjectHash: AnyLinkableHashB64) {
    await this.zomeProxy.unhideSubject(decodeHashFromBase64(subjectHash));
    this.changeHideState(subjectHash, false);
  }


  /** */
  private changeHideState(hash: AnyLinkableHashB64, canHide: boolean) {
    /** Check if it's a topic */
    const maybeTopicEh = Object.keys(this._allSemanticTopics).find(key => key === hash);
    if (maybeTopicEh) {
      this.storeSemanticTopic(maybeTopicEh, this._allSemanticTopics[maybeTopicEh][0], canHide, false);
      return;
    }
    /** Check if it's a thread */
    const maybeThreadAh = Array.from(this._threads.keys()).find(key => key === hash);
    if (maybeThreadAh && this._threads.has(maybeThreadAh)) {
      this._threads.get(maybeThreadAh).setIsHidden(canHide);
      this.notifySubscribers();
      return;
    }
  }


  /** */
  async deleteInboxItem(linkAh: ActionHashB64): Promise<void> {
    await this.zomeProxy.deleteInboxItem(decodeHashFromBase64(linkAh));
    delete this._inbox[linkAh]; // = undefined;
    this.notifySubscribers();
  }


  /** -- Store: Cache & index a materialized entry, and notify subscribers -- */

  /** */
  storeInboxItem(notif: WeaveNotification): void {
    ///*await*/ this.probeInboxItem(notif);
    /*await*/ this.probeAllLatest(); // Brutal way to make sure we have the content signaled in the notification
    this._inbox[encodeHashToBase64(notif.link_ah)] = notif;
    this.notifySubscribers();
  }



  /** */
  storeSemanticTopic(eh: EntryHashB64, title: string, isHidden: boolean, isNew: boolean): void {
    this._allSemanticTopics[eh] = [title, isHidden];
    if (isNew && !this._newSubjects[eh]) {
      this._newSubjects[eh] = [];
    }
    this.notifySubscribers();
  }



  /** */
  storePp(ppAh: ActionHashB64, pp: ParticipationProtocol, creationTime: Timestamp, author: AgentPubKeyB64, isHidden: boolean, isNew: boolean, preventNotify?: boolean): ParticipationProtocolMat {
    if (this._threads.has(ppAh)) {
      /** Return already stored PP */
      return this._threads.get(ppAh).pp;
    }
    let ppMat = materializeParticipationProtocol(pp);
    const threadName = this.threadName(ppMat);
    const thread = new Thread(ppMat, this.cell.dnaModifiers.origin_time, creationTime, author, threadName);
    thread.setIsHidden(isHidden);
    console.log(`storePp() thread "${ppAh}" for subject "${ppMat.subject.hash}"| creationTime: "`, creationTime, isHidden);
    this._threads.set(ppAh, thread);
    /** threadsByName */
    this._threadsByName[threadName] = ppAh;
    /** threadsPerSubject */
    if (!this._threadsPerSubject[ppMat.subject.hash]) {
      this._threadsPerSubject[ppMat.subject.hash] = [];
    }
    this._threadsPerSubject[ppMat.subject.hash].push(ppAh);
    if (isNew) {
      this._newThreads.push(ppAh);
    }
    /** All Subjects */
    if (!this._allSubjects.get(ppMat.subject.hash)) {
      this._allSubjects.set(ppMat.subject.hash, materializeSubject(pp.subject));
    }
    //console.log("storePp()", ppMat.subjectHash, ppAh)
    /** Done */
    if (!preventNotify) {
      this.notifySubscribers();
    }
    return ppMat;
  }


  /* Store Bead in its Thread */
  private async storeBeadInThread(beadAh: ActionHashB64, ppAh: ActionHashB64, creationTime: Timestamp, isNew: boolean, beadType: string) {
    if (!this._threads.has(ppAh)) {
      await this.fetchPp(ppAh);
      return;
    }
    const blMat: BeadLinkMaterialized = {creationTime, beadAh, beadType};
    this._threads.get(ppAh).addItem(blMat);
    if (isNew) {
      if (!this._unreadThreads[ppAh]) {
        this._unreadThreads[ppAh] = [];
      }
      this._unreadThreads[ppAh].push(beadAh);
      // FIXME: grab subject and check if must me marked as unread too
    }
    this.notifySubscribers();
  }


  /** */
  determineBeadType(typedBead: TypedBead): string {
    if ("fromZome" in typedBead) {
      return ThreadsEntryType.EntryBead;
    }
    if ("typeInfo" in typedBead) {
      return ThreadsEntryType.AnyBead;
    }
    return ThreadsEntryType.TextBead;
  }


  /** */
  async storeBead(beadAh: ActionHashB64, creationTime: Timestamp, author: AgentPubKeyB64, typedBead: TypedBead, canNotify: boolean, isNew: boolean) {
    if (this._beads[beadAh]) {
      return;
    }
    const beadInfo = {creationTime, author, beadType: this.determineBeadType(typedBead), bead: typedBead.bead};
    const ppAh = encodeHashToBase64(typedBead.bead.ppAh);
    console.log("storeBead()", ppAh, typedBead);
    await this.storeBeadInThread(beadAh, ppAh, creationTime, isNew, ThreadsEntryType.AnyBead);
    this._beads[beadAh] = [beadInfo, typedBead];
    if (canNotify) {
      this.notifySubscribers();
    }
  }


  /** -- commit search logs -- */

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


  /** */
  async commitProbeLogs(): Promise<void> {
    console.log("commitProbeLogs() start");
    /** Commit Global Log */
    const maybeLatest = this.getLatestThread();
    console.log("commitProbeLogs() maybeLatest", maybeLatest);
    let latestGlobalLogTime = await this.zomeProxy.commitGlobalLog(decodeHashFromBase64(maybeLatest? maybeLatest[0] : undefined)); // FIXME
    console.log("commitProbeLogs()", prettyTimestamp(latestGlobalLogTime));
    this._globalProbeLog.ts = latestGlobalLogTime;
    /** Commit each Thread Log */
    for (const [ppAh, thread] of this._threads.entries()) {
      //console.log(`commitProbeLogs() Thread "${thread.pp.purpose}":`, thread.probedUnion, thread.beadLinksTree.end.key, thread.latestProbeLogTime);
      if (thread.probedUnion && thread.probedUnion.end > thread.latestProbeLogTime) {
        const threadLog: ThreadLastProbeLog = {
          maybeLastKnownBeadAh: decodeHashFromBase64(thread.beadLinksTree.end.value.beadAh),
          ts: thread.beadLinksTree.end.key,
          ppAh: decodeHashFromBase64(ppAh),
        }
        const _ah = await this.zomeProxy.commitThreadLog(threadLog);
        thread.setLatestProbeLogTime(threadLog.ts);
      }
    }
  }



  /** -- Signaling / Notifying -- */

  /** */
  async signalPeers(signal: WeaveSignal, agents: Array<AgentPubKeyB64>): Promise<void> {
    const peers = agents.map((key) => decodeHashFromBase64(key));
    return this.zomeProxy.signalPeers({signal, peers});
  }

  /** Return true if sent synchronously */
  async notifyPeer(agent: AgentPubKeyB64, signal: WeaveSignal): Promise<boolean> {
    try {
      await this.zomeProxy.notifyPeer({peer: decodeHashFromBase64(agent), payload: signal});
      return true;
    } catch (e) {
      /** Peer might not be online, use notificationZome instead */
      // FIXME
    }
    return false;
  }


  /** */
  private createNotificationSignal(notification: WeaveNotification, extra: Uint8Array): WeaveSignal {
    let maybePpHash;
    if (NotifiableEventType.Mention in notification || NotifiableEventType.Reply in notification) {
      const beadAh = encodeHashToBase64(notification.content);
      const beadInfo = this.getBeadInfo(beadAh);
      maybePpHash = encodeHashToBase64(beadInfo.bead.ppAh);
    }
    const signal: WeaveSignal = {
      maybePpHash,
      from: this.cell.agentPubKey,
      payload: { type: SignalPayloadType.Notification, content: [notification, extra]}
    }
    return signal;
  }


  /** -- Misc. -- */

  /** */
  private threadName(pp: ParticipationProtocolMat): string {
    let threadTitle;
    if (pp.subject.typeName == "SemanticTopic") {
      const semTopic = this._allSemanticTopics[pp.subject.hash];
      threadTitle = `#${semTopic[0]}: ${pp.purpose}`;
    } else {
      threadTitle = `${pp.subject.hash}: ${pp.purpose}`;
    }
    return threadTitle;
  }


  /** Dump perspective as JSON */
  exportPerspective(/*originalsZvm: OriginalsZvm*/): string {
    /** allSubjects */
    const allSubjects: Map<AnyLinkableHashB64, SubjectMat> = new Map();
    Array.from(this._allSubjects.entries()).map(([subjectAh, subject]) => {
      //originalsZvm.createOriginal("Subject", subjectAh, null, true);
      return allSubjects.set(subjectAh, subject);
    });

    /** pps */
    const pps: Array<[ActionHashB64, ParticipationProtocolMat, Timestamp]> = new Array();
    Array.from(this._threads.entries()).map(([ppAh, thread]) => {
      //originalsZvm.createOriginal(ThreadsEntryType.ParticipationProtocol, ppAh, thread.author, true);
      return pps.push([ppAh, thread.pp, thread.creationTime]);
    });

    /** beads */
    const beads: Dictionary<[BeadInfoMat, TypedBeadMat]> = {};
    Object.entries(this._beads).map(([beadAh, [beadInfo, typed]]) => beads[beadAh] = materializedTypedBead(beadInfo, typed));

    /** Package */
    let perspMat: ThreadsPerspectiveMat = {
      emojiReactions: this._emojiReactions,
      allAppletIds: this._allAppletIds,
      allSubjects: Array.from(allSubjects.entries()),
      allSemanticTopics: this._allSemanticTopics,
      appletSubjectTypes: this._appletSubjectTypes,
      pps,
      beads,
    };
    //console.log("exportPerspective()", perspMat);
    return JSON.stringify(perspMat, null, 2);
  }


  /** */
  importPerspective(json: string, canPublish: boolean, mapping?: Object) {
    const external = JSON.parse(json) as ThreadsPerspectiveMat;

    if (canPublish) {
      /*await*/ this.publishAllFromPerspective(external);
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
    for (const [topicEh, [title, isHidden]] of Object.entries(external.allSemanticTopics)) {
      this.storeSemanticTopic(topicEh, title, isHidden, true);
    }
    /** this._allSubjects */
    for (const [subjectHash, subject] of Object.values(external.allSubjects)) {
      this._allSubjects.set(subjectHash, subject)
    }
    /** this._threads */
    for (const [ppAh, ppMat, creationTime] of Object.values(external.pps)) {
      this.storePp(ppAh, dematerializeParticipationProtocol(ppMat), creationTime, this.cell.agentPubKey, false, true, true);
    }
    /** this._beads */
    for (const [beadAh, [beadInfo, typedBead]] of Object.entries(external.beads)) {
      this.storeBead(beadAh, beadInfo.creationTime, beadInfo.author, dematerializedTypedBead(beadInfo, typedBead)[1], false, true);
    }
    /** this._emojiReactions */
    for (const [beadAh, pairs] of Object.entries(external.emojiReactions)) {
      if (!this._emojiReactions[beadAh]) {
        this._emojiReactions[beadAh] = [];
      }
      this._emojiReactions[beadAh] = this._emojiReactions[beadAh].concat(pairs);
    }
    /** Done */
    this.notifySubscribers();
  }


  /** */
  async publishAllFromPerspective(perspMat: ThreadsPerspectiveMat) {
    /** this._allSemanticTopics */
    for (const [_topicEh, [title, _isHidden]] of Object.entries(perspMat.allSemanticTopics)) {
      /* const newTopicEh = */ await this.publishSemanticTopic(title);
    }
    /** this._allSubjects */
    const ppAhs = perspMat.pps.map((tuple) => tuple[0]);
    const entryAsSubjects: Dictionary<ThreadsEntryType> = {};
    for (const [subjectHash, _subject] of Object.values(perspMat.allSubjects)) {
      if (ppAhs.includes(subjectHash)) {
        entryAsSubjects[subjectHash] = ThreadsEntryType.ParticipationProtocol;
        continue;
      }
      const maybeBeadPair = perspMat.beads[subjectHash];
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
    const sortedPps: [ActionHashB64, ParticipationProtocolMat, Timestamp][] = Object.values(perspMat.pps).sort(
      ([ppAhA, ppMatA, creationTimeA], [ppAhB, ppMatB, creationTimeB]) => {
        return creationTimeA - creationTimeB
      })
    const beadAhMapping: Record<ActionHashB64, ActionHashB64> = {}
    /* Sort beads so they can get their prev bead equivalent ah */
    const sortedBeads: [string, [BeadInfoMat, TypedBeadMat]][] = Object.entries(perspMat.beads).sort(
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
        const [pp_ah, _ts, _maybeNotif] = await this.zomeProxy.createParticipationProtocol(pp);
        const newPpAh = encodeHashToBase64(pp_ah);
        ppAhMapping[ppAh] = newPpAh;
        /* store pp */
        this.storePp(newPpAh, pp, creationTime, this.cell.agentPubKey, false, true, true);
      }
      // FIXME: use Promise.AllSettled();

      /* Threads */
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
        let prevKnownBeadAh;
        if (beadInfo.bead.prevKnownBeadAh) {
          const prevKnownBeadAh = beadAhMapping[beadInfo.bead.prevKnownBeadAh];
          if (!prevKnownBeadAh) {
            console.warn("PubImp() Missing prev Bead", beadInfo.bead.prevKnownBeadAh);
            continue;
          }
        }
        /* Determine typed bead content */
        let content: string | Hrl | EntryHashB64;
        switch(beadInfo.beadType) {
          case ThreadsEntryType.TextBead: content = (typedBead as TextBeadMat).value; break;
          case ThreadsEntryType.EntryBead: content = (typedBead as EntryBeadMat).sourceEh; break;
          case ThreadsEntryType.AnyBead:
            const typedAny = typedBead as TextBeadMat;
            content = decodeHrl(typedAny.value);
            break;
          default:
            console.warn("PubImp() Unknown bead type: " + beadInfo.beadType);
            continue;
            break;
        }
        /* Publish */
        const newPpAh = decodeHashFromBase64(ppAhMapping[beadInfo.bead.ppAh]);
        console.log(`PubImp() Bead newPpAh: ${ppAhMapping[beadInfo.bead.ppAh]}`);
        const nextBead: Bead = {ppAh: newPpAh, prevKnownBeadAh: prevKnownBeadAh? decodeHashFromBase64(prevKnownBeadAh) : undefined};
        const [newBeadAh, _global_time_anchor, _newTm] = await this.publishTypedBeadAt(beadInfo.beadType as BeadType, content, nextBead, beadInfo.creationTime, []);
        beadAhMapping[beadAh] = newBeadAh;
        console.log(`PubImp() Bead ${beadAh} -> ${newBeadAh}`);
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

    /** this._emojiReactions */
    for (const [beadAh, pairs] of Object.entries(perspMat.emojiReactions)) {
      for (const [author, emoji] of pairs) {
        if (!beadAhMapping[beadAh]) {
          console.warn("PubImp() Bead not found in mapping", beadAh);
          continue;
        }
        const bead_ah = decodeHashFromBase64(beadAhMapping[beadAh]);
        await this.zomeProxy.addReaction({bead_ah, from: decodeHashFromBase64(author), emoji});
        /*const succeeded =*/ await this.storeEmojiReaction(beadAh, author, emoji);
      }
    }
    /** other */
    await this.probeAllSubjects();
  }


  /** -- Debug -- */

  /** */
  async generateTestData(appletId: AppletId): Promise<void> {
    //const appletHash = decodeHashFromBase64(appletId);
    const hashs = await this.zomeProxy.getSubjectsForApplet(appletId);
    console.log("generateTestData(), subjects found", hashs.length)
    if (hashs.length > 0) {
        return;
    }
    console.log("*** generateTestData()", appletId);

    const top1 = await this.publishSemanticTopic("topic-many");
    const top11 = await this.publishSemanticTopic("topic-many");
    const top2 = await this.publishSemanticTopic("topic-1");
    const top3 = await this.publishSemanticTopic("topic-none");
    const top4 = await this.publishSemanticTopic("time-test");

    const [_ts1, th1, _pp1] = await this.publishThreadFromSemanticTopic(appletId, this.cell.dnaHash, top1, "general");
    console.log("*** generateTestData() general", th1);
    /*const th2 =*/ await this.publishThreadFromSemanticTopic(appletId, this.cell.dnaHash, top1, "none");

    /*const th4 =*/ await this.publishThreadFromSemanticTopic(appletId, this.cell.dnaHash, top1, "full");
    const th01 = await this.publishThreadFromSemanticTopic(appletId, this.cell.dnaHash, top2, "general")[1];
    //const th11 = await this.publishThreadFromSemanticTopic(top1, "general");

    const timeMin = await this.publishThreadFromSemanticTopic(appletId, this.cell.dnaHash, top4, "minute")[1];
    console.log("*** generateTestData() minute", timeMin);
    const timeHour = await this.publishThreadFromSemanticTopic(appletId, this.cell.dnaHash, top4, "hour")[1];
    const timeDay = await this.publishThreadFromSemanticTopic(appletId, this.cell.dnaHash, top4, "day")[1];
    const timeMon = await this.publishThreadFromSemanticTopic(appletId, this.cell.dnaHash, top4, "month")[1];
    //const timeYear = await this.publishThreadFromSemanticTopic(top4, "year");


    await this.publishTypedBead(ThreadsEntryType.TextBead, "m1", th01);

    await this.publishTypedBead(ThreadsEntryType.TextBead, "first", th1);
    await this.publishTypedBead(ThreadsEntryType.TextBead, "second", th1);
    await this.publishTypedBead(ThreadsEntryType.TextBead, "third", th1);

    //await this.publishManyDebug(timeMin, 60 * 1000, 200);
    await this.publishManyDebug(timeDay, 24 * 3600 * 1000, 42);
    //await this.publishManyDebug(timeMon, 12 * 24 * 3600 * 1000, 30);

    // await delay(60 * 1000);
    // Do zome calls for fun (performance test)
    // for (let i = 1; i <= 100; i++) {
    //   let dnaInfo = await this.zomeProxy.dnaInfo();
    //   console.log("dnaInfo", i, dnaInfo);
    // }


    // let begin = Date.now()
    // let n = 100;
    // await this.publishManyDebug(timeHour, 3600 * 1000, 100);
    // let end = Date.now()
    // let diff = (end - begin) / 1000;
    // console.log(`Publish timing for ${n} entries: ${diff} secs (${diff / n} secs / entry)`)

    console.log("*** generateTestData() - DONE");
  }


  /** */
  // async publishManyDebug(ppAh: ActionHashB64, interval: Timestamp, n?: number): Promise<void> {
  //   if (!n) {
  //     n = 40;
  //   }
  //   await this.publishManyTextMessageAt("message-" + n, ppAh, interval, n);
  // }

  /** */
  async publishManyDebug(ppAh: ActionHashB64, interval: Timestamp, n?: number): Promise<void> {
    let date_ms = Date.now();
    if (!n) {
      n = 40;
    }
    for (; n > 0; n -= 1) {
      const nextBead = await this.createNextBead(ppAh);
      await this.publishTypedBeadAt(ThreadsEntryType.TextBead, "" + interval / 1000 + "-message-" + n, nextBead, date_ms * 1000, [], true);
      date_ms -= interval;
    }
  }

}
