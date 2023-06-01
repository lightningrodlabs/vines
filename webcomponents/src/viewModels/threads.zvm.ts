import {
  ActionHash,
  ActionHashB64,
  AgentPubKeyB64,
  decodeHashFromBase64, DnaHashB64,
  encodeHashToBase64, EntryHashB64, Timestamp,
} from "@holochain/client";
import {
  Bead,
  BeadLink, CreatePpInput,
  GetLatestBeadsInput,
  GlobalLastSearchLog,
  ParticipationProtocol,
  SEMANTIC_TOPIC_TYPE_NAME,
  SignalPayload,
  Subject,
  TextMessage,
  ThreadLastSearchLog,
  ThreadsEntryType,
} from "../bindings/threads.types";
import {ThreadsProxy} from "../bindings/threads.proxy";
import {delay, Dictionary, ZomeViewModel} from "@ddd-qc/lit-happ";
import {
  AnyLinkableHashB64, BeadLinkMaterialized, HOLOCHAIN_EPOCH,
  materializeParticipationProtocol,
  ParticipationProtocolMat,
  TextMessageInfo,
  ThreadsPerspective
} from "./threads.perspective";
import {Thread} from "./thread";
import {TimeInterval} from "./timeInterval";



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
    let hasChanged = true; // FIXME
    return hasChanged;
  }


  /** -- Perspective -- */

  /* */
  get perspective(): ThreadsPerspective {
    return {
      allSubjects: this._allSubjects,
      allSemanticTopics: this._allSemanticTopics,
      //allParticipationProtocols: this._allParticipationProtocols,
      threadsPerSubject: this._threadsPerSubject,
      threads: this._threads,
      textMessages: this._textMessages,

      dnaSubjectTypes: this._dnaSubjectTypes,
      subjectsPerType: this._subjectsPerType,

      globalSearchLog: this._globalSearchLog,
      newSubjects: this._newSubjects,
      unreadSubjects: this._unreadSubjects,
      newThreads: this._newThreads,
      unreadThreads: this._unreadThreads,
    };
  }

  /** ah -> Subject */
  private _allSubjects: Dictionary<Subject> = {};
  /** ah -> SemanticTopic */
  private _allSemanticTopics: Dictionary<string> = {};
  ///** ah -> ParticipationProtocol */
  //private _allParticipationProtocols: Dictionary<ParticipationProtocolMat> = {};
  /** ah -> TextMessageInfo */
  private _textMessages: Dictionary<TextMessageInfo> = {};
  /** lh -> ppAhs */
  private _threadsPerSubject: Dictionary<ActionHashB64[]> = {};
  /** ppAh -> Thread */
  private _threads: Dictionary<Thread> = {};

  /**  -- Dna threads  -- */
  /** DnaHash -> subjectType[] */
  private _dnaSubjectTypes: Dictionary<Dictionary<string>> = {}
  /** DnaHash -> SubjectType -> subjectHash[] */
  private _subjectsPerType: Dictionary<AnyLinkableHashB64[]> = {}


  /** */
  private _globalSearchLog?: GlobalLastSearchLog;
  /** New & Unreads */
  private _newSubjects: Dictionary<[ActionHash, Timestamp][]> = {};
  private _unreadSubjects: AnyLinkableHashB64[] = [];
  private _newThreads: ActionHashB64[] = [];
  private _unreadThreads: ActionHashB64[] = [];

  /** -- Get: Return a stored element -- */

  getSubject(ah: ActionHashB64): Subject | undefined {
    return this._allSubjects[ah];
  }

  getSemanticTopic(ah: ActionHashB64): string | undefined {
    return this._allSemanticTopics[ah];
  }

  getParticipationProtocol(ah: ActionHashB64): ParticipationProtocolMat | undefined {
    const thread = this._threads[ah];
    if (!thread) {
      return undefined;
    }
    return this._threads[ah].pp;
  }

  getThread(ppAh: ActionHashB64): Thread | undefined {
    return this._threads[ppAh];
  }

  getSubjectType(dnaHash: DnaHashB64, pathHash: EntryHashB64): string | undefined {
    const typesForDna = this._dnaSubjectTypes[dnaHash];
    if (!typesForDna) {
      return undefined;
    }
    return typesForDna[pathHash];
  }

  getSubjectTypes(h: DnaHashB64): Dictionary<string> | undefined {
    return this._dnaSubjectTypes[h];
  }

  getSubjects(pathHash: EntryHashB64): AnyLinkableHashB64[] | undefined {
    return this._subjectsPerType[pathHash];
  }


  /** */
  getMostRecentTextMessages(pp_ah: ActionHashB64): TextMessageInfo[] {
    const threadInfo = this._threads[pp_ah];
    if (!threadInfo) {
      return [];
    }
    const bead_ahs = threadInfo.getLast(10).map((bl) => bl.beadAh);
    const infos = bead_ahs.map((ah) => this._textMessages[ah]);
    //FIXME tuples.sort((a, b) => {return 1})
    return infos;
  }


  /** */
  getAllTextMessages(pp_ah: ActionHashB64): TextMessageInfo[] {
    const threadInfo = this._threads[pp_ah];
    if (!threadInfo) {
      return [];
    }
    const bead_ahs = threadInfo.getAll().map((bl) => bl.beadAh);
    const infos = bead_ahs.map((ah) => this._textMessages[ah]);
    //FIXME tuples.sort((a, b) => {return 1})
    return infos;
  }


  /** */
  hasReachedBeginning(ppAh: ActionHashB64): boolean {
    return this._threads[ppAh].beginningOfTime != undefined;
  }


  /** */
  getCommentThreadForSubject(subject: AnyLinkableHashB64): ActionHashB64 | null {
    const ppAhs = this._threadsPerSubject[subject];
    if (!ppAhs) {
      return null;
    }
    for (const ppAh of ppAhs) {
      const thread = this.getThread(ppAh);
      if (thread && thread.pp.purpose == "comment") {
        return ppAh;
      }
    }
    return null;
  }


  /** -- Init -- */

  /** Query all entries from local source-chain */
  async initializePerspectiveOffline(): Promise<void> {
    //await delay(1000);
    await this.querySemanticTopics();
    await this.queryThreads();
    await this.queryTextMessages();
    await this.querySearchLogs();

    this.notifySubscribers(); // check if this is useful
  }


  /** */
  async initializePerspectiveOnline(): Promise<void> {
    /** Grab all semantic topics to see if there are new ones */
    await this.probeSemanticTopics();
    /** Grab all threads of SemanticTopics to see if there are new ones */
    let probes = []
    for (const topicAh of Object.keys(this._allSemanticTopics)) {
      probes.push(this.probeThreads(topicAh));
    }
    await Promise.all(probes);
    /** Get last elements since last time (global search log) */
    await this.probeAllLatest()
  }


  /** -- Query: Query the local source-chain, and store the results (async) -- */

  /** */
  private async querySearchLogs(): Promise<void> {
    /** Global Log */
    this._globalSearchLog = await this.zomeProxy.getGlobalLog();
    /** Thread logs */
    const threadLogs = await this.zomeProxy.queryThreadLogs();
    for (const threadLog of threadLogs) {
      const ppAhB64 = encodeHashToBase64(threadLog.ppAh)
      if (!this._threads[ppAhB64]) {
        this._threads[ppAhB64] = new Thread();
      }
      //this._threads[ppAhB64].setCreationTime(creationTime);
      this._threads[ppAhB64].setLatestSearchLogTime(threadLog.time);
    }
  }


  /** Get all SemanticTopics from the RootAnchor */
  private async querySemanticTopics(): Promise<Dictionary<string>> {
    const tuples = await this.zomeProxy.querySemanticTopics();
    for (const [_ts, eh, st] of tuples) {
      this.storeSemanticTopic(encodeHashToBase64(eh), st.title);
    }
    console.log("querySemanticTopics()", Object.keys(this._allSemanticTopics).length);
    return this._allSemanticTopics;
  }


  /** Get all Threads from a subject */
  async queryThreads(): Promise<void> {
    const tuples = await this.zomeProxy.queryPps();
    for (const [ts, ah, pp] of tuples) {
      this.storePp(encodeHashToBase64(ah), pp, ts);
    }
    console.log("queryThreads()", Object.keys(this._threads).length);
  }


  /** Get all beads from a thread */
  async queryTextMessages(): Promise<void> {
    const tuples = await this.zomeProxy.queryTextMessages();
    for (const [ts, ah, tm] of tuples) {
      this.storeTextMessage(encodeHashToBase64(ah), ts, this.cell.agentPubKey, tm, false);
    }
    console.log("queryThreads()", Object.keys(this._threads).length);
  }


  /** -- Probe: Query the DHT, and store the results (async) -- */

  /** */
  probeAllInner() {
    /* await */ this.initializePerspectiveOnline();
  }


  /** Get all Subjects from the RootAnchor */
  async probeAllSubjects(): Promise<Dictionary<Subject>> {
    const subjects = await this.zomeProxy.getAllSubjects();
    for (const subject of subjects) {
      this._allSubjects[encodeHashToBase64(subject.hash)] = subject
    }
    console.log("probeAllSubjects()", Object.keys(this._allSubjects).length);
    this.notifySubscribers();
    return this._allSubjects;
  }
  // TODO: probeDnaSubjects()
  // TODO: probeEntryTypeSubjects()


  /** Get all SemanticTopics from the RootAnchor */
  async probeSemanticTopics(): Promise<Dictionary<string>> {
    const sts = await this.zomeProxy.getAllSemanticTopics();
    for (const tuple of sts) {
      this.storeSemanticTopic(encodeHashToBase64(tuple[0]), tuple[1]);
    }
    console.log("probeSemanticTopics()", Object.keys(this._allSemanticTopics).length);
    return this._allSemanticTopics;
  }


  /** Get all Threads from a subject */
  async probeThreads(subjectHash: AnyLinkableHashB64): Promise<Dictionary<ParticipationProtocol>> {
    let res = {};
    const pps = await this.zomeProxy.getPpsFromSubjectHash(decodeHashFromBase64(subjectHash));
    // FIXME resolve promise all at once
    for (const [ppAh, _linkTs] of pps) {
      const ahB64 = encodeHashToBase64(ppAh);
      const [pp, ts] = await this.zomeProxy.getPp(ppAh);
      this.storePp(ahB64, pp, ts);
      res[ahB64] = pp;
    }
    return res;
  }


  /** Get all SubjectTypes for a DNA */
  async probeSubjectTypes(dnaHash: DnaHashB64): Promise<Dictionary<string>> {
    let subjectTypesRaw = await this.zomeProxy.getSubjectTypesForDna(decodeHashFromBase64(dnaHash));
    let subjectTypes: Dictionary<string> = {}//subjectTypesRaw.map(([st, hash]) => [st, encodeHashToBase64(hash)]);
    console.log("probeSubjectTypes()", subjectTypes);
    for (const [subjectType, pathHash] of subjectTypesRaw) {
      subjectTypes[encodeHashToBase64(pathHash)] = subjectType;
    }
    this._dnaSubjectTypes[dnaHash] = subjectTypes;
    return subjectTypes;
  }


  /** Get all subjects from a subjectType path */
  async probeSubjects(dnaHash: DnaHashB64, pathHash: EntryHashB64): Promise<AnyLinkableHashB64[]> {
    if (!this._dnaSubjectTypes[dnaHash] || !Object.keys(this._dnaSubjectTypes[dnaHash]).includes(pathHash)) {
      return Promise.reject("Unknown pathHash for dnaHash");
    }
    const subjectType = this.getSubjectType(dnaHash, pathHash);
    const subjects = await this.zomeProxy.getSubjectsByType({dnaHash: decodeHashFromBase64(dnaHash), subjectType});
    const subjectB64s = subjects.map((subject) => encodeHashToBase64(subject));
    this._subjectsPerType[pathHash] = subjectB64s;
    return subjectB64s;
  }


  /** */
  async probeAllLatest(): Promise<void> {
    const latest = await this.zomeProxy.probeAllLatest(this._globalSearchLog.time);
    const newThreads = latest.newThreadsBySubject.map(([_topicHash, ppAh]) => encodeHashToBase64(ppAh));
    const unreadThreads = latest.newBeadsByThread.map(([ppAh, _bl]) => encodeHashToBase64(ppAh));
    let unreadSubjects = latest.newThreadsBySubject.map(([topicHash, _ppAh]) => encodeHashToBase64(topicHash));
    /** Store oldest thread per subject */
    const oldestNewThreadBySubject: Dictionary<Timestamp> = {};

    /** Also mark subject as unread if it has an unread thread */
    for (const ppAh of unreadThreads) {
      const thread = this._threads[ppAh];
      if (!thread) {
        console.error("Found new thread for an unknown subject")
      }
      const topicHash = thread.pp.subjectHash;
      unreadSubjects.push(topicHash);
    }
    /** Dedup */
    unreadSubjects = [...new Set(unreadSubjects)];
    /** Store subject's oldest 'new' thread time for each new thread */
    for (const ppAh of newThreads) {
      const thread = this._threads[ppAh];
      if (!thread) {
        console.error("Found new thread for an unknown subject")
      }
      const topicHash = thread.pp.subjectHash;
      if (!oldestNewThreadBySubject[topicHash] || thread.creationTime < oldestNewThreadBySubject[topicHash]) {
        oldestNewThreadBySubject[topicHash] = thread.creationTime;
      }
    }

    /** Figure out if subjects are new: it's new if there are no older threads than the new ones found */
    //console.log("oldestThreadTimeBySubject", oldestThreadTimeBySubject);
    let newSubjects = {};
    for (const [subjectHash, oldestNewThreadTime] of Object.entries(oldestNewThreadBySubject)) {
      const pps = await this.zomeProxy.getPpsFromSubjectHash(decodeHashFromBase64(subjectHash));
      //console.log(`Subject "${subjectHash}" oldestNewThreadBySubject: `, new Date(oldestNewThreadTime / 1000), oldestNewThreadTime)
      newSubjects[subjectHash] = pps.map(([ppAh, ts]) => [encodeHashToBase64(ppAh), ts]);
      for (const [ppAh, ppCreationTime] of pps) {
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


  /** Get all beads from a thread */
  async probeAllBeads(ppAhB64: ActionHashB64): Promise<BeadLink[]> {
    console.log("probeAllBeads()", ppAhB64)

    if (ppAhB64.length == 0) {
      console.warn("probeAllBeads() Failed. ppAh not provided.")
      return [];
    }
    /** Probe */
    const [interval, beadLinks] = await this.zomeProxy.getAllBeads(decodeHashFromBase64(ppAhB64));
    console.log("probeAllBeads()", TimeInterval.new(interval).toStringSec(), beadLinks)
    /** Store */
    await this.fetchBeads(ppAhB64, beadLinks, TimeInterval.new(interval));
    if (this._threads[ppAhB64]) {
      this._threads[ppAhB64].setBeginningOfTime();
    }
    /** Done */
    return beadLinks;
  }


  /** Get all beads from "now" and back until `limit` is reached or `startTime` is reached */
  async probeLatestBeads(input: GetLatestBeadsInput): Promise<BeadLink[]> {
    console.log("probeLatestBeads()", input);
    if (input.ppAh.length == 0) {
      console.error("probeLatestBeads() Failed. ppAh not provided.")
    }
    /** Probe the latest beads */
    const [searchedInterval, beadLinks] = await this.zomeProxy.getLatestBeads(input);
    /** Cache them */
    const ppAhB64 = encodeHashToBase64(input.ppAh);
    await this.fetchBeads(ppAhB64, beadLinks, TimeInterval.new(searchedInterval));
    /** Check if beginning of time reached */
    console.log("BeginningOfTime", searchedInterval, HOLOCHAIN_EPOCH);
    if (searchedInterval.begin <= HOLOCHAIN_EPOCH) {
      if (!this._threads[ppAhB64]) {
        this._threads[ppAhB64] = new Thread();
      }
      this._threads[ppAhB64].setBeginningOfTime();
      console.log("BeginningOfTime reached for", ppAhB64, this._threads[ppAhB64].beginningOfTime);
    }
    /** Done */
    return beadLinks;
  }


  /** Try to get older beads from the currently known oldest bead of a thread */
  async probePreviousBeads(ppAh: ActionHashB64, limit: number): Promise<BeadLink[]> {
    // if (this.reachedBeginning(ppAh)) {
    //   return [];
    // }
    const thread = this._threads[ppAh];
    if (!thread) {
      return Promise.reject("No Thread data found for given ParticipationProtocol")
    }
    // const oldestTime = thread.beadLinksTree.begin.key;
    const oldestTime = thread.searchedUnion.begin;
    let query: GetLatestBeadsInput = {
      ppAh: decodeHashFromBase64(ppAh),
      targetLimit: limit,
      endTime: oldestTime? oldestTime : Date.now() * 1000,
    };
    return this.probeLatestBeads(query);
  }



  /** -- Publish: Commit to source-chain (and possibly the DHT) and store it (async because the commit could fail) -- */

  /** */
  async publishTextMessage(msg: string, ppAh: ActionHashB64) : Promise<[ActionHashB64, string]> {
    return this.publishTextMessageAt(msg, ppAh, Date.now() * 1000);
  }


  /** */
  async publishTextMessageAt(msg: string, protocolAh: ActionHashB64, creationTime: Timestamp, dontStore?: boolean) : Promise<[ActionHashB64, string]> {
    /** Make out bead */
    const bead: Bead = {
      forProtocolAh: decodeHashFromBase64(protocolAh)
    }
    /** Commit Entry */
    const texto = {value: msg, bead}
    const [ah, global_time_anchor] = await this.zomeProxy.addTextMessageAt({texto, creationTime});
    //console.log("publishTextMessageAt() added bead", encodeHashToBase64(ah), creationTime);
    const beadLink: BeadLink = {creationTime, beadAh: ah, beadType: "TextMessage"}
    /** Insert in ThreadInfo */
    if (!dontStore) {
      //await this.fetchBeads(protocolAh, [beadLink], TimeInterval.instant(beadLink.creationTime));
      await this.fetchTextMessage(beadLink.beadAh, true, creationTime);
    }
    /** Done */
    return [encodeHashToBase64(ah), global_time_anchor];
  }


  /** */
  async publishManyTextMessageAt(msg: string, protocolAh: ActionHashB64, intervalUs: Timestamp, count: number, dontStore?: boolean) : Promise<void> {
    /** Make out bead */
    const bead: Bead = {
      forProtocolAh: decodeHashFromBase64(protocolAh)
    }
    /** Commit Entry */
    const texto = {value: msg, bead}
    const tuples = await this.zomeProxy.addManyTextMessageAt({texto, intervalUs, count});
    for (const [ah, _global_time_anchor, _indexTime] of tuples) {
      const beadLink: BeadLink = {creationTime: intervalUs, beadAh: ah, beadType: "TextMessage"}
      /** Insert in ThreadInfo */
      if (!dontStore) {
        await this.fetchBeads(protocolAh, [beadLink], TimeInterval.instant(beadLink.creationTime));
      }
    }
  }


  /** */
  async publishSemanticTopic(title: string) : Promise<EntryHashB64> {
    const eh = await this.zomeProxy.createSemanticTopic({title});
    const ehB64 = encodeHashToBase64(eh);
    this.storeSemanticTopic(ehB64, title);
    console.log("publishSemanticTopic()", title,ehB64);
    console.log("publishSemanticTopic()", this._allSemanticTopics);

    this.notifySubscribers();
    return ehB64;
  }


  async publishParticipationProtocol(input: CreatePpInput): Promise<[ActionHashB64, ParticipationProtocolMat]> {
    const [ppAh, ts] = await this.zomeProxy.createParticipationProtocol(input);
    const ppAhB64 = encodeHashToBase64(ppAh);
    const [pp, _ts2] = await this.zomeProxy.getPp(ppAh);
    const ppMat = this.storePp(ppAhB64, pp, ts);
    return [ppAhB64, ppMat];
  }


    /** */
  async publishThreadFromSemanticTopic(subjectHash: AnyLinkableHashB64, purpose: string) : Promise<ActionHashB64> {
    const pp: ParticipationProtocol = {
      purpose,
      subjectHash: decodeHashFromBase64(subjectHash),
      rules: "FFA",
      subjectType: SEMANTIC_TOPIC_TYPE_NAME,
    }
    const [ah, ts] = await this.zomeProxy.createPpFromSemanticTopic(pp);
    const ahB64 = encodeHashToBase64(ah);
    this.storePp(ahB64, pp, ts);
    return ahB64;
  }



  /** -- Fetch: Grab an entry from the DHT and store it (async) -- */

  /** */
  async fetchPp(ppAh: ActionHashB64): Promise<ParticipationProtocolMat> {
    const [pp, ts] = await this.zomeProxy.getPp(decodeHashFromBase64(ppAh));
    if (pp === null) {
      Promise.reject("ParticipationProtocol not found at " + ppAh)
    }
    const ppMat = this.storePp(ppAh, pp, ts);
    return ppMat;
  }


  /** */
  async fetchTextMessage(beadAh: ActionHash, canNotify: boolean, alternateCreationTime?: Timestamp): Promise<string> {
    try {
      const [creationTime, author, tm] = await this.zomeProxy.getTextMessage(beadAh);
      const ts = alternateCreationTime? alternateCreationTime : creationTime;
      //console.log("fetchTextMessage", ts);
      this.storeTextMessage(encodeHashToBase64(beadAh), ts, encodeHashToBase64(author), tm, canNotify);
      return tm.value;
    } catch(e) {
      console.error(e);
      Promise.reject("TextMessage not found at " + encodeHashToBase64(beadAh));
    }
  }


  /** */
  private async fetchBeads(ppAhB64: ActionHashB64, beadLinks: BeadLink[], searchedInterval: TimeInterval): Promise<void> {
    //console.log("fetchBeads() len = ", beadLinks.length, searchedInterval);
    if (beadLinks.length == 0) {
      return;
    }
    /** fetch each TextMessage */
    for (const bl of beadLinks) {
      //console.log("fetchBeads()", bl.t)
      await this.fetchTextMessage(bl.beadAh, false, bl.creationTime);
    }
    this._threads[ppAhB64].addSearchedInterval(searchedInterval);
    this.notifySubscribers();
  }



  /** -- Store: Cache & index a materialized entry, and notify subscribers -- */

  /** */
  storeSemanticTopic(eh: EntryHashB64, title: string): void {
    this._allSemanticTopics[eh] = title;
    this.notifySubscribers();
  }


  /** */
  storePp(ppAh: ActionHashB64, pp: ParticipationProtocol, creationTime: Timestamp): ParticipationProtocolMat {
    let thread = this._threads[ppAh]
    if (!thread) {
      thread = new Thread();
    } else {
      if (thread.pp) {
        return thread.pp;
      }
    }
    thread.setCreationTime(creationTime);
    let ppMat = materializeParticipationProtocol(pp);
    thread.setPp(ppMat);
    console.log(`storePp() thread "${ppAh}" fro subject "${ppMat.subjectHash}"| creationTime: "`, creationTime);
    this._threads[ppAh] = thread;
    if (!this._threadsPerSubject[ppMat.subjectHash]) {
      this._threadsPerSubject[ppMat.subjectHash] = [];
    }
    this._threadsPerSubject[ppMat.subjectHash].push(ppAh);
    //console.log("storePp()", ppMat.subjectHash, ppAh)
    this.notifySubscribers();
    return ppMat;
  }


  /** */
  storeTextMessage(beadAh: ActionHashB64, creationTime: Timestamp, author: AgentPubKeyB64, tm: TextMessage, canNotify: boolean): void {
    if (this._textMessages[beadAh]) {
      return;
    }
    /* Store TextMessage */
    this._textMessages[beadAh] = {
      creationTime,
      author,
      message: tm.value,
    };
    /* Store Bead in its Thread */
    const ppAh = encodeHashToBase64(tm.bead.forProtocolAh);
    if (!this._threads[ppAh]) {
      this._threads[ppAh] = new Thread();
    }
    const blMat: BeadLinkMaterialized = {creationTime, beadAh, beadType: ThreadsEntryType.TextMessage};
    this._threads[ppAh].addItem(blMat);
    /* Done */
    if (canNotify) {
      this.notifySubscribers();
    }
  }


  /** -- commit search logs -- */


  getLatestThread(): [ActionHashB64, Thread] | undefined {
    let res = undefined;
    for (const [ah, thread] of Object.entries(this._threads)) {
      if (!res || thread.creationTime > res.creationTime) {
        res = [ah, thread];
      }
    }
    return res;
  }


  /** */
  async commitSearchLogs(): Promise<void> {
    /** Commit Global Log */
    const maybeLatest = this.getLatestThread();
    let latestGlobalLogTime = await this.zomeProxy.commitGlobalLog(decodeHashFromBase64(maybeLatest? maybeLatest[0] : undefined)); // FIXME
    this._globalSearchLog.time = latestGlobalLogTime;
    /** Commit each Thread Log */
    for (const [ppAh, thread] of Object.entries(this._threads)) {
      if (thread.searchedUnion && thread.searchedUnion.end > thread.latestSearchLogTime) {
        const threadLog: ThreadLastSearchLog = {
          lastKnownBeadAh: decodeHashFromBase64(thread.beadLinksTree.end.value.beadAh),
          time: thread.beadLinksTree.end.key,
          ppAh: decodeHashFromBase64(ppAh),
        }
        const ah = await this.zomeProxy.commitThreadLog(threadLog);
        thread.setLatestSearchLogTime(threadLog.time);
      }
    }
  }



  /** -- Signaling -- */

  /** */
  async notifyPeers(signal: SignalPayload, peers: Array<AgentPubKeyB64>): Promise<void> {
    return this.zomeProxy.notifyPeers({signal, peers});
  }


  /** -- Debug -- */

  /** */
  async generateTestData(): Promise<void> {
    const hashs = await this.zomeProxy.getSubjectsForDna(decodeHashFromBase64(this.cell.dnaHash));
    console.log("generateTestData(), subjects found", hashs.length)
    if (hashs.length > 0) {
      return;
    }
    console.log("*** generateTestData()");

    const top1 = await this.publishSemanticTopic("topic-many");
    const top11 = await this.publishSemanticTopic("topic-many");
    const top2 = await this.publishSemanticTopic("topic-1");
    const top3 = await this.publishSemanticTopic("topic-none");
    const top4 = await this.publishSemanticTopic("time-test");

    const th1 = await this.publishThreadFromSemanticTopic(top1, "general");
    console.log("*** generateTestData() general", th1);
    const th2 = await this.publishThreadFromSemanticTopic(top1, "none");

    const th4 = await this.publishThreadFromSemanticTopic(top1, "full");
    const th01 = await this.publishThreadFromSemanticTopic(top2, "general");
    //const th11 = await this.publishThreadFromSemanticTopic(top1, "general");

    const timeMin = await this.publishThreadFromSemanticTopic(top4, "minute");
    console.log("*** generateTestData() minute", timeMin);
    const timeHour = await this.publishThreadFromSemanticTopic(top4, "hour");
    const timeDay = await this.publishThreadFromSemanticTopic(top4, "day");
    const timeMon = await this.publishThreadFromSemanticTopic(top4, "month");
    //const timeYear = await this.publishThreadFromSemanticTopic(top4, "year");


    await this.publishTextMessage("m1", th01);

    await this.publishTextMessage("first", th1);
    await this.publishTextMessage("second", th1);
    await this.publishTextMessage("third", th1);

    await this.publishManyDebug(timeMin, 60 * 1000, 200);
    await this.publishManyDebug(timeDay, 24 * 3600 * 1000);
    await this.publishManyDebug(timeMon, 12 * 24 * 3600 * 1000, 30);

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
      await this.publishTextMessageAt("" + interval / 1000 + "-message-" + n, ppAh, date_ms * 1000, true);
      date_ms -= interval;
    }
  }

}
