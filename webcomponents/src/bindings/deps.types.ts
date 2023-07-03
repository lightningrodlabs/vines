/** Struct holding info about the link between an Item and its LeafAnchor. */
export interface ItemLink {
  itemHash: Uint8Array
  tag: number[]
  /** Flattened ScopedLinkType */
  zomeIndex: number
  linkIndex: number
}

