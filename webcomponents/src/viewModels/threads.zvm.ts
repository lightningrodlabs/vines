import {ActionHashB64, CellId, encodeHashToBase64, EntryHashB64} from "@holochain/client";
import {ParticipationProtocol, SemanticTopic} from "../bindings/threads.types";
import {ThreadsProxy} from "../bindings/threads.proxy";
import {Dictionary, ZomeViewModel} from "@ddd-qc/lit-happ";


/** */
export interface ThreadsPerspective {
  semanticTopics: Dictionary<string>
  participationProtocols: Dictionary<ParticipationProtocol>
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


  /** */
  async initializePerspectiveOnline(): Promise<void> {
    // FIXME
  }


  /** */
  probeAllInner() {
    // FIXME
  }


  /** -- Perspective -- */

  /* */
  get perspective(): ThreadsPerspective {
    return {
      semanticTopics: this._semanticTopics,
      participationProtocols: this._participationProtocols,
    };
  }

  /** ah -> SemanticTopics */
  private _semanticTopics: Record<ActionHashB64, string> = {};
  /** ah -> ParticipationProtocol */
  private _participationProtocols: Record<ActionHashB64, ParticipationProtocol> = {};


  getSemanticTopic(ah: ActionHashB64): string | undefined {
    return this._semanticTopics[ah];
  }

  getParticipationProtocol(ah: ActionHashB64): ParticipationProtocol | undefined {
    return this._participationProtocols[ah];
  }

  /** -- Methods -- */

  /** Probe */

  async probeSemanticTopics(): Promise<Dictionary<string>> {
    const sts = await this.zomeProxy.getAllSemanticTopics();
    for (const tuple of sts) {
      this._semanticTopics[encodeHashToBase64(tuple[0])] = tuple[2]
    }
    return this._semanticTopics;
  }


  /** Publish */

  /** */
  async publishSemanticTopic(title: string) : Promise<ActionHashB64> {
    const ah = await this.zomeProxy.createSemanticTopic({title});
    const ahB64 = encodeHashToBase64(ah);
    this._semanticTopics[ahB64] = title;
    this.notifySubscribers();
    return ahB64;
  }

}
