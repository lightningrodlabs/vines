# path-utils

Rust library for advanced use of Links & Paths in Holochain Zome Development. 


## Ontology

In Holochain, a **Path** is a vector of **Components**, where a **Component** is a `Vec<u8>`.

A ***Root Path*** is a *Path* of only one *Component*.

A ***Parent Path*** of a *Path* is a *Path* without its last *Component*.

A ***Child Path*** of a *Path* is a *Path* which has one more *Component* than its *parent*. 


Holochain commits *Paths* as entries, but not individual *components*.


As this is quite generic, this library provides additional and more specific naming:

Any datum linked from a `Path` that is not itself a `Path`, is called an `Item`.
The last component of the `Path` to that item, is called a `LeafComponent`.

We redefine ***Anchor*** as:

An ***Anchor*** is a *Path* made exclusively of human-readable strings. It can be expressed as a single string with components seperated by the `.` delimiter:
ex: "profiles.c.cam.camille"

(Holochain's original definition of Anchor (A two level path of 'type' and 'text') is too narrow to be kept).

A ***Leaf Anchor*** is an *anchor* that does not and will not have any *child paths*.

A ***Furnished Anchor*** is a *leaf anchor* with *items* linked from it.


## Building

1. [Install rustup](https://rustup.rs/) and the `wasm32` target with: ``rustup target add wasm32-unknown-unknown``
1. Run ``cargo build --release --target wasm32-unknown-unknown``



## License
[![License: CAL 1.0](https://img.shields.io/badge/License-CAL%201.0-blue.svg)](https://github.com/holochain/cryptographic-autonomy-license)

  Copyright (C) 2023, Harris-Braun Enterprises, LLC

This program is free software: you can redistribute it and/or modify it under the terms of the license
provided in the LICENSE file (CAL-1.0).  This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
