import {
  AgentId,
  AnyIdMap,
  assertAllDefined,
  assertIsDefined,
  Dictionary,
  intoLinkableId,
  LinkableId
} from "@ddd-qc/lit-happ";
import {AgentPubKeyB64, Timestamp} from "@holochain/client";
import {AnyLinkableHashB64} from "@ddd-qc/path-explorer/dist/utils";



/**  */
export interface AuthorshipSnapshot {
  /** type -> Hash, timestamp, Author */
  all: Dictionary<[AnyLinkableHashB64, Timestamp, AgentPubKeyB64][]>,
}


/** */
export class AuthorshipPerspective {
   ascribedTypes: string[] = [];
  /** typeName -> (hash -> original author) */
  logsByType: Dictionary<LinkableId[]> = {};
  /** hash -> original author */
  allLogs: AnyIdMap<[Timestamp, AgentId]> = new AnyIdMap();


  /** -- Getters -- */

  getAuthor(hash: LinkableId): [Timestamp, AgentId] | undefined {
    return this.allLogs.get(hash.b64);
  }

  getTypeLogs(typeName: string): LinkableId[] {
    return this.logsByType[typeName]? this.logsByType[typeName] : [];
  }

  /** -- Memento -- */

  /** TODO: deep copy */
  makeSnapshot(): AuthorshipSnapshot {
    let all: Dictionary<[AnyLinkableHashB64, Timestamp, AgentPubKeyB64][]> = {};
    for (const [type, hashs] of Object.entries(this.logsByType)) {
      all[type] = [];
      for (const hash of hashs) {
        const log = this.allLogs.get(hash.b64);
        if (log) {
          all[type].push([hash.b64, log[0], log[1].b64]);
        }
      }
    }
    return {all}
  }
}



/** Live app form */
export class AuthorshipPerspectiveMutable extends AuthorshipPerspective {

  get readonly(): AuthorshipPerspective {
    return this;
  }


  /** -- Store -- */

  /** */
  storeTypes(allTypes: string[]) {
    assertIsDefined(allTypes);
    this.ascribedTypes = allTypes;
  }

  /** */
  storeAuthorshipLog(typeName: string, target: LinkableId, creationTime: Timestamp, author: AgentId) {
    assertAllDefined(typeName, target, creationTime, author);
    /* _allOriginals */
    this.allLogs.set(target.b64, [creationTime, author]);
    /* _originalsByType */
    if (!this.logsByType[typeName]) {
      this.logsByType[typeName] = []
    }
    if (!this.logsByType[typeName].map((id) => id.b64).includes(target.b64)) {
      this.logsByType[typeName].push(target);
    }
    /* _types */
    if (!this.ascribedTypes.includes(typeName)) {
      this.ascribedTypes.push(typeName);
    }
  }


  /** -- Memento -- */

  /** */
  restore(snapshot: AuthorshipSnapshot) {
    /** Clear */
    this.ascribedTypes = []
    this.logsByType = {};
    this.allLogs.clear();
    /** Store */
    for (const [type, logs] of Object.entries(snapshot.all)) {
      for (const [hashB64, ts, agentB64] of logs) {
        this.storeAuthorshipLog(type, intoLinkableId(hashB64), ts, new AgentId(agentB64));
      }
    }
  }
}
