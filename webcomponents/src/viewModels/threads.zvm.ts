import {
  ActionHash,
  ActionHashB64, AgentPubKeyB64,
  AnyDhtHashB64,
  decodeHashFromBase64,
  encodeHashToBase64, EntryHashB64,
} from "@holochain/client";
import {
  Bead, BeadLink, GetLatestBeadsInput,
  ParticipationProtocol, SEMANTIC_TOPIC_TYPE_NAME, TopicTypeType,
  TypedAnchor
} from "../bindings/threads.types";
import {ThreadsProxy} from "../bindings/threads.proxy";
import {Dictionary, ZomeViewModel} from "@ddd-qc/lit-happ";
import {materializeParticipationProtocol, ParticipationProtocolMat, ThreadsPerspective} from "./threads.perspective";
import {determineInterval, ThreadInfo} from "./thread.info";




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
      textMessageTuples: this._textMessageTuples,
    };
  }


  /** ah -> SemanticTopics */
  private _allSemanticTopics: Dictionary<string> = {};
  /** ah -> ParticipationProtocol */
  private _allParticipationProtocols: Dictionary<ParticipationProtocolMat> = {};
  /** ah -> [timestamp, author, message] */
  private _textMessageTuples: Dictionary<[number, AgentPubKeyB64, string]> = {};

  private _threadsByTopic: Dictionary<ActionHashB64[]> = {};


  private _beadsByThread: Dictionary<ThreadInfo> = {};


  /** -- Getters -- */

  getSemanticTopic(ah: ActionHashB64): string | undefined {
    return this._allSemanticTopics[ah];
  }

  getParticipationProtocol(ah: ActionHashB64): ParticipationProtocolMat | undefined {
    return this._allParticipationProtocols[ah];
  }

  getTextMessageTuple(ah: ActionHashB64): [number, AgentPubKeyB64, string] | undefined {
    return this._textMessageTuples[ah];
  }


  getLatestTextMessages(pp_ah: ActionHashB64): [number, AgentPubKeyB64, string][] {
    const threadInfo = this._beadsByThread[pp_ah];
    if (!threadInfo) {
      return [];
    }
    const bead_ahs = threadInfo.beadLinksTree.reach((bl) => bl.beadAh);
    //const tuples = bead_ahs.map((ah) => this._textMessageTuples[encodeHashToBase64(ah)]);
    //FIXME tuples.sort((a, b) => {return 1})
    return [];
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
    const beadLinks = await this.zomeProxy.getAllBeads(decodeHashFromBase64(ppAhB64));
    /** Store */
    await this.storeItems(ppAhB64, beadLinks);
    /** Done */
    return beadLinks;
  }


  /** */
  private async storeItems(ppAhB64: ActionHashB64, beadLinks: BeadLink[]): Promise<void> {
    /** Insert them in ThreadInfo */
    if (!this._beadsByThread[ppAhB64]) {
      const interval = determineInterval(beadLinks.map((bl) => bl.bucketTime))
      this._beadsByThread[ppAhB64] = new ThreadInfo(interval);
    }
    this._beadsByThread[ppAhB64].addItems(beadLinks);
    /** Grab the actual items and cache them */
    const beadAhs = beadLinks.map((bl) => bl.beadAh);
    for (const beadAh of beadAhs) {
      const tuple = await this.zomeProxy.getTextMessage(beadAh); // TODO: Implement and use getTextMessageList() instead
      this._textMessageTuples[encodeHashToBase64(beadAh)] = [tuple[0], encodeHashToBase64(tuple[1]), tuple[2]];
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
    const beadLinks = await this.zomeProxy.getLatestBeads(input);
    /** Cache them */
    await this.storeItems(encodeHashToBase64(input.ppAh), beadLinks);
    /** Done */
    return beadLinks;
  }


  /** - Publish - */

  /** */
  async publishTextMessage(texto: string, protocolAh: ActionHashB64) : Promise<string> {
    /** Make out bead */
    const bead: Bead = {
      forProtocolAh: decodeHashFromBase64(protocolAh)
    }
    /** Commit Entry */
    const [ah, global_time_anchor, bucketTime] = await this.zomeProxy.addTextMessage({value: texto, bead});
    const beadLink = {bucketTime, beadAh: ah, beadType: TopicTypeType.SemanticTopic}
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
    await this.publishTextMessage("first post", th1);
    await this.publishTextMessage("second", th1);

    for (let n = 0 ;n < 30; n +=1) {
      await this.publishTextMessage("message-" + n, th3);
    }

    // for (let n = 0 ;n < 200; n +=1) {
    //   await this.publishTextMessage("m-" + n, th4);
    // }
  }
}
