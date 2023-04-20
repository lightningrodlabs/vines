import {
  ActionHashB64,
  AnyDhtHash, AnyDhtHashB64,
  CellId,
  decodeHashFromBase64,
  encodeHashToBase64,
  EntryHashB64
} from "@holochain/client";
import {
  Bead,
  ParticipationProtocol,
  SemanticTopic,
  TopicType, TopicTypeType,
  TopicTypeVariantSemanticTopic, TypedAnchor
} from "../bindings/threads.types";
import {ThreadsProxy} from "../bindings/threads.proxy";
import {Dictionary, ZomeViewModel} from "@ddd-qc/lit-happ";


/** */
export interface ThreadsPerspective {
  semanticTopics: Dictionary<string>
  allParticipationProtocols: Dictionary<ParticipationProtocol>,
  /** TopicEh -> ProtocolAh */
  threadsByTopic: Dictionary<ActionHashB64[]>,
}


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
    };
  }

  /** ah -> SemanticTopics */
  private _semanticTopics: Dictionary<string> = {};
  /** ah -> ParticipationProtocol */
  private _allParticipationProtocols: Dictionary<ParticipationProtocol> = {};
  private _threadsByTopic: Dictionary<ActionHashB64[]> = {};


  getSemanticTopic(ah: ActionHashB64): string | undefined {
    return this._semanticTopics[ah];
  }

  getParticipationProtocol(ah: ActionHashB64): ParticipationProtocol | undefined {
    return this._allParticipationProtocols[ah];
  }

  /** -- Methods -- */

  /** Probe */

  async initializePerspectiveOnline(): Promise<void> {
    await this.probeSemanticTopics();
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
      this._allParticipationProtocols[ahB64] = pp;
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

  /** Publish */

  /** */
  async publishTextMessage(texto: string, protocolAh: ActionHashB64) : Promise<string> {
    const bead: Bead = {
      protocolAh: decodeHashFromBase64(protocolAh)
    }
    const path_str = await this.zomeProxy.addTextMessage({value: texto, bead});
    return path_str;
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
    this._allParticipationProtocols[ahB64] = pp;
    this._threadsByTopic[topicHash].push(ahB64);
    //console.log("publishThreadFromSemanticTopic()", pp)
    this.notifySubscribers();
    return ahB64;
  }

}
