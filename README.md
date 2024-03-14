# Vines

A conversation capacity for groups in The Weave

##  Background

The current state-of-the-art in sync/async conversation is Discord/Slack: channel based chat with affordances for replys and threading.  The context created by a channel is completely implicit in the channel name and it's use by the community/people that use it.   The structure of any message is always the same except if you think of an emoji reaction as message type.  This is actually quite powerful (it's why we are using it) but it has some severe limitations.


## Dev testing

### Setup
1. Install the required tools
  1. Rust wasm target: `npm run install:rust`
  1. [`holochain`](https://github.com/holochain/holochain): `cargo install holochain` (or use nix-shell)
  4. `npm run install:hc`
  3. `npm run install:zits`
4. `npm install`
5. `npm run install:submodules`
5. `npm run install:hash-zome`
5. `npm run build:localize`

### Web
`npm run devtest`

## Network

To bootstrap a network of N agents:

``` bash
npm run network 3
```

Replace the "3" for the number of agents you want to bootstrap.
## Package

To package the web-happ:

``` bash
npm run package:webapp
```

All output files (`*.webhapp`, `*.dna`, `*.happ`, etc.) will be in the `artifacts` folder.


## Project structure

| Directory                                  | Description                                                                                                                 |
|:-------------------------------------------| :-------------------------------------------------------------------------------------------------------------------------- |
| `/dna/`                                    | DNA source code
| `/scripts/`                                | Tool chain
| `/webapp/`                                 | The webapp source code
| &nbsp;&nbsp;&nbsp;&nbsp;`webhapp.workdir/` | webhapp work directory
| `/webcomponents/`                          | The web components source code
| `/we-applet/`                              | The applet for We integration

## License
[![License: CAL 1.0](https://img.shields.io/badge/License-CAL%201.0-blue.svg)](https://github.com/holochain/cryptographic-autonomy-license)

  Copyright (C) 2021, Harris-Braun Enterprises, LLC

This program is free software: you can redistribute it and/or modify it under the terms of the license
provided in the LICENSE file (CAL-1.0).  This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
