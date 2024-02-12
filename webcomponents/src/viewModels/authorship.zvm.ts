import {Dictionary, ZomeViewModel} from "@ddd-qc/lit-happ";
import {AnyLinkableHashB64} from "./threads.perspective";
import {
  AgentPubKeyB64,
  decodeHashFromBase64,
  encodeHashToBase64, EntryHashB64, fakeAgentPubKey, Timestamp
} from "@holochain/client";
import {AuthorshipProxy} from "../bindings/authorship.proxy";


let EMPTY_AUTHOR = "";
fakeAgentPubKey(0).then((res) => EMPTY_AUTHOR = encodeHashToBase64(res));


/** */
export interface OriginalsPerspective {
  ascribedTypes: string[],
  /** typeName -> (hash -> original author)*/
  logsByType: Dictionary<AnyLinkableHashB64[]>,
  /** hash -> original author */
  allLogs: Record<AnyLinkableHashB64, [Timestamp, AgentPubKeyB64 | null]>,
}


/** TODO: Use more compact format for import/exporting of the perspective */
export interface AuthorshipDatabase {
  allAuthorshipLogs: Record<AgentPubKeyB64 | null, [AnyLinkableHashB64, Timestamp, string][]>,
}



/**
 *
 */
export class AuthorshipZvm extends ZomeViewModel {

  static readonly ZOME_PROXY = AuthorshipProxy;

  get zomeProxy(): AuthorshipProxy {
    return this._zomeProxy as AuthorshipProxy;
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
      ascribedTypes: this._ascribedTypes,
      logsByType: this._logsByType,
      allLogs: this._allLogs,
    }
  }

  private _ascribedTypes: string[] = [];
  /** typeName -> (hash -> original author)*/
  private _logsByType: Dictionary<AnyLinkableHashB64[]> = {}
  /** hash -> original author */
  private _allLogs: Record<AnyLinkableHashB64, [Timestamp, AgentPubKeyB64 | null]> = {}


  /** -- Get: Return a stored element -- */

  getAuthor(hash: AnyLinkableHashB64): [Timestamp, AgentPubKeyB64 | null] | undefined {
    return this._allLogs[hash];
  }

  getTypeLogs(typeName: string): AnyLinkableHashB64[] {
    return this._logsByType[typeName]? this._logsByType[typeName] : [];
  }


  /** -- Init -- */

  /** */
  async initializePerspectiveOffline(): Promise<void> {
    // N/A
  }

  /** */
  async initializePerspectiveOnline(): Promise<void> {
    await this.probeTypes();
    await this.probeAllLogs();
  }

  /** */
  probeAllInner() {
    /* await */ this.initializePerspectiveOnline();
  }


  /** -- Probe: Query the DHT, and store the results (async) -- */

  /** */
  async probeTypes(): Promise<void> {
    this._ascribedTypes = await this.zomeProxy.getAllAscribedTypes();
  }


  /** */
  async probeAllLogs(): Promise<void> {
    const all = await this.zomeProxy.getAllAscribedEntries();
    for (const [type, target, ts, author] of all) {
      const authorB64 = encodeHashToBase64(author);
      const a = authorB64 == EMPTY_AUTHOR? null : authorB64;
      this.storeAuthorshipLog(type, encodeHashToBase64(target), ts, a);
    }
  }


  /** -- Store -- */

  /** */
  storeAuthorshipLog(typeName: string, target: AnyLinkableHashB64, creationTime: Timestamp, author: AgentPubKeyB64 | null) {
    /* _allOriginals */
    this._allLogs[target] = [creationTime, author];
    /* _originalsByType */
    if (!this._logsByType[typeName]) {
      this._logsByType[typeName] = []
    }
    if (!this._logsByType[typeName].includes(target)) {
      this._logsByType[typeName].push(target);
    }
    /* _types */
    if (!this._ascribedTypes.includes(typeName)) {
      this._ascribedTypes.push(typeName);
    }
  }


  /** -- Create -- */


  /** */
  ascribeTarget(type: string, hash: AnyLinkableHashB64, creationTime: Timestamp, author: AgentPubKeyB64 | null, preventZomeCall?: boolean) {
    if (!preventZomeCall) {
      /*await*/ this.zomeProxy.ascribeTarget({
        target: decodeHashFromBase64(hash),
        target_type: type,
        creation_time: creationTime,
        maybe_original_author: author == null? undefined : decodeHashFromBase64(author),
      });
    }
    this.storeAuthorshipLog(type, hash, creationTime, author);
  }


  /** */
  async ascribeAppEntry(eh: EntryHashB64) {
    const [ts, author, type] = await this.zomeProxy.ascribeAppEntry(decodeHashFromBase64(eh));
    const authorB64 = encodeHashToBase64(author);
    //const a = authorB64 == EmptyAuthor? null : authorB64;
    this.storeAuthorshipLog(type, eh, ts, authorB64);
  }


  /** -- mport / Export -- */

  /** */
  exportPerspective(): string {
    return JSON.stringify(this.perspective, null, 2);
  }


  /** */
  importPerspective(json: string): void {
    const external = JSON.parse(json) as OriginalsPerspective;
    /* */
    this._logsByType = external.logsByType;
    this._ascribedTypes = external.ascribedTypes;
    this._allLogs = external.allLogs;

    // for (const appletId of Object.values(external.allAppletIds)) {
    //   this._allAppletIds.push(appletId);
    // }
  }


}
