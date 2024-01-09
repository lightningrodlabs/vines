import {
  ActionHash,
  ActionHashB64,
  AgentPubKeyB64,
  decodeHashFromBase64, DnaHashB64,
  encodeHashToBase64, Entry, EntryHashB64, Timestamp,
} from "@holochain/client";
import {
  AnyBead,
  Bead,
  BeadLink, CreatePpInput, DirectMessageType, EntryBead,
  GetLatestBeadsInput, GlobalLastProbeLog,
  ParticipationProtocol,
  SEMANTIC_TOPIC_TYPE_NAME,
  SignalPayload,
  Subject,
  TextMessage, ThreadLastProbeLog,
  ThreadsEntryType,
} from "../bindings/threads.types";
import {ThreadsProxy} from "../bindings/threads.proxy";
import {delay, Dictionary, ZomeViewModel} from "@ddd-qc/lit-happ";
import {
  AnyBeadInfo,
  AnyLinkableHashB64, BeadLinkMaterialized, EntryBeadInfo, HOLOCHAIN_EPOCH,
  materializeParticipationProtocol,
  ParticipationProtocolMat,
  TextMessageInfo,
  ThreadsPerspective
} from "./threads.perspective";
import {Thread} from "./thread";
import {TimeInterval} from "./timeInterval";
import {AppletId, Hrl} from "@lightningrodlabs/we-applet";



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
      threads: this._threads,
      textMessages: this._textMessages,
      entryBeads: this._entryBeads,
      anyBeads: this._anyBeads,
      appletSubjectTypes: this._appletSubjectTypes,
      subjectsPerType: this._subjectsPerType,
      emojiReactions:  this._emojiReactions,

      globalProbeLog: this._globalProbeLog,
      newSubjects: this._newSubjects,
      unreadSubjects: this._unreadSubjects,
      newThreads: this._newThreads,
      unreadThreads: this._unreadThreads,

      allAppletIds: this._allAppletIds,

      mentions: this._mentions,

    };
  }


  private _allAppletIds: string[] = [];
  /** ah -> Subject */
  private _allSubjects: Dictionary<Subject> = {};
  /** eh -> (title, isHidden) */
  private _allSemanticTopics: Dictionary<[string, boolean]> = {};
  ///** ah -> ParticipationProtocol */
  //private _allParticipationProtocols: Dictionary<ParticipationProtocolMat> = {};
  /** ah -> BeadInfo */
  private _entryBeads: Dictionary<EntryBeadInfo> = {};
  /** ah -> BeadInfo */
  private _anyBeads: Dictionary<AnyBeadInfo> = {};
  /** ah -> TextMessageInfo */
  private _textMessages: Dictionary<TextMessageInfo> = {};
  /** lh -> ppAhs */
  private _threadsPerSubject: Dictionary<ActionHashB64[]> = {};
  /** ppAh -> Thread */
  private _threads: Dictionary<Thread> = {};

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
  private _unreadThreads: ActionHashB64[] = [];

  private _mentions: [ActionHashB64, AgentPubKeyB64, ActionHashB64][] = [];


  /** -- Get: Return a stored element -- */

  getSubject(ah: ActionHashB64): Subject | undefined {
    return this._allSubjects[ah];
  }

  getSemanticTopic(eh: EntryHashB64): string | undefined {
    const maybeTopic = this._allSemanticTopics[eh];
    if (maybeTopic) {
      return maybeTopic[0];
    }
    return undefined;
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
  getAllTextMessages(ppAh: ActionHashB64): TextMessageInfo[] {
    const threadInfo = this._threads[ppAh];
    if (!threadInfo) {
      return [];
    }
    const bead_ahs = threadInfo.getAll().map((bl) => bl.beadAh);
    const infos = bead_ahs.map((ah) => this._textMessages[ah]);
    //FIXME tuples.sort((a, b) => {return 1})
    return infos;
  }


  /** */
  getAllEntryBeads(ppAh: ActionHashB64): EntryBeadInfo[] {
    const threadInfo = this._threads[ppAh];
    if (!threadInfo) {
      return [];
    }
    const beadAhs = threadInfo.getAll().map((bl) => bl.beadAh);
    const infos = beadAhs.map((ah) => this._entryBeads[ah]);
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
      probes.push(this.probeThreads(topicEh));
    }
    await Promise.all(probes);
    /** Get last elements since last time (global search log) */
    await this.probeAllLatest();

    await this.probeMentions();

    /** */
    await this.probeAllAppletIds();
  }


  /** */
  async probeHiddens(): Promise<AnyLinkableHashB64[]> {
    const hiddens = await this.zomeProxy.getHiddenSubjects();
    return hiddens.map((hidden) => encodeHashToBase64(hidden))
  }

  /** */
  async probeMentions() {
    const mentions = await this.zomeProxy.probeMentions();
    this._mentions = mentions.map(([linkAh, agentId, ah]) => {return [encodeHashToBase64(linkAh), encodeHashToBase64(agentId), encodeHashToBase64(ah)]});
    this.notifySubscribers();
  }


  /** -- Query: Query the local source-chain, and store the results (async) -- */

  /** */
  private async queryProbeLogs(retryOnFail: boolean): Promise<void> {
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
      const ppAhB64 = encodeHashToBase64(threadLog.ppAh)
      if (!this._threads[ppAhB64]) {
        this._threads[ppAhB64] = new Thread();
      }
      //this._threads[ppAhB64].setCreationTime(creationTime);
      this._threads[ppAhB64].setLatestProbeLogTime(threadLog.time);
    }
  }


  /** Get all SemanticTopics from the RootAnchor */
  private async querySemanticTopics(): Promise<Dictionary<[string, boolean]>> {
    const tuples = await this.zomeProxy.querySemanticTopics();
    const hiddens = await this.probeHiddens();
    for (const [_ts, eh, st] of tuples) {
      const topicEh = encodeHashToBase64(eh);
      this.storeSemanticTopic(topicEh, st.title, hiddens.includes(topicEh));
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
      this.storePp(encodeHashToBase64(ah), pp, ts, hiddens.includes(ppAh));
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
  async probeSemanticTopics(): Promise<Dictionary<[string, boolean]>> {
    const sts = await this.zomeProxy.getAllSemanticTopics();
    const hiddens = await this.probeHiddens();
    for (const tuple of sts) {
      const topicEh = encodeHashToBase64(tuple[0]);
      this.storeSemanticTopic(topicEh, tuple[1], hiddens.includes(topicEh));
    }
    console.log("probeSemanticTopics()", Object.keys(this._allSemanticTopics).length);
    return this._allSemanticTopics;
  }


  /** Get all Threads from a subject */
  async probeThreads(subjectHash: AnyLinkableHashB64): Promise<Dictionary<ParticipationProtocol>> {
    let res = {};
    const pps = await this.zomeProxy.getPpsFromSubjectHash(decodeHashFromBase64(subjectHash));
    const hiddens = await this.probeHiddens();
    // FIXME resolve promise all at once
    for (const [pp_ah, _linkTs] of pps) {
      const ppAh = encodeHashToBase64(pp_ah);
      const [pp, ts] = await this.zomeProxy.getPp(pp_ah);
      this.storePp(ppAh, pp, ts, hiddens.includes(ppAh));
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
    const latest = await this.zomeProxy.probeAllLatest(this._globalProbeLog.time);
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

    /** Figure out if subjects are new */
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


  /** Probe all emojis on this bead */
  async probeEmojiReactions(beadAh: ActionHashB64) {
    const reactions = await this.zomeProxy.getReactions(decodeHashFromBase64(beadAh));
    this._emojiReactions[beadAh] = reactions.map(([key, emoji]) => [encodeHashToBase64(key), emoji]);
    this.notifySubscribers();
  }


  /** */
  async storeEmojiReaction(beadAh: ActionHashB64, agent: AgentPubKeyB64, emoji: string) {
    // TODO: Make sure this reaction is not already stored
    this._emojiReactions[beadAh].push([agent, emoji]);
    this.notifySubscribers();
  }

  /** */
  async unstoreEmojiReaction(beadAh: ActionHashB64, agent: AgentPubKeyB64, emoji: string) {
    const filtered = this._emojiReactions[beadAh].filter(([a, e]) => !(agent == a && e == emoji));
    if (filtered.length < this._emojiReactions[beadAh].length) {
      this._emojiReactions[beadAh] = filtered;
      this.notifySubscribers();
    }
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
    console.log("probePreviousBeads", ppAh, thread);
    if (!thread) {
      return Promise.reject("No Thread data found for given ParticipationProtocol")
    }
    // const oldestTime = thread.beadLinksTree.begin.key;
    const oldestTime = thread.probedUnion.begin;
    let query: GetLatestBeadsInput = {
      ppAh: decodeHashFromBase64(ppAh),
      targetLimit: limit,
      endTime: oldestTime? oldestTime : Date.now() * 1000,
    };
    return this.probeLatestBeads(query);
  }



  /** -- Publish: Commit to source-chain (and possibly the DHT) and store it (async because the commit could fail) -- */


  /** Returns beadType & global_time_anchor */
  async publishHrlBead(hrl: Hrl, ppAh: ActionHashB64): Promise<[ActionHashB64, string, number, AnyBead]> {
    const creationTime = Date.now() * 1000;
    const [ah, global_time_anchor, anyBead] = await this.publishHrlBeadAt(hrl, ppAh, creationTime);
    return [ah, global_time_anchor, creationTime, anyBead];
  }


  /** */
  async publishHrlBeadAt(hrl: Hrl, protocolAh: ActionHashB64, creationTime: Timestamp, dontStore?: boolean): Promise<[ActionHashB64, string, AnyBead]> {
    const obj = [encodeHashToBase64(hrl[0]), encodeHashToBase64(hrl[1])]
    const input = {forProtocolAh: decodeHashFromBase64(protocolAh), value: JSON.stringify(obj), typeInfo: "hrl"}
    console.log("publishHrlBeadAt()", obj, input.value);
    /** Add Bead */
    const [beadAh, anyBead, global_time_anchor, bucket_ts] = await this.zomeProxy.addAnyBead(input);
    console.log("publishHrlBeadAt() added bead", beadAh, creationTime);
    /** Insert in perspective */
    if (!dontStore) {
      this.fetchAnyBead(beadAh, true, creationTime);
    }
    /** Done */
    return [encodeHashToBase64(beadAh), global_time_anchor, anyBead];
  }


  /** Returns beadType & global_time_anchor */
  async publishEntryBead(eh: EntryHashB64, ppAh: ActionHashB64): Promise<[ActionHashB64, string, number, EntryBead]> {
    const creationTime = Date.now() * 1000;
    const [ah, global_time_anchor, entryBead] = await  this.publishEntryBeadAt(eh, ppAh, creationTime);
    return [ah, global_time_anchor, creationTime, entryBead];
  }


  /** */
  async publishEntryBeadAt(eh: EntryHashB64, protocolAh: ActionHashB64, creationTime: Timestamp, dontStore?: boolean): Promise<[ActionHashB64, string, EntryBead]> {
    const entryInfo = {eh: decodeHashFromBase64(eh), forProtocolAh: decodeHashFromBase64(protocolAh), zomeName: "zFiles", roleName: "rFiles"};
    /** Add Bead */
    const [beadAh, entryBead, global_time_anchor, bucket_ts] = await this.zomeProxy.addEntryAsBead(entryInfo);
    console.log("publishEntryBeadAt() added bead", beadAh, creationTime);
    /** Insert in perspective */
    if (!dontStore) {
      this.fetchEntryBead(beadAh, true, creationTime);
    }
    /** Done */
    return [encodeHashToBase64(beadAh), global_time_anchor, entryBead];
  }


  /** */
  async publishTextMessage(msg: string, ppAh: ActionHashB64, ments?: AgentPubKeyB64[]) : Promise<[ActionHashB64, string, number]> {
    const creation_time = Date.now() * 1000
    const [ah, global_time_anchor] = await this.publishTextMessageAt(msg, ppAh, creation_time, ments? ments : []);
    return [ah, global_time_anchor, creation_time];
  }


  /** */
  async publishTextMessageAt(msg: string, protocolAh: ActionHashB64, creationTime: Timestamp, ments: AgentPubKeyB64[], dontStore?: boolean) : Promise<[ActionHashB64, string]> {
    /** Make out bead */
    const bead: Bead = {
      forProtocolAh: decodeHashFromBase64(protocolAh)
    }
    const mentionees = ments.map((m) => decodeHashFromBase64(m));
    /** Commit Entry */
    const texto: TextMessage = {value: msg, bead}
    const [ah, global_time_anchor] = await this.zomeProxy.addTextMessageAtWithMentions({texto, creationTime, mentionees});
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
    this.storeSemanticTopic(ehB64, title, false);
    console.log("publishSemanticTopic()", title, ehB64);
    console.log("publishSemanticTopic()", this._allSemanticTopics);
    /** Done */
    this.notifySubscribers();
    return ehB64;
  }


  /** */
  async publishParticipationProtocol(input: CreatePpInput): Promise<[ActionHashB64, ParticipationProtocolMat]> {
    const [ppAh, ts] = await this.zomeProxy.createParticipationProtocol(input);
    const ppAhB64 = encodeHashToBase64(ppAh);
    const [pp, _ts2] = await this.zomeProxy.getPp(ppAh);
    const ppMat = this.storePp(ppAhB64, pp, ts, false);
    return [ppAhB64, ppMat];
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
    const [ah, ts] = await this.zomeProxy.createParticipationProtocol({
      pp,
      //appletHash: decodeHashFromBase64(appletId),
      appletId,
      dnaHash: decodeHashFromBase64(dnaHash),
    });
    const ahB64 = encodeHashToBase64(ah);
    this.storePp(ahB64, pp, ts, false);
    return [ts, ahB64, pp];
  }



  /** -- Fetch: Grab an entry from the DHT and store it (async) -- */

  /** */
  async fetchPp(ppAh: ActionHashB64): Promise<ParticipationProtocolMat> {
    const [pp, ts] = await this.zomeProxy.getPp(decodeHashFromBase64(ppAh));
    if (pp === null) {
      Promise.reject("ParticipationProtocol not found at " + ppAh)
    }
    const isHidden = await this.zomeProxy.getHideLink(decodeHashFromBase64(ppAh));
    const ppMat = this.storePp(ppAh, pp, ts, isHidden != null);
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
  async fetchEntryBead(beadAh: ActionHash, canNotify: boolean, alternateCreationTime?: Timestamp): Promise<EntryBead> {
    try {
      const [creationTime, author, entryBead] = await this.zomeProxy.getEntryBead(beadAh);
      const ts = alternateCreationTime? alternateCreationTime : creationTime;
      //console.log("fetchTextMessage", ts);
      this.storeEntryBead(encodeHashToBase64(beadAh), encodeHashToBase64(entryBead.bead.forProtocolAh), ts, encodeHashToBase64(author), entryBead, canNotify);
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
      this.storeAnyBead(encodeHashToBase64(beadAh), encodeHashToBase64(anyBead.bead.forProtocolAh), ts, encodeHashToBase64(author), anyBead, canNotify);
      return anyBead;
    } catch(e) {
      console.error(e);
      Promise.reject("AnyBead not found at " + encodeHashToBase64(beadAh));
    }
  }


  /** */
  private async fetchBeads(ppAhB64: ActionHashB64, beadLinks: BeadLink[], probedInterval: TimeInterval): Promise<void> {
    //console.log("fetchBeads() len = ", beadLinks.length, searchedInterval);
    if (beadLinks.length == 0) {
      return;
    }
    /** fetch each TextMessage */
    for (const bl of beadLinks) {
      console.log("fetchBeads()", bl.beadType)
      if (bl.beadType == "TextMessage") {
        await this.fetchTextMessage(bl.beadAh, false, bl.creationTime);
      } else {
        if (bl.beadType == "EntryBead") {
          await this.fetchEntryBead(bl.beadAh, false, bl.creationTime);
        } else {
          await this.fetchAnyBead(bl.beadAh, false, bl.creationTime);
        }
      }
    }
    this._threads[ppAhB64].addProbedInterval(probedInterval);
    this.notifySubscribers();
  }



  /** -- Store: Cache & index a materialized entry, and notify subscribers -- */

  /** */
  storeSemanticTopic(eh: EntryHashB64, title: string, isHidden: boolean): void {
    this._allSemanticTopics[eh] = [title, isHidden];
    this.notifySubscribers();
  }


  /** */
  async hideSubject(hash: AnyLinkableHashB64) {
    await this.zomeProxy.hideSubject(decodeHashFromBase64(hash));
    /** Check if it's a topic */
    const maybeTopicEh = Object.keys(this._allSemanticTopics).find(key => key === hash);
    if (maybeTopicEh) {
      this.storeSemanticTopic(maybeTopicEh, this._allSemanticTopics[maybeTopicEh][0], true);
      return;
    }
    /** Check if it's a thread */
    const maybeThreadAh = Object.keys(this._threads).find(key => key === hash);
    if (maybeThreadAh) {
      this._threads[maybeThreadAh].setIsHidden(true);
      this.notifySubscribers();
      return;
    }
  }


  /** */
  async unhideSubject(hash: AnyLinkableHashB64) {
    await this.zomeProxy.unhideSubject(decodeHashFromBase64(hash));
    /** Check if it's a topic */
    const maybeTopicEh = Object.keys(this._allSemanticTopics).find(key => key === hash);
    if (maybeTopicEh) {
      this.storeSemanticTopic(maybeTopicEh, this._allSemanticTopics[maybeTopicEh][0], false);
      return;
    }
    /** Check if it's a thread */
    const maybeThreadAh = Object.keys(this._threads).find(key => key === hash);
    if (maybeThreadAh) {
      this._threads[maybeThreadAh].setIsHidden(false);
      this.notifySubscribers();
      return;
    }
  }


  /** */
  storePp(ppAh: ActionHashB64, pp: ParticipationProtocol, creationTime: Timestamp, isHidden: boolean): ParticipationProtocolMat {
    let thread = this._threads[ppAh]
    if (!thread) {
      thread = new Thread();
    } else {
      if (thread.pp) {
        return thread.pp;
      }
    }
    thread.setCreationTime(creationTime);
    thread.setIsHidden(isHidden);
    let ppMat = materializeParticipationProtocol(pp);
    thread.setPp(ppMat);
    console.log(`storePp() thread "${ppAh}" for subject "${ppMat.subjectHash}"| creationTime: "`, creationTime, isHidden);
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
  storeAnyBead(beadAh: ActionHashB64, forProtocolAh: ActionHashB64, creationTime: Timestamp, author: AgentPubKeyB64, anyBead: AnyBead, canNotify: boolean): void {
    if (this._entryBeads[beadAh]) {
      return;
    }
    /* Store BeadLinkMaterialized */
    this._anyBeads[beadAh] = {
      creationTime,
      author,
      anyBead,
    };
    /* Store Bead in its Thread */
    if (!this._threads[forProtocolAh]) {
      this._threads[forProtocolAh] = new Thread();
    }
    const blMat: BeadLinkMaterialized = {creationTime, beadAh, beadType: "AnyBead" /*anyBead.typeInfo*/};
    this._threads[forProtocolAh].addItem(blMat);
    /* Done */
    if (canNotify) {
      this.notifySubscribers();
    }
  }


  /** */
  storeEntryBead(beadAh: ActionHashB64, forProtocolAh: ActionHashB64, creationTime: Timestamp, author: AgentPubKeyB64, entryBead: EntryBead, canNotify: boolean): void {
    if (this._entryBeads[beadAh]) {
      return;
    }
    /* Store BeadLinkMaterialized */
    this._entryBeads[beadAh] = {
      creationTime,
      author,
      entryBead,
    };
    /* Store Bead in its Thread */
    if (!this._threads[forProtocolAh]) {
      this._threads[forProtocolAh] = new Thread();
    }
    const blMat: BeadLinkMaterialized = {creationTime, beadAh, beadType: "EntryBead" /*entryBead.subType*/};
    this._threads[forProtocolAh].addItem(blMat);
    /* Done */
    if (canNotify) {
      this.notifySubscribers();
    }
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
  async commitProbeLogs(): Promise<void> {
    console.log("commitProbeLogs()", Date.now());
    /** Commit Global Log */
    const maybeLatest = this.getLatestThread();
    let latestGlobalLogTime = await this.zomeProxy.commitGlobalLog(decodeHashFromBase64(maybeLatest? maybeLatest[0] : undefined)); // FIXME
    this._globalProbeLog.time = latestGlobalLogTime;
    /** Commit each Thread Log */
    for (const [ppAh, thread] of Object.entries(this._threads)) {
      //console.log(`commitProbeLogs() Thread "${thread.pp.purpose}":`, thread.probedUnion, thread.beadLinksTree.end.key, thread.latestProbeLogTime);
      if (thread.probedUnion && thread.probedUnion.end > thread.latestProbeLogTime) {
        const threadLog: ThreadLastProbeLog = {
          maybeLastKnownBeadAh: decodeHashFromBase64(thread.beadLinksTree.end.value.beadAh),
          time: thread.beadLinksTree.end.key,
          ppAh: decodeHashFromBase64(ppAh),
        }
        const ah = await this.zomeProxy.commitThreadLog(threadLog);
        thread.setLatestProbeLogTime(threadLog.time);
      }
    }
  }



  /** -- Signaling -- */

  /** */
  async notifyPeers(signal: SignalPayload, agents: Array<AgentPubKeyB64>): Promise<void> {
    const peers = agents.map((key) => decodeHashFromBase64(key));
    return this.zomeProxy.notifyPeers({signal, peers});
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
