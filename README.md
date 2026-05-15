# Vines

A conversation capacity for groups in The Weave.

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
5. `npm run build:files`

### Web

Single agent browser devtest: `npm run devtest`

Network of 3 agents devtest: `bash npm run network3`

### Moss

In web browser:
`npm run devtest:we`

In Moss:
`npm run prodtestfull:we`

With 3 agents:
`npm run multiagentall`

With multiple groups:
`npm run multigroupall`

With multiple tools:
`npm run multitoolall`

### Tauri / Desktop

```bash
nix develop
npm run start:tauri
```


### Tauri / Android

This app supports android using p2p-shipyard.

#### Environment Setup

This app supports android using p2p-shipyard.

To setup the android development environment:


1. Enter the android development nix shell:

```bash
nix develop .#androidDev
npm install
```

2. Create an android signing key, following these [instructions](https://developer.android.com/studio/publish/app-signing#generate-key)
   `keytool -genkey -v -keystore <keystore_name>.jks -storetype JKS -keyalg RSA -keysize 2048 -validity 10000 -alias <alias_name>`

3. Copy `src-tauri/gen/android/key.properties.example` to `src-tauri/gen/android/key.properties` and fill in values with the previously generated signing key info.


#### Run

(Android Studio must have a running emulator)

```bash
nix develop .#androidDev
npm install
npm run start:android
```

#### Debug

`adb logcat`


## Package

To package the web-happ:

``` bash
npm run package:webapp
```

All output files (`*.webhapp`, `*.dna`, `*.happ`, etc.) will be in the `artifacts` folder.


### Android
```bash
nix develop .#androidDev
npm run build:android
```

## Project structure

| Directory         | Description                                                                                                                 |
|:------------------| :-------------------------------------------------------------------------------------------------------------------------- |
| `/artifacts/`     | All final output files
| `/bin/`           | holochain binairies when testing
| `/dna/`           | DNA source code
| `/scripts/`       | Tool chain
| `/src-tauri/`     | Source code for the Android version of Vines
| `/submodules/`    | Local copies of other git repos used for development
| `/testdata/`      | Config files and asset fils for testing with @theweave/cli
| `/we-applet/`     | Source code for the Moss tool version of Vines
| `/webapp/`        | The webapp source code off Vines
| `/webcomponents/` | The web components source code

## License
[![License: CAL 1.0](https://img.shields.io/badge/License-CAL%201.0-blue.svg)](https://github.com/holochain/cryptographic-autonomy-license)

  Copyright (C) 2021, Harris-Braun Enterprises, LLC

This program is free software: you can redistribute it and/or modify it under the terms of the license
provided in the LICENSE file (CAL-1.0).  This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
