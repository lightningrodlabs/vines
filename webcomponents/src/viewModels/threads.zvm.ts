import {
  ActionHashB64, AgentPubKeyB64,
  AnyDhtHashB64,
  decodeHashFromBase64,
  encodeHashToBase64,
} from "@holochain/client";
import {
  Bead, BeadLink, GetLatestBeadsInput,
  ParticipationProtocol, TopicTypeType,
  TypedAnchor
} from "../bindings/threads.types";
import {ThreadsProxy} from "../bindings/threads.proxy";
import {Dictionary, ZomeViewModel} from "@ddd-qc/lit-happ";
import {materializeParticipationProtocol, ParticipationProtocolMat, ThreadsPerspective} from "./threads.perspective";




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
      semanticTopics: this._semanticTopics,
      allParticipationProtocols: this._allParticipationProtocols,
      threadsByTopic: this._threadsByTopic,
      latestBeadsByThread: this._latestBeadsByTopic,
      textMessageTuples: this._textMessageTuples,
    };
  }

  /** ah -> SemanticTopics */
  private _semanticTopics: Dictionary<string> = {};
  /** ah -> ParticipationProtocol */
  private _allParticipationProtocols: Dictionary<ParticipationProtocolMat> = {};
  private _threadsByTopic: Dictionary<ActionHashB64[]> = {};
  private _latestBeadsByTopic: Dictionary<BeadLink[]> = {};
  private _textMessageTuples: Dictionary<[number, AgentPubKeyB64, string]> = {};


  /** -- Getters -- */

  getSemanticTopic(ah: ActionHashB64): string | undefined {
    return this._semanticTopics[ah];
  }

  getParticipationProtocol(ah: ActionHashB64): ParticipationProtocolMat | undefined {
    return this._allParticipationProtocols[ah];
  }

  getTextMessageTuple(ah: ActionHashB64): [number, AgentPubKeyB64, string] | undefined {
    return this._textMessageTuples[ah];
  }


  getLatestTextMessageTuples(pp_ah: ActionHashB64): [number, AgentPubKeyB64, string][] {
    const beadLinks = this._latestBeadsByTopic[pp_ah];
    if (!beadLinks) {
      return [];
    }
    const tuples = beadLinks.map((bl) => this._textMessageTuples[encodeHashToBase64(bl.beadAh)]);
    //FIXME tuples.sort((a, b) => {return 1})
    return tuples;
  }


  /** -- Methods -- */

  /** Probe */

  async initializePerspectiveOnline(): Promise<void> {
    await this.probeSemanticTopics();
    let probes = []
    for (const topicAh of Object.keys(this._semanticTopics)) {
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
      this._semanticTopics[encodeHashToBase64(tuple[0])] = tuple[2]
    }
    console.log("probeSemanticTopics()", Object.keys(this._semanticTopics).length);
    this.notifySubscribers();
    return this._semanticTopics;
  }


  /** */
  async probeThreads(lh: AnyDhtHashB64): Promise<Dictionary<ActionHashB64>> {
    let res = {};
    const ppAhs = await this.zomeProxy.getThreads(decodeHashFromBase64(lh));
    let current = this._threadsByTopic[lh];
    if (!current)  current = [];
    // FIXME resolve promise all at once
    for (const ppAh of ppAhs) {
      const ahB64 = encodeHashToBase64(ppAh);
      const pp = await this.zomeProxy.getProtocol(ppAh);
      current.push(ahB64);
      this._allParticipationProtocols[ahB64] = materializeParticipationProtocol(pp);
      res[ahB64] = pp;
    }
    const uniq = [...new Set(current)]; // dedup
    this._threadsByTopic[lh] = uniq;
    return res;
  }


  /** */
  async getAllSubAnchors(anchor: string): Promise<TypedAnchor[]> {
    const tas = await this.zomeProxy.getAllSubAnchors(anchor);
    /** filter out self ; recursif link edge-case */
    //const ftas = tas.filter((ta) => ta.anchor != anchor);
    //console.log("getAllSubAnchors()", anchor, tas, ftas)
    /** */
    return tas;
  }


  /** */
  async probeLatestBeads(input: GetLatestBeadsInput): Promise<BeadLink[]> {
    if (input.ppAh.length == 0) {
      console.error("probeLatestBeads() Failed. ppAh not provided.")
    }
    const beadLinks = await this.zomeProxy.getLatestBeads(input);
    this._latestBeadsByTopic[encodeHashToBase64(input.ppAh)] = beadLinks;

    const beadAhs = beadLinks.map((bl) => bl.beadAh);
    for (const beadAh of beadAhs) {
      const tuple = await this.zomeProxy.getTextMessage(beadAh); // TODO: Implement and use getTextMessageList() instead
      this._textMessageTuples[encodeHashToBase64(beadAh)] = [tuple[0], encodeHashToBase64(tuple[1]), tuple[2]];
    }

    return beadLinks;
  }


  /** Publish */

  /** */
  async publishTextMessage(texto: string, protocolAh: ActionHashB64) : Promise<string> {
    const bead: Bead = {
      protocolAh: decodeHashFromBase64(protocolAh)
    }
    const [ah, global_time_anchor] = await this.zomeProxy.addTextMessage({value: texto, bead});
    const ahB64 = encodeHashToBase64(ah)
    this._latestBeadsByTopic[protocolAh].push({beadAh: ah, beadType: TopicTypeType.SemanticTopic});
    const tuple = await this.zomeProxy.getTextMessage(ah);
    this._textMessageTuples[ahB64] = [tuple[0], encodeHashToBase64(tuple[1]), tuple[2]];;
    this.notifySubscribers();
    return global_time_anchor;
  }


  /** */
  async publishSemanticTopic(title: string) : Promise<ActionHashB64> {
    const ah = await this.zomeProxy.createSemanticTopic({title});
    const ahB64 = encodeHashToBase64(ah);
    this._semanticTopics[ahB64] = title;
    this.notifySubscribers();
    return ahB64;
  }


  /** */
  async publishThreadFromSemanticTopic(topicHash: AnyDhtHashB64, purpose: string) : Promise<ActionHashB64> {
    const pp: ParticipationProtocol = {
      purpose,
      topicHash: decodeHashFromBase64(topicHash),
      rules: "FFA",
      topicType: {semanticTopic: null},
    }
    const ah = await this.zomeProxy.createParticipationProtocolFromSemanticTopic(pp);
    const ahB64 = encodeHashToBase64(ah);
    this._allParticipationProtocols[ahB64] = materializeParticipationProtocol(pp);
    if (!this._threadsByTopic[topicHash]) {
      this._threadsByTopic[topicHash] = [ahB64];
    } else {
      this._threadsByTopic[topicHash].push(ahB64);
    }
    //console.log("publishThreadFromSemanticTopic()", pp)
    this.notifySubscribers();
    return ahB64;
  }

}
