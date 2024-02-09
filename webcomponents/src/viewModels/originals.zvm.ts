import {Dictionary, ZomeViewModel} from "@ddd-qc/lit-happ";
import {OriginalsProxy} from "../bindings/originals.proxy";
import {AnyLinkableHashB64} from "./threads.perspective";
import {
  AgentPubKeyB64,
  decodeHashFromBase64,
  encodeHashToBase64, EntryHashB64
} from "@holochain/client";


/** */
export interface OriginalsPerspective {
  types: string[],
  /** typeName -> (hash -> original author)*/
  originalsByType: Dictionary<AnyLinkableHashB64[]>,
  /** hash -> original author */
  allOriginals: Record<AnyLinkableHashB64, AgentPubKeyB64 | null>,
}


/** TODO: Use more compact format for import/exporting of the perspective */
export interface OriginalsDb {
  allOriginals: Record<AgentPubKeyB64 | null, [AnyLinkableHashB64, string][]>,
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

  getOriginalAuthor(hash: AnyLinkableHashB64): AgentPubKeyB64 | null | undefined {
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


  /** -- Store -- */

  /** */
  storeOriginal(typeName: string, target: AnyLinkableHashB64, author: AgentPubKeyB64 | null) {
    /* _allOriginals */
    this._allOriginals[target] = author;
    /* _originalsByType */
    if (!this._originalsByType[typeName]) {
      this._originalsByType[typeName] = []
    }
    if (!this._originalsByType[typeName].includes(target)) {
      this._originalsByType[typeName].push(target);
    }
    /* _types */
    if (!this._types.includes(typeName)) {
      this._types.push(typeName);
    }
  }


  /** -- Create -- */


  /** */
  createOriginal(type: string, hash: AnyLinkableHashB64, author: AgentPubKeyB64 | null, preventZomeCall?: boolean) {
    if (!preventZomeCall) {
      /*await*/ this.zomeProxy.createOriginalLink({
        target: decodeHashFromBase64(hash),
        targetType: type,
        maybeOriginalAuthor: author == null? undefined : decodeHashFromBase64(author),
      });
    }
    this.storeOriginal(type, hash, author);
  }


  /** */
  async createOriginalFromEntry(eh: EntryHashB64) {
    const [type, author] = await this.zomeProxy.createOriginalLinkFromAppEntry(decodeHashFromBase64(eh));
    this.storeOriginal(type, eh, encodeHashToBase64(author));
  }


  /** Import / Export */

  /** */
  exportPerspective(): string {
    return JSON.stringify(this.perspective, null, 2);
  }


  /** */
  importPerspective(json: string): void {
    const external = JSON.parse(json) as OriginalsPerspective;

    this._originalsByType = external.originalsByType;
    this._types = external.types;
    this._allOriginals = external.allOriginals;

    // for (const appletId of Object.values(external.allAppletIds)) {
    //   this._allAppletIds.push(appletId);
    // }
  }


}
