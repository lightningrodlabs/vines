# time-indexing

Rust library providing a time-indexing solution for Holochain Zomes
Enables to index any `AnyLinkableHash` in a Link tree structure called a time-index.


## Ontology

A datum indexed in a time-index is called a ***Timed Item***, or simply ***item*** in this context.

A ***Time Path*** is a *path* composed of a *root anchor* and additional components holding a single `i32`.

***Probing*** is the act of calling holochain's `get_links()`.

***Sweeping*** is the act of *probing* a part of a time-index tree, in order to return all stored items in that part.

## Design

A time-index starts with a user defined anchor (called the 'root anchor'), and has a granularity of an hour.
This means a user can define multiple time-indexes to store items in seperate time hiearachies.

To index an item the user has to call the function:
```
index_item(
    root_tp: TypedPath,
    item_hash: AnyLinkableHash,
    item_type: &str,
    time_link_type: ScopedLinkType,
    index_time_us: Timestamp,
    tag_data: &[u8],
)
```

The user has to provide its own LinkType for the root anchor of the time-index.
The user has to define and provide a LinkType specifically for TimedItems when using this library, otherwise time-indexing would have to be a Zome instead of a simple crate.
The user has to provide the type of the item being indexed, so other agents can know what kind of item is behind the hash.
The user can also provide its own tag data for its own use.

Once items are stored, the user can query a time-index by providing a SweepInterval, the time-interval
for which a recursive search (`get_links()`) will be done on the time-index tree.

The default SweepInterval is `dna_info().origin_time` to `sys_time()` (FIXME: HOLOCHAIN_EPOCH is used for now instead as origin_time is not available).

Technically, the user has to call the function:
```
get_latest_time_indexed_links(
  root_tp: TypedPath,
  sweep_interval: SweepInterval,
  target_count: usize,
  link_tag: Option<LinkTag>,
)
```

It will reverse-walk the time-index tree from `sweep_interval.end` to `begin` until `target_count` items are found.

## Building

1. [Install rustup](https://rustup.rs/) and the `wasm32` target with: ``rustup target add wasm32-unknown-unknown``
1. Run ``cargo build --release --target wasm32-unknown-unknown``



## License
[![License: CAL 1.0](https://img.shields.io/badge/License-CAL%201.0-blue.svg)](https://github.com/holochain/cryptographic-autonomy-license)

  Copyright (C) 2023, Harris-Braun Enterprises, LLC

This program is free software: you can redistribute it and/or modify it under the terms of the license
provided in the LICENSE file (CAL-1.0).  This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
