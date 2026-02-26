import {Timestamp} from "@holochain/client";
import {GetStrategy} from "@holochain-open-dev/core-types";
import {
    AgentId,
    EntryId,
    holoIdReviver,
    intoLinkableId,
    LinkableId,
    ZomeViewModel
} from "@ddd-qc/lit-happ";
import {AuthorshipProxy} from "../bindings/authorship.proxy";
import {AuthorshipPerspective, AuthorshipPerspectiveMutable, AuthorshipSnapshot} from "./authorship.perspective";


/** */
export class AuthorshipZvm extends ZomeViewModel {

  static override readonly ZOME_PROXY = AuthorshipProxy;

  get zomeProxy(): AuthorshipProxy {
    return this._zomeProxy as AuthorshipProxy;
  }


  /** -- ViewModel -- */

  private _perspective: AuthorshipPerspectiveMutable = new AuthorshipPerspectiveMutable();

  /** */
  get perspective(): AuthorshipPerspective {
    return this._perspective.readonly;
  }


  /** Dump perspective as JSON  (caller should call getAllPublicManifest() first) */
  export(/*originalsZvm: AuthorshipZvm*/): string {
    const snapshot = this._perspective.makeSnapshot();
    return JSON.stringify(snapshot, null, 2);
  }

  /** */
  import(json: string, _canPublish: boolean) {
    const snapshot = JSON.parse(json, holoIdReviver) as AuthorshipSnapshot;
    // if (canPublish) {
    // }
    this._perspective.restore(snapshot)
  }


  /** -- Init -- */

  /** */
  override async initializePerspectiveFromLocal(): Promise<void> {
      await this.probeTypes(GetStrategy.Local);
      await this.probeAllLogs(GetStrategy.Local);
  }

  /** */
  override async initializePerspectiveFromNetwork(): Promise<void> {
    await this.probeTypes(GetStrategy.Network);
    await this.probeAllLogs(GetStrategy.Network);
  }

  /** */
  override probeAllInner() {
    this.initializePerspectiveFromLocal().then(() => {
        console.trace("AuthorshipZvm.probeAllInner() DONE");
      })
  }


  /** -- Probe: Query the DHT, and store the results (async) -- */

  /** */
  async probeTypes(strategy: GetStrategy): Promise<void> {
    const allTypes = await this.zomeProxy.getAllAscribedTypes(strategy);
    this._perspective.storeTypes(allTypes);
  }


  /** */
  async probeAllLogs(_strategy: GetStrategy): Promise<void> {
    const all = await this.zomeProxy.getAllAscribedEntries(/*strategy*/);
    for (const [type, target, ts, author] of all) {
      const authorId = new AgentId(author);
      this._perspective.storeAuthorshipLog(type, intoLinkableId(target), ts, authorId);
    }
  }


  /** -- Create -- */


  /** */
  async ascribeTarget(type: string, anyId: LinkableId, creationTime: Timestamp, author: AgentId, preventZomeCall?: boolean) {
    if (!preventZomeCall) {
      await this.zomeProxy.ascribeTarget({
        target: anyId.hash,
        target_type: type,
        original_creation_time: creationTime,
        original_author: author.hash,
      });
    }
    this._perspective.storeAuthorshipLog(type, anyId, creationTime, author);
  }


  /** */
  async ascribeAppEntry(eh: EntryId) {
    const [ts, author, type] = await this.zomeProxy.ascribeAppEntry(eh.hash);
    //const a = authorB64 == EmptyAuthor? null : authorB64;
    this._perspective.storeAuthorshipLog(type, eh, ts, new AgentId(author));
  }
}
