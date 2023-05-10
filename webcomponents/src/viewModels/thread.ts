import {ActionHashB64, Timestamp} from "@holochain/client";
import {TimeInterval} from "./timeInterval";

/** From https://github.com/mikolalysenko/functional-red-black-tree */
import createRBTree, {Tree} from "functional-red-black-tree";
import {Base64} from "js-base64";
import {BeadLinkMaterialized, HOLOCHAIN_EPOCH} from "./threads.perspective";


/** Importing this from holochain will cause jest to fail */
function encodeHashToBase64(hash: Uint8Array) {
  return `u${Base64.fromUint8Array(hash, true)}`;
}


/** */
export function determineIntervalFromTimestamps(tss: number[]): TimeInterval {
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
 * Holds BinaryTree of BeadLinks and searchIntervals
 */
export class Thread {

  /* Time interval of the searched messages */
  private _searchedTimeIntervals: [Timestamp, TimeInterval][];
  /* ah -> TextMessageItem */
  //private _messageItems: Dictionary<TextMessageItem>;

  /** Tree of BeadLinks keyed by creation time */
  private _beadLinksTree: Tree<number, BeadLinkMaterialized>;

  /** Flag if first node is the oldest node possible */
  private _beginningOfTime?: Timestamp;



  /** Ctor */
  //[Date.now() * 1000, interval]
  constructor() {
    this._searchedTimeIntervals = [];
    //this._messageItems = items;

    this._beadLinksTree = createRBTree();
    //this._beadLinksTree = createRBTree((a, b) => b - a);
  }


  /** -- Getters -- */
  get searchedTimeIntervals(): [Timestamp, TimeInterval][] { return this._searchedTimeIntervals}
  //get messageItems(): Dictionary<TextMessageItem> { return this._messageItems}

  get beadLinksTree(): Tree<number, BeadLinkMaterialized> { return this._beadLinksTree}

  get beginningOfTime(): Timestamp | undefined { return this._beginningOfTime}

  get searchedUnion(): TimeInterval | null {
    if (this.searchedTimeIntervals.length == 0) {
      return null;
    }
    let union = this.searchedTimeIntervals[0][1];
    for (const [_ts, interval] of this.searchedTimeIntervals) {
      if (interval.isInstant()) {
        continue;
      }
      union = union.union(interval);
    }
    return union;
  }


  /** -- Methods -- */

  /**
   * Set beginning of time to the oldest bead (i.e. first bead in the tree) if there is one,
   * otherwise use EPOCH (FIXME: dna origin)
   */
  setBeginningOfTime(): void {
    if (!this._beginningOfTime && this._beadLinksTree.begin.key) {
      this._beginningOfTime = this._beadLinksTree.begin.key
    } else {
      this._beginningOfTime = HOLOCHAIN_EPOCH; // FIXME should be DNA.origin_time
    }
  }


  // /**  New Items must have overlapping timeInterval with current searchInterval */
  // addItems(newItems: BeadLink[], searchedInterval?: TimeInterval): void {
  //   console.log("ThreadInfo.addItems()", newItems.length)
  //   this.print();
  //
  //   if (!searchedInterval) {
  //     searchedInterval = determineIntervalFromTimestamps(newItems.map((item) => item.indexTime));
  //   }
  //   // let union = this._searchedTimeInterval.union(searchInterval);
  //   // if (!union) {
  //   //   throw Error("ThreadInfo.addMessages() Failed. New message time interval do not overlap with current searchInterval")
  //   // }
  //
  //   /** Don't add 'Instant' interval */
  //   if (searchedInterval.end != searchedInterval.begin) {
  //     this._searchedTimeIntervals.push([Date.now() * 1000, searchedInterval]); // union;
  //   }
  //
  //   for (const bl of Object.values(newItems)) {
  //     if (this.has(bl)) {
  //       continue;
  //     }
  //     console.log("ThreadInfo.addItems().inserting at", bl.creationTime, encodeHashToBase64(bl.beadAh))
  //     this._beadLinksTree = this._beadLinksTree.insert(bl.creationTime, bl);
  //   }
  //   console.log("ThreadInfo.addItems() tree size =", this._beadLinksTree.length, this._beadLinksTree.keys.length);
  // }

  /**  */
  addItem(blMat: BeadLinkMaterialized): void {
    console.log("ThreadInfo.addItem()", blMat.beadAh)
    this.print();
    if (this.has(blMat)) {
      return;
    }
    console.log("ThreadInfo.addItem().inserting at", blMat.creationTime, blMat.beadAh)
    this._beadLinksTree = this._beadLinksTree.insert(blMat.creationTime, blMat);
    console.log("ThreadInfo.addItem() tree size =", this._beadLinksTree.length, this._beadLinksTree.keys.length);
  }


  /** */
  addSearchedInterval(searchedInterval: TimeInterval): void {
    this._searchedTimeIntervals.push([Date.now() * 1000, searchedInterval]);
  }


  /** */
  print(): void {
    console.log("BeadLinksTree:", this._beadLinksTree.length);
    console.log(" - searched union:", this.searchedUnion);

  }

  /** */
  dump(): void {
    console.log("BeadLinksTree dump:", this._beadLinksTree.length, this.searchedUnion);
    this._beadLinksTree.forEach(
      ((k, bl) => {
        console.log(`\t[${k}]`, bl.beadAh, bl.beadType);
      }));
  }


  /** */
  has(candidat: BeadLinkMaterialized): boolean {
    const bls = this.getAtKey(candidat.creationTime);
    //console.log("has?", candidat.creationTime, candidat.beadAh, candidat.beadType);
    for (const bl of bls) {
      //console.log(`\t[${bl.indexTime}]`, blHash, bl.beadType);
      if (bl.beadAh == candidat.beadAh) {
        return true;
      }
    }
    //console.log("has? NO");
    return false;
  }


  /** Get all values with same key */
  getAtKey(creationTimeUs: Timestamp): BeadLinkMaterialized[] {
    let res = [];
    this._beadLinksTree.forEach(
      ((k, v) => {res.push(v)}),
      creationTimeUs,
      creationTimeUs + 1);
    return res;
  }



  /** TODO API */
  /** CAUTIOUS between precise time and index-bucket rounded time */

  /** Return all items */
  getAll(): BeadLinkMaterialized[] {
    return this._beadLinksTree.values;
  }

  /** Return the last n items */
  getLast(n: number): BeadLinkMaterialized[] {
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
    return res.reverse();
  }


  /** Return the first n items */
  getFirst(n: number): BeadLinkMaterialized[] {
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
  getBetween(begin: number, end: number): BeadLinkMaterialized[] {
    // tree.forEach(visitor(key,value)[, lo[, hi]])
    return [];
  }


  /** Return the first n items starting from */
  getNext(begin: number): BeadLinkMaterialized[] {
    return [];
  }


  /** Return the first n items before */
  getPrev(begin: number): BeadLinkMaterialized[] {
    return [];
  }
}





