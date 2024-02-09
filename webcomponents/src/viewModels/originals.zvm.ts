import {Dictionary, ZomeViewModel} from "@ddd-qc/lit-happ";
import {OriginalsProxy} from "../bindings/originals.proxy";
import {AnyLinkableHashB64} from "./threads.perspective";
import {AgentPubKeyB64, encodeHashToBase64} from "@holochain/client";


/** */
export interface OriginalsPerspective {
  types: string[],
  /** typeName -> (hash -> original author)*/
  originalsByType: Dictionary<AnyLinkableHashB64[]>,
  /** hash -> original author */
  allOriginals: Record<AnyLinkableHashB64, AgentPubKeyB64>,
}


/**
 *
 */
export class OriginalsZvm extends ZomeViewModel {

  static readonly ZOME_PROXY = OriginalsProxy;

  get zomeProxy(): OriginalsProxy {
    return this._zomeProxy as OriginalsProxy;
  }

  /* */
  protected hasChanged(): boolean {
    if (!this._previousPerspective) {
      return true;
    }
    let hasChanged = true; // TODO
    return hasChanged;
  }

  /* */
  get perspective(): OriginalsPerspective {
    return {
      types: this._types,
      originalsByType: this._originalsByType,
      allOriginals: this._allOriginals,
    }
  }

  private _types: string[] = [];
  /** typeName -> (hash -> original author)*/
  private _originalsByType: Dictionary<AnyLinkableHashB64[]> = {}
  /** hash -> original author */
  private _allOriginals: Record<AnyLinkableHashB64, AgentPubKeyB64> = {}


  /** -- Get: Return a stored element -- */

  getOriginalAuthor(hash: AnyLinkableHashB64): AgentPubKeyB64 | undefined {
    return this._allOriginals[hash];
  }

  getTypeOriginals(typeName: string): AnyLinkableHashB64[] {
    return this._originalsByType[typeName]? this._originalsByType[typeName] : [];
  }


  /** -- Init -- */

  /** */
  async initializePerspectiveOffline(): Promise<void> {
    // N/A
  }

  /** */
  async initializePerspectiveOnline(): Promise<void> {
    await this.probeTypes();
    await this.probeAllOriginals();
  }
  
  /** */
  probeAllInner() {
    /* await */ this.initializePerspectiveOnline();
  }


  /** -- Probe: Query the DHT, and store the results (async) -- */

  /** */
  async probeTypes(): Promise<void> {
    this._types = await this.zomeProxy.getTypes();
  }


  /** */
  async probeAllOriginals(): Promise<void> {
    const all = await this.zomeProxy.getAllOriginals();
    for (const [type, target, author] of all) {
      this.storeOriginal(type, encodeHashToBase64(target), encodeHashToBase64(author));
    }
  }


  /** -- store -- */

  /** */
  storeOriginal(typeName: string, target: AnyLinkableHashB64, author: AgentPubKeyB64) {
    this._allOriginals[target] = author;
    /* */
    if (!this._originalsByType[typeName]) {
      this._originalsByType[typeName] = []
    }
    if (!this._originalsByType[typeName].includes(target)) {
      this._originalsByType[typeName].push(target);
    }
  }

}
