#!/bin/bash

set -e

zits --default-zome-name zThreads -f "cast_tip" -f "synchronize_tip" -d "import {ItemLink, SweepInterval, SweepResponse} from './deps.types';" -i submodules/zdk/zomes/zome_core -i dna/zomes/authorship_zapi  -i crates/time_indexing -i dna/zomes/path_explorer -i dna/zomes/threads -i dna/zomes/threads_integrity -o webcomponents/src/bindings/threads.ts

zits --default-zome-name zAuthorship -i submodules/zdk/zomes/zome_core -i dna/zomes/authorship_coordinator -i dna/zomes/authorship_integrity -o webcomponents/src/bindings/authorship.ts
