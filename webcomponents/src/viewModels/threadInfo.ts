import {AgentPubKeyB64, Timestamp} from "@holochain/client";
import {BeadLink} from "../bindings/threads.types";
import {TimeInterval} from "./timeInterval";

/** From https://github.com/mikolalysenko/functional-red-black-tree */
import createRBTree, {Tree} from "functional-red-black-tree";
import {Base64} from "js-base64";


export type TextMessageItem = [number, AgentPubKeyB64, string];


/** Importing this holochain will cause jest to fail */
function encodeHashToBase64(hash) {
  return `u${Base64.fromUint8Array(hash, true)}`;
}


/** */
export function determineInterval(tss: number[]): TimeInterval {
  let beginning = 0;
  let end = 0;
  for (const ts of Object.values(tss)) {
    if (ts < beginning) {
      beginning = ts;
      continue;
    }
    if (ts > end) {
      end = ts;
      continue;
    }
  }
  return new TimeInterval(beginning, end);
}


/**
 *
 */
export class ThreadInfo {

  /* Time interval of the searched messages */
  private _searchedTimeInterval: TimeInterval;
  /* ah -> TextMessageItem */
  //private _messageItems: Dictionary<TextMessageItem>;

  /** Tree of BeadLinks keyed by creation time */
  private _beadLinksTree: Tree<number, BeadLink>;


  /** Ctor */
  constructor(interval: TimeInterval) {
    this._searchedTimeInterval = interval;
    //this._messageItems = items;

    //this._beadLinksTree = new RBTree((a: BeadLink, b: BeadLink) => a.bucketTime - b.bucketTime);
    this._beadLinksTree = createRBTree();
    //this._beadLinksTree = createRBTree((a, b) => b - a);
  }


  /** -- Getters -- */
  get searchedTimeInterval(): TimeInterval { return this._searchedTimeInterval}
  //get messageItems(): Dictionary<TextMessageItem> { return this._messageItems}

  get beadLinksTree(): Tree<number, BeadLink> { return this._beadLinksTree}


  /** -- Methods -- */

  /** */
  checkIntegrity(): boolean {
    const treeInterval = new TimeInterval(this._beadLinksTree.begin.key, this._beadLinksTree.end.key);
    return treeInterval.isWithin(this._searchedTimeInterval);
  }


  /**  New Items must have overlapping timeInterval with current searchInterval */
  addItems(newItems: BeadLink[], searchInterval?: TimeInterval): void {
    console.log("ThreadInfo.addItems()", newItems.length)
    this.print();

      if (!searchInterval) {
        searchInterval = determineInterval(newItems.map((item) => item.indexTime));
      }
      // let union = this._searchedTimeInterval.union(searchInterval);
      // if (!union) {
      //   throw Error("ThreadInfo.addMessages() Failed. New message time interval do not overlap with current searchInterval")
      // }

      this._searchedTimeInterval = searchInterval; // union;

      for (const bl of Object.values(newItems)) {
        if (this.has(bl)) {
          continue;
        }
        console.log("ThreadInfo.addItems().inserting at", bl.creationTime, encodeHashToBase64(bl.beadAh))
        this._beadLinksTree = this._beadLinksTree.insert(bl.creationTime, bl);
      }
    console.log("ThreadInfo.addItems() tree size =", this._beadLinksTree.length, this._beadLinksTree.keys.length);
  }


  /** */
  print(): void {
    console.log("BeadLinksTree:");
    this._beadLinksTree.forEach(
      ((k, bl) => {
        console.log(`\t[${k}]`, encodeHashToBase64(bl.beadAh), bl.beadType);
      }));
  }


  /** */
  has(candidat: BeadLink): boolean {
    const bls = this.getAtBucket(candidat.creationTime);
    const candidatHash = encodeHashToBase64(candidat.beadAh);
    //console.log("has?", candidat.bucketTime, candidatHash, candidat.beadType);
    for (const bl of bls) {
      const blHash =  encodeHashToBase64(bl.beadAh);
      //console.log(`\t[${bl.bucketTime}]`, blHash, bl.beadType);
      if (blHash == candidatHash) {
        return true;
      }
    }
    //console.log("has? NO");
    return false;
  }

  /** */
  getAtBucket(bucket_begin_time_us: Timestamp): BeadLink[] {
    let res = [];
    this._beadLinksTree.forEach(
      ((k, v) => {res.push(v)}),
      bucket_begin_time_us,
      bucket_begin_time_us + 1);
    return res;
  }



  /** TODO API */
  /** CAUTIOUS between precise time and bucket rounded time */

  /** Return all items */
  getAll(): BeadLink[] {
    return this._beadLinksTree.values;
  }

  /** Return the last n items */
  getLast(n: number): BeadLink[] {
    let it = this.beadLinksTree.end;
    if (!it.value) {
      return [];
    }
    let res = [];
    for (let i = 0; i < n; i++) {
      res.push(it.value);
      if (!it.hasPrev) {
        break;
      }
      it.prev();
    }
    console.debug(`getLast(${n}): found `, res.length, res);
    return res;
  }


  /** Return the first n items */
  getFirst(n: number): BeadLink[] {
    let it = this.beadLinksTree.begin;
    if (!it.value) {
      return [];
    }
    let res = [];
    for (let i = 0; i < n; i++) {
      res.push(it.value);
      if (!it.hasNext) {
        break;
      }
      it.next();
    }
    console.debug(`getFirst(${n}): found `, res.length, res);
    return res;
  }


  /** Return all items between these time values */
  getBetween(begin: number, end: number): BeadLink[] {
    // tree.forEach(visitor(key,value)[, lo[, hi]])
    return [];
  }


  /** Return the first n items starting from */
  getNext(begin: number): BeadLink[] {
    return [];
  }


  /** Return the first n items before */
  getPrev(begin: number): BeadLink[] {
    return [];
  }
}





