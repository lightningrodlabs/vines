#!/bin/bash

set -e

zits --default-zome-name zThreads -d "import {ItemLink, SweepInterval, SweepResponse} from './deps.types';" -i crates/time_indexing -i dna/zomes/path_explorer -i dna/zomes/threads -i dna/zomes/threads_integrity -o webcomponents/src/bindings/threads.ts

zits --default-zome-name zOriginals -i dna/zomes/originals -i dna/zomes/originals_integrity -o webcomponents/src/bindings/originals.ts
