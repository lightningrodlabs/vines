import {
  ActionHashB64,
  AnyDhtHashB64,
  decodeHashFromBase64,
  encodeHashToBase64, EntryHashB64, Timestamp,
} from "@holochain/client";
import {
  Bead, BeadLink, GetLatestBeadsInput,
  ParticipationProtocol,
} from "../bindings/threads.types";
import {ThreadsProxy} from "../bindings/threads.proxy";
import {Dictionary, ZomeViewModel} from "@ddd-qc/lit-happ";
import {
  materializeParticipationProtocol,
  ParticipationProtocolMat,
  TextMessageInfo,
  ThreadsPerspective
} from "./threads.perspective";
import {determineInterval, ThreadInfo} from "./threadInfo";
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
      allSemanticTopics: this._allSemanticTopics,
      allParticipationProtocols: this._allParticipationProtocols,
      threadsByTopic: this._threadsByTopic,
      beadsByThread: this._beadsByThread,
      textMessages: this._textMessages,
    };
  }


  /** ah -> SemanticTopics */
  private _allSemanticTopics: Dictionary<string> = {};
  /** ah -> ParticipationProtocol */
  private _allParticipationProtocols: Dictionary<ParticipationProtocolMat> = {};
  /** ah -> TextMessageInfo */
  private _textMessages: Dictionary<TextMessageInfo> = {};

  private _threadsByTopic: Dictionary<ActionHashB64[]> = {};


  private _beadsByThread: Dictionary<ThreadInfo> = {};


  /** -- Getters -- */

  getSemanticTopic(ah: ActionHashB64): string | undefined {
    return this._allSemanticTopics[ah];
  }

  getParticipationProtocol(ah: ActionHashB64): ParticipationProtocolMat | undefined {
    return this._allParticipationProtocols[ah];
  }

  // getTextMessageInfo(ah: ActionHashB64): [number, AgentPubKeyB64, string] | undefined {
  //   return this._textMessages[ah];
  // }


  getMostRecentTextMessages(pp_ah: ActionHashB64): TextMessageInfo[] {
    const threadInfo = this._beadsByThread[pp_ah];
    if (!threadInfo) {
      return [];
    }
    const bead_ahs = threadInfo.getLast(10).map((bl) => bl.beadAh);
    const infos = bead_ahs.map((ah) => this._textMessages[encodeHashToBase64(ah)]);
    //FIXME tuples.sort((a, b) => {return 1})
    return infos;
  }


  /** -- Methods -- */

  /** Probe */

  async initializePerspectiveOnline(): Promise<void> {
    await this.probeSemanticTopics();
    let probes = []
    for (const topicAh of Object.keys(this._allSemanticTopics)) {
      probes.push(this.probeThreads(topicAh));
    }
    await Promise.all(probes);
  }


  /** */
  probeAllInner() {
    /* await */ this.initializePerspectiveOnline();
  }


  /** */
  async probeSemanticTopics(): Promise<Dictionary<string>> {
    const sts = await this.zomeProxy.getAllSemanticTopics();
    for (const tuple of sts) {
      this._allSemanticTopics[encodeHashToBase64(tuple[0])] = tuple[1]
    }
    console.log("probeSemanticTopics()", Object.keys(this._allSemanticTopics).length);
    this.notifySubscribers();
    return this._allSemanticTopics;
  }


  /** */
  async probeThreads(subjectHash: AnyDhtHashB64): Promise<Dictionary<ActionHashB64>> {
    let res = {};
    const ppAhs = await this.zomeProxy.getPpsFromSubjectHash(decodeHashFromBase64(subjectHash));
    let current = this._threadsByTopic[subjectHash];
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
    this._threadsByTopic[subjectHash] = uniq;
    return res;
  }


  // /** */
  // async getAllSubAnchors(anchor: string): Promise<TypedAnchor[]> {
  //   const tas = await this.zomeProxy.getAllSubAnchors(anchor);
  //   /** filter out self ; recursif link edge-case */
  //   //const ftas = tas.filter((ta) => ta.anchor != anchor);
  //   //console.log("getAllSubAnchors()", anchor, tas, ftas)
  //   /** */
  //   return tas;
  // }


  /** Get all beads from a thread */
  async probeAllBeads(ppAhB64: ActionHashB64): Promise<BeadLink[]> {
    if (ppAhB64.length == 0) {
      console.error("probeAllBeads() Failed. ppAh not provided.")
    }
    /** Probe */
    const [interval, beadLinks] = await this.zomeProxy.getAllBeads(decodeHashFromBase64(ppAhB64));
    console.log("probeAllBeads()", TimeInterval.new(interval).toStringSec(), beadLinks)
    /** Store */
    await this.storeItems(ppAhB64, beadLinks);
    /** Done */
    return beadLinks;
  }


  /** */
  private async storeItems(ppAhB64: ActionHashB64, beadLinks: BeadLink[]): Promise<void> {
    console.log("storeItems() len = ", beadLinks.length);
    /** Insert itemLinks in ThreadInfo */
    if (!this._beadsByThread[ppAhB64]) {
      const interval = determineInterval(beadLinks.map((bl) => bl.indexTime))
      this._beadsByThread[ppAhB64] = new ThreadInfo(interval);
    }
    this._beadsByThread[ppAhB64].addItems(beadLinks);
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


  /** */
  async probeLatestBeads(input: GetLatestBeadsInput): Promise<BeadLink[]> {
    if (input.ppAh.length == 0) {
      console.error("probeLatestBeads() Failed. ppAh not provided.")
    }
    /** Probe the latest beads */
    const [_interval, beadLinks] = await this.zomeProxy.getLatestBeads(input);

    /** Cache them */
    await this.storeItems(encodeHashToBase64(input.ppAh), beadLinks);
    /** Done */
    return beadLinks;
  }


  /** - Publish - */

  async publishTextMessage(msg: string, protocolAh: ActionHashB64) : Promise<string> {
    return this.publishTextMessageAt(msg, protocolAh, Date.now() * 1000);
  }


  /** */
  async publishTextMessageAt(msg: string, protocolAh: ActionHashB64, timeUs: Timestamp) : Promise<string> {
    /** Make out bead */
    const bead: Bead = {
      forProtocolAh: decodeHashFromBase64(protocolAh)
    }
    /** Commit Entry */
    const texto = {value: msg, bead}
    const [ah, global_time_anchor, indexTime] = await this.zomeProxy.addTextMessageAt({texto, timeUs});
    const beadLink: BeadLink = {indexTime, creationTime: timeUs, beadAh: ah, beadType: "TextMessage"}
    /** Insert in ThreadInfo */
    await this.storeItems(protocolAh, [beadLink]);
    /** Done */
    return global_time_anchor;
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
  async publishThreadFromSemanticTopic(topicHash: AnyDhtHashB64, purpose: string) : Promise<ActionHashB64> {
    const pp: ParticipationProtocol = {
      purpose,
      topicHash: decodeHashFromBase64(topicHash),
      rules: "FFA",
      topicType: {semanticTopic: null},
    }
    const ah = await this.zomeProxy.createPpFromSemanticTopic(pp);
    const ahB64 = encodeHashToBase64(ah);
    this._allParticipationProtocols[ahB64] = materializeParticipationProtocol(pp);
    if (!this._threadsByTopic[topicHash]) {
      this._threadsByTopic[topicHash] = [];
    }
    this._threadsByTopic[topicHash].push(ahB64);
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

    const th1 = await this.publishThreadFromSemanticTopic(top1, "general");
    console.log("*** generateTestData() general", th1);
    const th2 = await this.publishThreadFromSemanticTopic(top1, "none");
    const th3 = await this.publishThreadFromSemanticTopic(top1, "furnished");
    console.log("*** generateTestData() furnished", th3);
    const th4 = await this.publishThreadFromSemanticTopic(top1, "full");
    const th01 = await this.publishThreadFromSemanticTopic(top2, "general");
    //const th11 = await this.publishThreadFromSemanticTopic(top1, "general");


    await this.publishTextMessage("m1", th01);

    await this.publishTextMessage("first", th1);
    await this.publishTextMessage("second", th1);
    await this.publishTextMessage("third", th1);

    let date_ms = Date.now();
    for (let n = 30; n > 0; n -= 1) {
      await this.publishTextMessageAt("message-" + n, th3, date_ms * 1000);
      date_ms -= 3600 * 1000;
    }

    // for (let n = 0 ;n < 200; n +=1) {
    //   await this.publishTextMessage("m-" + n, th4);
    // }
  }
}
