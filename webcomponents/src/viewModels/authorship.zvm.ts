import {
  AgentId,
  AgentIdMap,
  Dictionary,
  EntryId,
  intoLinkableId,
  LinkableId,
  AnyIdMap,
  ZomeViewModel
} from "@ddd-qc/lit-happ";
import {Timestamp} from "@holochain/client";
import {AuthorshipProxy} from "../bindings/authorship.proxy";


let EMPTY_AUTHOR = AgentId.empty();
//fakeAgentPubKey(0).then((res) => EMPTY_AUTHOR = encodeHashToBase64(res));


/** */
export interface AuthorshipPerspective {
  ascribedTypes: string[],
  /** typeName -> (hash -> original author)*/
  logsByType: Dictionary<LinkableId[]>,
  /** hash -> original author */
  allLogs: AnyIdMap<[Timestamp, AgentId | null]>,
}

export function createAuthorshipPerspective(): AuthorshipPerspective {
  return {
    ascribedTypes: [],
    logsByType: {},
    allLogs: new AnyIdMap(),
  }
}


// /** TODO: Use more compact format for import/exporting of the perspective */
// export interface AuthorshipDatabase {
//   allAuthorshipLogs: AgentIdMap<[AnyLinkableHashB64, Timestamp, string][]>,
// }



/**
 *
 */
export class AuthorshipZvm extends ZomeViewModel {

  static readonly ZOME_PROXY = AuthorshipProxy;

  get zomeProxy(): AuthorshipProxy {
    return this._zomeProxy as AuthorshipProxy;
  }


  /** -- ViewModel -- */

  private _perspective: AuthorshipPerspective = createAuthorshipPerspective();

  /* */
  protected hasChanged(): boolean {
    if (!this._previousPerspective) {
      return true;
    }
    let hasChanged = true; // TODO
    return hasChanged;
  }

  /* */
  get perspective(): AuthorshipPerspective {
    return this._perspective;
  }


  /** -- Get: Return a stored element -- */

  getAuthor(hash: LinkableId): [Timestamp, AgentId | null] | undefined {
    return this._perspective.allLogs.get(hash.b64);
  }

  getTypeLogs(typeName: string): LinkableId[] {
    return this._perspective.logsByType[typeName]? this._perspective.logsByType[typeName] : [];
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
    this._perspective.ascribedTypes = await this.zomeProxy.getAllAscribedTypes();
  }


  /** */
  async probeAllLogs(): Promise<void> {
    const all = await this.zomeProxy.getAllAscribedEntries();
    for (const [type, target, ts, author] of all) {
      const authorId = new AgentId(author);
      const a = authorId.equals(EMPTY_AUTHOR)? null : authorId;
      this.storeAuthorshipLog(type, intoLinkableId(target), ts, a);
    }
  }


  /** -- Store -- */

  /** */
  storeAuthorshipLog(typeName: string, target: LinkableId, creationTime: Timestamp, author: AgentId | null) {
    /* _allOriginals */
    this._perspective.allLogs[target.b64] = [creationTime, author];
    /* _originalsByType */
    if (!this._perspective.logsByType[typeName]) {
      this._perspective.logsByType[typeName] = []
    }
    if (!this._perspective.logsByType[typeName].map((id) => id.b64).includes(target.b64)) {
      this._perspective.logsByType[typeName].push(target);
    }
    /* _types */
    if (!this._perspective.ascribedTypes.includes(typeName)) {
      this._perspective.ascribedTypes.push(typeName);
    }
  }


  /** -- Create -- */


  /** */
  async ascribeTarget(type: string, anyId: LinkableId, creationTime: Timestamp, author: AgentId | null, preventZomeCall?: boolean) {
    if (!preventZomeCall) {
      await this.zomeProxy.ascribeTarget({
        target: anyId.hash,
        target_type: type,
        creation_time: creationTime,
        maybe_original_author: author == null? undefined : author.hash,
      });
    }
    this.storeAuthorshipLog(type, anyId, creationTime, author);
  }


  /** */
  async ascribeAppEntry(eh: EntryId) {
    const [ts, author, type] = await this.zomeProxy.ascribeAppEntry(eh.hash);
    //const a = authorB64 == EmptyAuthor? null : authorB64;
    this.storeAuthorshipLog(type, eh, ts, new AgentId(author));
  }


  /** -- mport / Export -- */

  /** */
  exportPerspective(): string {
    return JSON.stringify(this.perspective, null, 2);
  }


  /** */
  importPerspective(json: string): void {
    const external = JSON.parse(json) as AuthorshipPerspective;
    /* */
    this._perspective.logsByType = external.logsByType;
    this._perspective.ascribedTypes = external.ascribedTypes;
    this._perspective.allLogs = external.allLogs;

    // for (const appletId of Object.values(external.allAppletIds)) {
    //   this._allAppletIds.push(appletId);
    // }
  }
}
