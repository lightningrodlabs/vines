import {
  Action,
  ActionHash,
  ActionHashB64,
  AgentPubKeyB64,
  decodeHashFromBase64, DnaHashB64,
  encodeHashToBase64, EntryHashB64, Timestamp,
} from "@holochain/client";
import {
  AnyBead,
  Bead,
  BeadLink, CreatePpInput, EntryBead,
  GetLatestBeadsInput, GlobalLastProbeLog, NotifiableEventType,
  ParticipationProtocol,
  SEMANTIC_TOPIC_TYPE_NAME,
  SignalPayloadType,
  Subject, TextBead,
  ThreadLastProbeLog,
  ThreadsEntryType, WeaveNotification, WeaveSignal,
} from "../bindings/threads.types";
import {ThreadsProxy} from "../bindings/threads.proxy";
import {delay, Dictionary, ZomeViewModel} from "@ddd-qc/lit-happ";
import {
  AnyLinkableHashB64, BeadInfo, BeadInfoMat, BeadLinkMaterialized, materializedTypedBead,
  materializeParticipationProtocol, materializeSubject,
  ParticipationProtocolMat, SubjectMat,
  ThreadsPerspective, ThreadsPerspectiveMat, TypedBead, TypedBeadMat,
} from "./threads.perspective";
import {Thread} from "./thread";
import {TimeInterval} from "./timeInterval";
import {AppletId, Hrl} from "@lightningrodlabs/we-applet";
import {prettyTimestamp} from "@ddd-qc/files";
import {encode} from "@msgpack/msgpack";
import {encodeHrl} from "../utils";
import {generateSearchTest, SearchParameters} from "../search";


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
  private _allSubjects: Map<AnyLinkableHashB64, Subject> = new Map();
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

  getSubject(subjectHash: AnyLinkableHashB64): Subject | undefined {
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
  searchTextMessages(parameters: SearchParameters): [ActionHashB64, BeadInfo, string][] {
    console.log("searchTextMessages()", parameters);

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
              console.log("searchTextMessages() has", keywordLC, textLC);
              return true;
            }
          }
        })
    }
    /** DONE */
    console.log("searchTextMessages() result", matchingTextBeads.length, matchingTextBeads);
    return matchingTextBeads;
  }


  /** TODO */
  async searchAndProbe(parameters: SearchParameters, limit: number): Promise<[ActionHashB64, BeadInfo, string][]> {
    console.log("searchAndProbe()", parameters);
    let result: [ActionHashB64, BeadInfo, string][] = [];

    /** Maybe initial search is enough */
    const initialResult = this.searchTextMessages(parameters);
    if (initialResult.length > limit) {
      return initialResult;
    }

    /** Full probe thread if possible */
    if (parameters.threadByName && this._threadsByName[parameters.threadByName]) {
      const ppAh = this._threadsByName[parameters.threadByName];
      await this.probeAllBeads(ppAh)
      result = this.searchTextMessages(parameters);
    } else {
      // TODO: progressive timeframe search
      /** Get beads on all threads within timeframe */
      for (const ppAh of this._threads.keys()) {
        await this.probeLatestBeads(ppAh, parameters.afterTs, parameters.beforeTs, limit);
      }
      result = this.searchTextMessages(parameters);
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
    for (const [ts, ah, pp] of tuples) {
      const ppAh = encodeHashToBase64(ah);
      this.storePp(encodeHashToBase64(ah), pp, ts, hiddens.includes(ppAh), false, true);
    }
    console.log("queryThreads()", this._threads.size);
    this.notifySubscribers();
  }


  /** Get all local beads */
  async queryBeads(): Promise<void> {
    const tmTuples = await this.zomeProxy.queryTextMessages() as unknown as [Timestamp, ActionHash, TypedBead][];
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
  async probeAllSubjects(): Promise<Map<AnyLinkableHashB64, Subject>> {
    const subjects = await this.zomeProxy.getAllSubjects();
    for (const subject of subjects) {
      this._allSubjects.set(encodeHashToBase64(subject.hash), subject);
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
      const [pp, ts] = await this.zomeProxy.getPp(pp_ah);
      this.storePp(ppAh, pp, ts, hiddens.includes(ppAh), false);
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
      const topicHash = thread.pp.subjectHash;
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
      const topicHash = thread.pp.subjectHash;
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
    this._emojiReactions[beadAh] = reactions.map(([key, emoji]) => [encodeHashToBase64(key), emoji]);
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
      this._emojiReactions[beadAh] = [];
    }
    const filtered = this._emojiReactions[beadAh].filter(([a, e]) => !(agent == a && e == emoji));
    if (filtered.length < this._emojiReactions[beadAh].length) {
      this._emojiReactions[beadAh] = filtered;
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


  /** Figure out last known bead for this thread */
  async checkForReply(ppAh: ActionHashB64): Promise<Bead> {
    let thread = this._threads.get(ppAh);
    if (!thread) {
      await this.fetchPp(ppAh);
      thread = this._threads.get(ppAh);
    }
    const lastKnownBeadOnThread = thread.getLast(1);
    let prevKnownBeadAh;
    if (lastKnownBeadOnThread && lastKnownBeadOnThread.length > 0) {
      prevKnownBeadAh = decodeHashFromBase64(lastKnownBeadOnThread[0].beadAh)
    }
    /** Make out bead */
    const bead: Bead = {
      ppAh: decodeHashFromBase64(ppAh),
      prevKnownBeadAh,
    }
    console.log("checkForReply() bead", prevKnownBeadAh? encodeHashToBase64(prevKnownBeadAh): undefined, ppAh);
    return bead;
  }


  /** -- Publish: Commit to source-chain (and possibly the DHT) and store it (async because the commit could fail) -- */

  /** Returns beadType & global_time_anchor */
  async publishHrlBead(hrl: Hrl, ppAh: ActionHashB64): Promise<[ActionHashB64, string, number, AnyBead]> {
    const creationTime = Date.now() * 1000;
    const [ah, global_time_anchor, anyBead] = await this.publishHrlBeadAt(hrl, ppAh, creationTime);
    return [ah, global_time_anchor, creationTime, anyBead];
  }

  /** Returns beadType & global_time_anchor */
  async publishEntryBead(eh: EntryHashB64, ppAh: ActionHashB64): Promise<[ActionHashB64, string, number, EntryBead]> {
    const creationTime = Date.now() * 1000;
    const [ah, global_time_anchor, entryBead] = await  this.publishEntryBeadAt(eh, ppAh, creationTime);
    return [ah, global_time_anchor, creationTime, entryBead];
  }


  /** */
  async publishHrlBeadAt(hrl: Hrl, ppAh: ActionHashB64, creationTime: Timestamp, dontStore?: boolean): Promise<[ActionHashB64, string, AnyBead]> {
    const encHrl = encodeHrl(hrl);
    const anyBead: AnyBead = {
      bead: await this.checkForReply(ppAh),
      value: encHrl,
      typeInfo: "hrl",
    }
    console.log("publishHrlBeadAt()", encHrl, anyBead);
    /** Add Bead */
    const [beadAh, global_time_anchor, _bucket_ts, maybeNotifPair] = await this.zomeProxy.addAnyBead(anyBead);
    console.log("publishHrlBeadAt() added bead", beadAh, creationTime);
    /** Insert in perspective */
    if (!dontStore) {
      this.fetchAnyBead(beadAh, true, creationTime);
    }
    /** Notify Reply asychronously */
    if (anyBead.bead.prevKnownBeadAh && maybeNotifPair) {
      const recipient = encodeHashToBase64(maybeNotifPair[0]);
      const extra = encode(anyBead);
      const signal = this.createNotificationSignal(maybeNotifPair[1], extra);
      console.log("publishHrlBeadAt() signaling notification to peer", recipient, (signal.payload.content[0] as WeaveNotification).event)
      /*await*/ this.notifyPeer(recipient, signal);
    }
    /** Done */
    return [encodeHashToBase64(beadAh), global_time_anchor, anyBead];
  }


  /** */
  async publishEntryBeadAt(eh: EntryHashB64, ppAh: ActionHashB64, creationTime: Timestamp, dontStore?: boolean): Promise<[ActionHashB64, string, EntryBead]> {
    const entryInfo = {
      eh: decodeHashFromBase64(eh),
      bead: await this.checkForReply(ppAh),
      zomeName: "zFiles", // FilesProxy.DEFAULT_ZOME_NAME,
      roleName: "rFiles", // FILES_CELL_NAME
    };
    /** Add Bead */
    const [beadAh, entryBead, global_time_anchor, bucket_ts, maybeNotifPair] = await this.zomeProxy.addEntryAsBead(entryInfo);
    console.log("publishEntryBeadAt() added bead", beadAh, creationTime);
    /** Insert in perspective */
    if (!dontStore) {
      this.fetchEntryBead(beadAh, true, creationTime);
    }
    /** Notify Reply asychronously */
    if (entryInfo.bead.prevKnownBeadAh && maybeNotifPair) {
      const recipient = encodeHashToBase64(maybeNotifPair[0]);
      const extra = encode(entryBead);
      const signal = this.createNotificationSignal(maybeNotifPair[1], extra);
      console.log("publishEntryBeadAt() signaling notification to peer", recipient, (signal.payload.content[0] as WeaveNotification).event)
      /*await*/ this.notifyPeer(recipient, signal);
    }
    /** Done */
    return [encodeHashToBase64(beadAh), global_time_anchor, entryBead];
  }


  /** */
  async publishTextMessageAt(msg: string, ppAh: ActionHashB64, creationTime: Timestamp, ments: AgentPubKeyB64[], dontStore?: boolean) : Promise<[ActionHashB64, string, TextBead]> {
    const bead = await this.checkForReply(ppAh);
    const mentionees = ments.map((m) => decodeHashFromBase64(m));
    /** Commit Entry */
    const texto: TextBead = {value: msg, bead}
    const [ah, global_time_anchor, notifPairs] = await this.zomeProxy.addTextMessageAtWithMentions({texto, creationTime, mentionees});
    const [_tmTs, _auth, tm] = await this.zomeProxy.getTextMessage(ah);
    // let replyTm;
    // if (tm.bead.maybeReplyOfAh) {
    //   const tuple = await this.zomeProxy.getTextMessage(tm.bead.maybeReplyOfAh);
    //   replyTm = tuple[2];
    // }
    // FIXME: assert links.length == mentionees.length
    //const [ah, global_time_anchor] = await this.zomeProxy.addTextMessageAt({texto, creationTime});
    const beadAh = encodeHashToBase64(ah)
    console.log("publishTextMessageAt() added bead", beadAh, creationTime);
    const beadLink: BeadLink = {creationTime, beadAh: ah, beadType: ThreadsEntryType.TextBead}
    /** Insert in ThreadInfo */
    if (!dontStore) {
      //await this.fetchBeads(protocolAh, [beadLink], TimeInterval.instant(beadLink.creationTime));
      await this.fetchTextMessage(beadLink.beadAh, true, creationTime);
    }
    /** Notify Mentions asychronously */
    for (const [recip, notif] of notifPairs) {
      const recipient = encodeHashToBase64(recip);
      const extra = encode(tm);
      const signal = this.createNotificationSignal(notif, extra);
      console.log("publishTextMessageAt() signaling notification to peer", recipient, (signal.payload.content[0] as WeaveNotification).event)
      /*await*/ this.notifyPeer(recipient, signal);
    }
    /** Done */
    return [encodeHashToBase64(ah), global_time_anchor, texto];
  }


  /** */
  async publishManyTextMessageAt(msg: string, protocolAh: ActionHashB64, intervalUs: Timestamp, count: number, dontStore?: boolean) : Promise<void> {
    /** Make out bead */
    const bead: Bead = {
      ppAh: decodeHashFromBase64(protocolAh)
    }
    /** Commit Entry */
    const texto = {value: msg, bead}
    const tuples = await this.zomeProxy.addManyTextMessageAt({texto, intervalUs, count});
    for (const [ah, _global_time_anchor, _indexTime] of tuples) {
      const beadLink: BeadLink = {creationTime: intervalUs, beadAh: ah, beadType: ThreadsEntryType.TextBead}
      /** Insert in ThreadInfo */
      if (!dontStore) {
        await this.fetchBeads(protocolAh, [beadLink], TimeInterval.instant(beadLink.creationTime));
      }
    }
  }


  /** */
  async publishTextMessage(msg: string, ppAh: ActionHashB64, ments?: AgentPubKeyB64[]) : Promise<[ActionHashB64, string, number, TextBead]> {
    const creation_time = Date.now() * 1000
    const [ah, global_time_anchor, tm] = await this.publishTextMessageAt(msg, ppAh, creation_time, ments? ments : []);
    return [ah, global_time_anchor, creation_time, tm];
  }


  /** */
  async publishSemanticTopic(title: string) : Promise<EntryHashB64> {
    const eh = await this.zomeProxy.createSemanticTopic({title});
    const ehB64 = encodeHashToBase64(eh);
    this.storeSemanticTopic(ehB64, title, false, false);
    console.log("publishSemanticTopic()", title, ehB64);
    console.log("publishSemanticTopic()", this._allSemanticTopics);
    /** Done */
    this.notifySubscribers();
    return ehB64;
  }


  /** */
  async publishParticipationProtocol(input: CreatePpInput): Promise<[ActionHashB64, ParticipationProtocolMat]> {
    const [pp_ah, ts, maybeNotifPair] = await this.zomeProxy.createParticipationProtocol(input);
    /** Notify subject author */
    if (maybeNotifPair) {
      const recipient = encodeHashToBase64(maybeNotifPair[0]);
      const extra = encode(input.pp);
      const signal = this.createNotificationSignal(maybeNotifPair[1], extra);
      console.log("publishParticipationProtocol() signaling notification to peer", recipient, (signal.payload.content[0] as WeaveNotification).event)
      /*await*/ this.notifyPeer(recipient, signal);
    }
    /** Store PP */
    const ppAh = encodeHashToBase64(pp_ah);
    const [pp, _ts2] = await this.zomeProxy.getPp(pp_ah);
    const ppMat = this.storePp(ppAh, pp, ts, false, false);
    /** */
    return [ppAh, ppMat];
  }


    /** */
  async publishThreadFromSemanticTopic(appletId: AppletId, dnaHash: DnaHashB64, subjectHash: AnyLinkableHashB64, purpose: string): Promise<[number, ActionHashB64, ParticipationProtocol]> {
    console.log("publishThreadFromSemanticTopic()", appletId);
    const pp: ParticipationProtocol = {
      purpose,
      subjectHash: decodeHashFromBase64(subjectHash),
      rules: "FFA",
      subjectType: SEMANTIC_TOPIC_TYPE_NAME,
    }
    const [pp_ah, ts, _maybeNotif] = await this.zomeProxy.createParticipationProtocol({
      pp,
      //appletHash: decodeHashFromBase64(appletId),
      appletId,
      dnaHash: decodeHashFromBase64(dnaHash),
    });
    const ppAh = encodeHashToBase64(pp_ah);
    this.storePp(ppAh, pp, ts, false, false);
    /** */
    return [ts, ppAh, pp];
  }



  /** -- Fetch: Grab an entry from the DHT and store it (async) -- */

  /** */
  async fetchPp(ppAh: ActionHashB64, preventNotify?: boolean): Promise<ParticipationProtocolMat> {
    const [pp, ts] = await this.zomeProxy.getPp(decodeHashFromBase64(ppAh));
    if (pp === null) {
      Promise.reject("ParticipationProtocol not found at " + ppAh)
    }
    const isHidden = await this.zomeProxy.getHideLink(decodeHashFromBase64(ppAh));
    const ppMat = this.storePp(ppAh, pp, ts, isHidden != null, false, preventNotify);
    return ppMat;
  }


  /** */
  async fetchTextMessage(beadAh: ActionHash, canNotify: boolean, alternateCreationTime?: Timestamp): Promise<string> {
    try {
      const [creationTime, author, tm] = await this.zomeProxy.getTextMessage(beadAh);
      const ts = alternateCreationTime? alternateCreationTime : creationTime;
      //console.log("fetchTextMessage", ts);
      await this.storeBead(encodeHashToBase64(beadAh), ts, encodeHashToBase64(author), tm, canNotify, false);
      return tm.value;
    } catch(e) {
      console.error(e);
      Promise.reject("TextBead not found at " + encodeHashToBase64(beadAh));
    }
  }


  /** */
  async fetchEntryBead(beadAh: ActionHash, canNotify: boolean, alternateCreationTime?: Timestamp): Promise<EntryBead> {
    try {
      const [creationTime, author, entryBead] = await this.zomeProxy.getEntryBead(beadAh);
      const ts = alternateCreationTime? alternateCreationTime : creationTime;
      //console.log("fetchTextMessage", ts);
      await this.storeBead(encodeHashToBase64(beadAh), ts, encodeHashToBase64(author), entryBead, canNotify, false);
      return entryBead;
    } catch(e) {
      console.error(e);
      Promise.reject("EntryBead not found at " + encodeHashToBase64(beadAh));
    }
  }


  /** */
  async fetchAnyBead(beadAh: ActionHash, canNotify: boolean, alternateCreationTime?: Timestamp): Promise<AnyBead> {
    try {
      const [creationTime, author, anyBead] = await this.zomeProxy.getAnyBead(beadAh);
      const ts = alternateCreationTime? alternateCreationTime : creationTime;
      //console.log("fetchTextMessage", ts);
      await this.storeBead(encodeHashToBase64(beadAh), ts, encodeHashToBase64(author), anyBead, canNotify, false);
      return anyBead;
    } catch(e) {
      console.error(e);
      Promise.reject("AnyBead not found at " + encodeHashToBase64(beadAh));
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
      if (bl.beadType == ThreadsEntryType.TextBead) {
        await this.fetchTextMessage(bl.beadAh, false, bl.creationTime);
      } else {
        if (bl.beadType == ThreadsEntryType.EntryBead) {
          await this.fetchEntryBead(bl.beadAh, false, bl.creationTime);
        } else {
          await this.fetchAnyBead(bl.beadAh, false, bl.creationTime);
        }
      }
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
  storePp(ppAh: ActionHashB64, pp: ParticipationProtocol, creationTime: Timestamp, isHidden: boolean, isNew: boolean, preventNotify?: boolean): ParticipationProtocolMat {
    if (this._threads.has(ppAh)) {
      /** Return already stored PP */
      return this._threads.get(ppAh).pp;
    }

    let ppMat = materializeParticipationProtocol(pp);
    const threadName = this.threadName(ppMat);
    const thread = new Thread(ppMat, this.cell.dnaModifiers.origin_time, creationTime, threadName);
    thread.setIsHidden(isHidden);
    console.log(`storePp() thread "${ppAh}" for subject "${ppMat.subjectHash}"| creationTime: "`, creationTime, isHidden);
    this._threads.set(ppAh, thread);
    /** threadsByName */
    this._threadsByName[threadName] = ppAh;
    /** threadsPerSubject */
    if (!this._threadsPerSubject[ppMat.subjectHash]) {
      this._threadsPerSubject[ppMat.subjectHash] = [];
    }
    this._threadsPerSubject[ppMat.subjectHash].push(ppAh);
    if (isNew) {
      this._newThreads.push(ppAh);
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
    if (pp.subjectType == "SemanticTopic") {
      const semTopic = this._allSemanticTopics[pp.subjectHash];
      threadTitle = `#${semTopic[0]}: ${pp.purpose}`;
    } else {
      threadTitle = `${pp.subjectType}: ${pp.purpose}`;
    }
    return threadTitle;
  }


  /** Dump perspective as JSON */
  exportPerspective(): string {
    /** allSubjects */
    const allSubjects: Map<AnyLinkableHashB64, SubjectMat> = new Map();
    Array.from(this._allSubjects.entries()).map(([subjectAh, subject]) => allSubjects.set(subjectAh, materializeSubject(subject)));

    /** pps */
    const pps: Array<[ActionHashB64, ParticipationProtocolMat]> = new Array();
    Array.from(this._threads.entries()).map(([ppAh, thread]) => pps.push([ppAh, thread.pp]));

    /** beads */
    const beads: Dictionary<[BeadInfoMat, TypedBeadMat]> = {};
    Object.entries(this._beads).map(([beadAh, [beadInfo, typed]]) => beads[beadAh] = materializedTypedBead(beadInfo, typed));

    /** Package */
    let perspMat: ThreadsPerspectiveMat = {
      allAppletIds: this._allAppletIds,
      allSubjects: Array.from(allSubjects.entries()),
      appletSubjectTypes: this._appletSubjectTypes,
      allSemanticTopics: this._allSemanticTopics,
      pps,
      beads,
      emojiReactions: this._emojiReactions,
    };
    //console.log("exportPerspective()", perspMat);
    return JSON.stringify(perspMat, null, 2);
  }


  /** */
  importPerspective(json: string) {
    const perspective = JSON.parse(json);
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


    await this.publishTextMessage("m1", th01);

    await this.publishTextMessage("first", th1);
    await this.publishTextMessage("second", th1);
    await this.publishTextMessage("third", th1);

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
      await this.publishTextMessageAt("" + interval / 1000 + "-message-" + n, ppAh, date_ms * 1000, [], true);
      date_ms -= interval;
    }
  }

}
