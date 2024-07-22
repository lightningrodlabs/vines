import {AgentId, AnyIdMap, Dictionary, intoLinkableId, LinkableId} from "@ddd-qc/lit-happ";
import {AgentPubKeyB64, Timestamp} from "@holochain/client";
import {AnyLinkableHashB64} from "@ddd-qc/path-explorer/dist/utils";



/**  */
export interface AuthorshipSnapshot {
  /** type -> Hash, timestamp, Author */
  allAuthorshipLogs: Dictionary<[AnyLinkableHashB64, Timestamp, AgentPubKeyB64][]>,
}


/** */
export class AuthorshipPerspectiveCore {
  protected _ascribedTypes: string[] = [];
  /** typeName -> (hash -> original author) */
  protected _logsByType: Dictionary<LinkableId[]> = {};
  /** hash -> original author */
  protected _allLogs: AnyIdMap<[Timestamp, AgentId | null]> = new AnyIdMap();


  /** -- Getters -- */

  getAuthor(hash: LinkableId): [Timestamp, AgentId | null] | undefined {
    return this._allLogs.get(hash.b64);
  }

  getTypeLogs(typeName: string): LinkableId[] {
    return this._logsByType[typeName]? this._logsByType[typeName] : [];
  }
}



/** Live app form */
export class AuthorshipPerspective extends AuthorshipPerspectiveCore {

  /** -- Getters -- */

  get core(): AuthorshipPerspectiveCore {
    return this;
  }


  /** -- Store -- */

  /** */
  storeTypes(allTypes: string[]) {
    this._ascribedTypes = allTypes;
  }

  /** */
  storeAuthorshipLog(typeName: string, target: LinkableId, creationTime: Timestamp, author: AgentId | null) {
    /* _allOriginals */
    this._allLogs[target.b64] = [creationTime, author];
    /* _originalsByType */
    if (!this._logsByType[typeName]) {
      this._logsByType[typeName] = []
    }
    if (!this._logsByType[typeName].map((id) => id.b64).includes(target.b64)) {
      this._logsByType[typeName].push(target);
    }
    /* _types */
    if (!this._ascribedTypes.includes(typeName)) {
      this._ascribedTypes.push(typeName);
    }
  }

  /** -- Memento -- */

  /** TODO: deep copy */
  makeSnapshot(): AuthorshipSnapshot {
    let allAuthorshipLogs = {};
    for (const [type, hashs] of Object.entries(this._logsByType)) {
      allAuthorshipLogs[type] = [];
      for (const hash of hashs) {
        const log = this._allLogs.get(hash.b64);
        if (log) {
          allAuthorshipLogs[type].push(hash, log[0], log[1].b64)
        }
      }
    }
    return {allAuthorshipLogs}
  }


  /** */
  restore(snapshot: AuthorshipSnapshot) {
    /** Clear */
    this._ascribedTypes = []
    this._logsByType = {};
    this._allLogs.clear();
    /** Store */
    for (const [type, logs] of Object.entries(snapshot.allAuthorshipLogs)) {
      for (const [hashB64, ts, agentB64] of logs) {
        this.storeAuthorshipLog(type, intoLinkableId(hashB64), ts, new AgentId(agentB64));
      }
    }
  }
}
