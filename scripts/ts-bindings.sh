#!/bin/bash

set -e

zits --default-zome-name zThreads -d "import {ItemLink, SweepInterval, SweepResponse} from './deps.types';" -i submodules/zome-signals -i crates/time_indexing -i dna/zomes/path_explorer -i dna/zomes/threads -i dna/zomes/threads_integrity -o webcomponents/src/bindings/threads.ts

zits --default-zome-name zAuthorship -i dna/zomes/authorship_coordinator -i dna/zomes/authorship_integrity -o webcomponents/src/bindings/authorship.ts
