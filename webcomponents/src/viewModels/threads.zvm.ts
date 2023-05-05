import {
  ActionHash,
  ActionHashB64,
  AnyDhtHashB64,
  decodeHashFromBase64,
  encodeHashToBase64, EntryHashB64, Timestamp,
} from "@holochain/client";
import {
  Bead, BeadLink, GetLatestBeadsInput,
  ParticipationProtocol, Subject,
} from "../bindings/threads.types";
import {ThreadsProxy} from "../bindings/threads.proxy";
import {delay, Dictionary, ZomeViewModel} from "@ddd-qc/lit-happ";
import {
  AnyLinkableHashB64, HOLOCHAIN_EPOCH,
  materializeParticipationProtocol,
  ParticipationProtocolMat,
  TextMessageInfo,
  ThreadsPerspective
} from "./threads.perspective";
import {Thread} from "./thread";
import {TimeInterval} from "./timeInterval";
import {errorMonitor} from "ws";




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
      allParticipationProtocols: this._allParticipationProtocols,
      threadsPerSubject: this._threadsPerSubject,
      threads: this._threads,
      textMessages: this._textMessages,
    };
  }

  /** ah -> Subject */
  private _allSubjects: Dictionary<Subject> = {};
  /** ah -> SemanticTopic */
  private _allSemanticTopics: Dictionary<string> = {};
  /** ah -> ParticipationProtocol */
  private _allParticipationProtocols: Dictionary<ParticipationProtocolMat> = {};
  /** ah -> TextMessageInfo */
  private _textMessages: Dictionary<TextMessageInfo> = {};
  /** lh -> threads ahs */
  private _threadsPerSubject: Dictionary<ActionHashB64[]> = {};
  /** pp_ah -> Thread */
  private _threads: Dictionary<Thread> = {};


  /** -- Getters -- */

  getSubject(ah: ActionHashB64): Subject | undefined {
    return this._allSubjects[ah];
  }

  getSemanticTopic(ah: ActionHashB64): string | undefined {
    return this._allSemanticTopics[ah];
  }

  getParticipationProtocol(ah: ActionHashB64): ParticipationProtocolMat | undefined {
    return this._allParticipationProtocols[ah];
  }

  getThread(ppAh: ActionHashB64): Thread | undefined {
    return this._threads[ppAh];
  }

  // getTextMessageInfo(ah: ActionHashB64): [number, AgentPubKeyB64, string] | undefined {
  //   return this._textMessages[ah];
  // }


  getMostRecentTextMessages(pp_ah: ActionHashB64): TextMessageInfo[] {
    const threadInfo = this._threads[pp_ah];
    if (!threadInfo) {
      return [];
    }
    const bead_ahs = threadInfo.getLast(10).map((bl) => bl.beadAh);
    const infos = bead_ahs.map((ah) => this._textMessages[encodeHashToBase64(ah)]);
    //FIXME tuples.sort((a, b) => {return 1})
    return infos;
  }


  getAllTextMessages(pp_ah: ActionHashB64): TextMessageInfo[] {
    const threadInfo = this._threads[pp_ah];
    if (!threadInfo) {
      return [];
    }
    const bead_ahs = threadInfo.getAll().map((bl) => bl.beadAh);
    const infos = bead_ahs.map((ah) => this._textMessages[encodeHashToBase64(ah)]);
    //FIXME tuples.sort((a, b) => {return 1})
    return infos;
  }


  /** -- Init -- */

  /** */
  async initializePerspectiveOffline(): Promise<void> {
    // TODO: notify subscribers
  }


  /** */
  async initializePerspectiveOnline(): Promise<void> {
    await this.probeSemanticTopics();
    let probes = []
    for (const topicAh of Object.keys(this._allSemanticTopics)) {
      probes.push(this.probeThreads(topicAh));
    }
    await Promise.all(probes);
  }


  /** -- Probing -- */


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
      this._allSemanticTopics[encodeHashToBase64(tuple[0])] = tuple[1]
    }
    console.log("probeSemanticTopics()", Object.keys(this._allSemanticTopics).length);
    this.notifySubscribers();
    return this._allSemanticTopics;
  }


  /** Get all Threads from a subject */
  async probeThreads(subjectHash: AnyLinkableHashB64): Promise<Dictionary<ActionHashB64>> {
    let res = {};
    const ppAhs = await this.zomeProxy.getPpsFromSubjectHash(decodeHashFromBase64(subjectHash));
    let current = this._threadsPerSubject[subjectHash];
    if (!current)  current = [];
    // FIXME resolve promise all at once
    for (const ppAh of ppAhs) {
      const ahB64 = encodeHashToBase64(ppAh);
      const pp = await this.zomeProxy.getPp(ppAh);
      current.push(ahB64);
      this._allParticipationProtocols[ahB64] = materializeParticipationProtocol(pp);
      res[ahB64] = pp;
    }
    const uniq = [...new Set(current)]; // dedup
    this._threadsPerSubject[subjectHash] = uniq;
    return res;
  }


  /** Get all beads from a thread */
  async probeAllBeads(ppAhB64: ActionHashB64): Promise<BeadLink[]> {
    if (ppAhB64.length == 0) {
      console.error("probeAllBeads() Failed. ppAh not provided.")
    }
    /** Probe */
    const [interval, beadLinks] = await this.zomeProxy.getAllBeads(decodeHashFromBase64(ppAhB64));
    console.log("probeAllBeads()", TimeInterval.new(interval).toStringSec(), beadLinks)
    /** Store */
    await this.storeItems(ppAhB64, beadLinks, TimeInterval.new(interval));
    this._threads[ppAhB64].setBeginningOfTime();
    /** Done */
    return beadLinks;
  }


  /** Get all beads from "now" and back until `limit` is reached or `startTime` is reached */
  async probeLatestBeads(input: GetLatestBeadsInput): Promise<BeadLink[]> {
    if (input.ppAh.length == 0) {
      console.error("probeLatestBeads() Failed. ppAh not provided.")
    }
    /** Probe the latest beads */
    const [interval, beadLinks] = await this.zomeProxy.getLatestBeads(input);
    /** Cache them */
    const ppAhB64 = encodeHashToBase64(input.ppAh);
    await this.storeItems(ppAhB64, beadLinks, TimeInterval.new(interval));
    /** Check if beginning of time reached */
    console.log("BeginningOfTime", interval, HOLOCHAIN_EPOCH);
    if (interval.begin <= HOLOCHAIN_EPOCH) {
      this._threads[ppAhB64].setBeginningOfTime();
      console.log("BeginningOfTime reached for", ppAhB64, this._threads[ppAhB64].beginningOfTime);
    }
    /** Done */
    return beadLinks;
  }


  /** */
  reachedBeginning(ppAh: ActionHashB64): boolean {
    return this._threads[ppAh].beginningOfTime != undefined;
  }


  /** Try to get older beads from the currently known oldest bead of a thread */
  /*async */ probePreviousBeads(ppAh: ActionHashB64, limit: number): Promise<BeadLink[]> {
    // if (this.reachedBeginning(ppAh)) {
    //   return [];
    // }
    const thread = this._threads[ppAh];
    if (!thread) {
      return Promise.reject("No Thread data found for given ParticipationProtocol")
    }
    const oldestTime = thread.beadLinksTree.begin.key;
    let query: GetLatestBeadsInput = {
      ppAh: decodeHashFromBase64(ppAh),
      targetLimit: limit,
      endTime: oldestTime? oldestTime : Date.now() * 1000,
    };
    return this.probeLatestBeads(query);
  }



  /** */
  private async storeItems(ppAhB64: ActionHashB64, beadLinks: BeadLink[], searchedInterval: TimeInterval): Promise<void> {
    console.log("storeItems() len = ", beadLinks.length, searchedInterval);
    // /** Determine searched interval from beads if none is provided */
    // if (!searchedInterval) {
    //   searchedInterval = determineIntervalFromTimestamps(beadLinks.map((bl) => bl.indexTime))
    // }
    /** Insert itemLinks in ThreadInfo */
    if (!this._threads[ppAhB64]) {
      this._threads[ppAhB64] = new Thread();
    }
    this._threads[ppAhB64].addItems(beadLinks, searchedInterval);
    /** Grab and cache the items in _textMessages */
    for (const bl of beadLinks) {
      //console.log("storeItems()", bl.t)
      const tuple = await this.zomeProxy.getTextMessage(bl.beadAh); // TODO: do batch get instead?
      this._textMessages[encodeHashToBase64(bl.beadAh)] = {
        //index_begin_time_us: bl.indexTime,
        create_time_us: bl.creationTime, //tuple[0],
        author: encodeHashToBase64(tuple[1]),
        message: tuple[2]
      };
    }
    /** Notify observers */
    this.notifySubscribers();
  }


  /** -- Publish -- */

  async publishTextMessage(msg: string, protocolAh: ActionHashB64) : Promise<string> {
    return this.publishTextMessageAt(msg, protocolAh, Date.now() * 1000);
  }


  /** */
  async publishTextMessageAt(msg: string, protocolAh: ActionHashB64, timeUs: Timestamp, dontStore?: boolean) : Promise<string> {
    /** Make out bead */
    const bead: Bead = {
      forProtocolAh: decodeHashFromBase64(protocolAh)
    }
    /** Commit Entry */
    const texto = {value: msg, bead}
    const [ah, global_time_anchor, indexTime] = await this.zomeProxy.addTextMessageAt({texto, timeUs});
    const beadLink: BeadLink = {indexTime, creationTime: timeUs, beadAh: ah, beadType: "TextMessage"}
    /** Insert in ThreadInfo */
    if (!dontStore) {
      await this.storeItems(protocolAh, [beadLink], TimeInterval.instant(beadLink.creationTime));
    }
    /** Done */
    return global_time_anchor;
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
    for (const [ah, _global_time_anchor, indexTime] of tuples) {
      const beadLink: BeadLink = {indexTime, creationTime: intervalUs, beadAh: ah, beadType: "TextMessage"}
      /** Insert in ThreadInfo */
      if (!dontStore) {
        await this.storeItems(protocolAh, [beadLink], TimeInterval.instant(beadLink.creationTime));
      }
    }
  }


  /** */
  async publishSemanticTopic(title: string) : Promise<EntryHashB64> {
    const eh = await this.zomeProxy.createSemanticTopic({title});
    const ehB64 = encodeHashToBase64(eh);
    this._allSemanticTopics[ehB64] = title;
    console.log("publishSemanticTopic()", title,ehB64);
    console.log("publishSemanticTopic()", this._allSemanticTopics);

    this.notifySubscribers();
    return ehB64;
  }


  /** */
  async publishThreadFromSemanticTopic(topicHash: AnyLinkableHashB64, purpose: string) : Promise<ActionHashB64> {
    const pp: ParticipationProtocol = {
      purpose,
      topicHash: decodeHashFromBase64(topicHash),
      rules: "FFA",
      topicType: {semanticTopic: null},
    }
    const ah = await this.zomeProxy.createPpFromSemanticTopic(pp);
    const ahB64 = encodeHashToBase64(ah);
    this._allParticipationProtocols[ahB64] = materializeParticipationProtocol(pp);
    if (!this._threadsPerSubject[topicHash]) {
      this._threadsPerSubject[topicHash] = [];
    }
    this._threadsPerSubject[topicHash].push(ahB64);
    //console.log("publishThreadFromSemanticTopic()", pp)
    this.notifySubscribers();
    return ahB64;
  }


  /** -- Debug -- */

  /** */
  async generateTestData() {
    const hashs = await this.zomeProxy.getSubjectsForDna(decodeHashFromBase64(this.cell.dnaHash));
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


    // await this.publishTextMessage("m1", th01);
    //
    // await this.publishTextMessage("first", th1);
    // await this.publishTextMessage("second", th1);
    // await this.publishTextMessage("third", th1);
    //
    // await this.publishManyDebug(timeMin, 60 * 1000, 40 * 4);
    // await this.publishManyDebug(timeHour, 3600 * 1000);
    // await this.publishManyDebug(timeDay, 24 * 3600 * 1000);
    //await delay(60 * 1000);

    // Do zome_calls for fun
    // for (let i = 1; i <= 100; i++) {
    //   let dnaInfo = await this.zomeProxy.dnaInfo();
    //   console.log("dnaInfo", i, dnaInfo);
    // }

    let begin = Date.now()
    let n = 10;
    await this.publishManyDebug(timeMon, 12 * 24 * 3600 * 1000, n);
    let end = Date.now()
    let diff = (end - begin) / 1000;
    console.log(`Publish timing for ${n} entries: ${diff} secs (${diff / n} secs / entry)`)
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
      await this.publishTextMessageAt("message-" + n, ppAh, date_ms * 1000, true);
      date_ms -= interval;
    }
  }

}
