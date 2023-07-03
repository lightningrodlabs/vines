
/** From zome-utils */


/** Struct holding info about the link between an Item and its LeafAnchor. */
export interface ItemLink {
  itemHash: Uint8Array
  tag: number[]
  /** Flattened ScopedLinkType */
  zomeIndex: number
  linkIndex: number
}


/** From time-indexing */
import {Timestamp} from "@holochain/client";

export interface SweepResponse {
  sweepedInterval: SweepInterval
  foundItems: [Timestamp, ItemLink][]
}

/** Time interval in us */
export interface SweepInterval {
  begin: Timestamp
  end: Timestamp
}

export interface TimedItemTag {
  itemType: string
  devtestTimestamp: Timestamp
  customData: number[]
}
