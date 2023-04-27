import {Dictionary} from "@ddd-qc/lit-happ";
import {AgentPubKeyB64} from "@holochain/client";
import {BeadLink} from "../bindings/threads.types";
import {TimeInterval} from "./timeInterval";

//import "functional-red-black-tree";
import createRBTree, {Tree} from "functional-red-black-tree";


export type TextMessageItem = [number, AgentPubKeyB64, string];


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

  private _beadLinksTree: Tree<number, BeadLink>;


  /** Ctor */
  constructor(interval: TimeInterval) {
    this._searchedTimeInterval = interval;
    //this._messageItems = items;

    //this._beadLinksTree = new RBTree((a: BeadLink, b: BeadLink) => a.bucketTime - b.bucketTime);
    this._beadLinksTree = createRBTree();
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
      if (!searchInterval) {
        searchInterval = determineInterval(newItems.map((item) => item.bucketTime));
      }
      let union = this._searchedTimeInterval.union(searchInterval);
      if (!union) {
        throw Error("ThreadInfo.addMessages() Failed. New message time interval do not overlap with current searchInterval")
      }

      this._searchedTimeInterval = union;

      for (const bl of Object.values(newItems)) {
        this._beadLinksTree.insert(bl.bucketTime, bl);
      }
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
    return [];
  }

  /** Return all items between these time values */
  getBetween(begin: number, end: number): BeadLink[] {
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





