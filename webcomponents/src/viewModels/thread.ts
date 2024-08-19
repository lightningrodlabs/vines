import {Timestamp} from "@holochain/client";
import {TimeInterval} from "./timeInterval";

/** From https://github.com/mikolalysenko/functional-red-black-tree */
import createRBTree, {Tree} from "functional-red-black-tree";
//import {Base64} from "js-base64";
import {BeadLinkMaterialized} from "./threads.materialize";
import {ppName} from "../utils";
import {AgentId} from "@ddd-qc/lit-happ";
import {ParticipationProtocol} from "../bindings/threads.types";


/**
 * Holds BinaryTree of BeadLinks and probing TimeIntervals
 */
export class Thread {

  /* Participation Protocol */
  private _pp: ParticipationProtocol;
  /* Author of the thread's PP entry */
  private _author: AgentId;
  /* CreationTime of the thread's PP entry */
  private _creationTime: Timestamp;
  /* Flag if first node is the oldest node possible */
  private _hasSearchedOldestBead: boolean = false;
  /* Logged last known bead */
  private _latestProbeLogTime: Timestamp;
  /* Tree of BeadLinks keyed by creation time */
  private _beadLinksTree: Tree<number, BeadLinkMaterialized>;
  /* Time interval of the probed beads */
  private _probedTimeIntervals: [Timestamp, TimeInterval][] = [];


  /** Ctor */
  constructor(pp: ParticipationProtocol, dnaOriginTime: Timestamp, creationTime: Timestamp, author: AgentId) {
    console.debug("New Thread() dnaOriginTime", dnaOriginTime, author);
    this._pp = pp;
    this._latestProbeLogTime = dnaOriginTime;
    this._creationTime = creationTime;
    this._author = author;

    this._beadLinksTree = createRBTree();
    //this._beadLinksTree = createRBTree((a, b) => b - a);
  }


  /** -- Getters -- */

  get name(): string { return ppName(this._pp)}

  get pp(): ParticipationProtocol { return this._pp}

  get creationTime(): Timestamp { return this._creationTime}

  get author(): AgentId { return this._author}

  //get isHidden(): boolean { return this._isHidden}

  get latestProbeLogTime(): Timestamp { return this._latestProbeLogTime}

  get hasSearchedOldestBead(): boolean { return this._hasSearchedOldestBead}


  get probedTimeIntervals(): [Timestamp, TimeInterval][] { return this._probedTimeIntervals}

  get beadLinksTree(): Tree<number, BeadLinkMaterialized> { return this._beadLinksTree}


  get probedUnion(): TimeInterval | null {
    if (this.probedTimeIntervals.length == 0) {
      return null;
    }
    let union: TimeInterval | null = this.probedTimeIntervals[0]![1];
    for (const [_ts, interval] of this.probedTimeIntervals) {
      if (interval.isInstant()) {
        continue;
      }
      union = union!.union(interval);
    }
    return union;
  }


  /** -- Setters -- */

  /** */
  setLatestProbeLogTime(time: Timestamp): void {
    //console.log("setLatestProbeLogTime()", time, this._latestProbeLogTime);
    if (this._latestProbeLogTime >= time) {
      return;
    }
    this._latestProbeLogTime = time;
  }


  /** */
  setHasSearchedOldestBead(): void {
    this._hasSearchedOldestBead = true;
  }


  /** -- Methods -- */

  /** */
  hasUnreads(): boolean {
    if (this.latestProbeLogTime) {
      return !!this.beadLinksTree.end.key && this.latestProbeLogTime < this.beadLinksTree.end.key;
    }
    return !!this.beadLinksTree.end.key;
  }


  /**  */
  addItem(blMat: BeadLinkMaterialized): void {
    console.log("Thread.addItem()", this.pp.purpose, this.has(blMat))
    //this.print();
    if (this.has(blMat)) {
      return;
    }
    console.log("ThreadInfo.addItem().inserting at", blMat.creationTime, blMat.beadAh)
    this._beadLinksTree = this._beadLinksTree.insert(blMat.creationTime, blMat);
    console.log("ThreadInfo.addItem() tree size =", this._beadLinksTree.length, this._beadLinksTree.keys.length);
  }


  /** */
  addProbedInterval(interval: TimeInterval): void {
    this._probedTimeIntervals.push([Date.now() * 1000, interval]);
  }


  /** */
  print(): void {
    console.log("BeadLinksTree:", this._beadLinksTree.length);
    console.log(" - probed union:", this.probedUnion);

  }

  /** */
  dump(): void {
    console.log("BeadLinksTree dump:", this._beadLinksTree.length, this.probedUnion);
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
      if (bl.beadAh.equals(candidat.beadAh)) {
        return true;
      }
    }
    //console.log("has? NO");
    return false;
  }


  /** Get all values with same key */
  getAtKey(creationTimeUs: Timestamp): BeadLinkMaterialized[] {
    let res: BeadLinkMaterialized[] = [];
    this._beadLinksTree.forEach(
      ((_k, v) => {res.push(v)}),
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
}





