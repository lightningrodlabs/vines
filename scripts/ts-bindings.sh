#!/bin/bash

zits --default-zome-name zThreads -d "import {ItemLink} from './deps.types';" -i crates/time_indexing -i dna/zomes/path_explorer -i dna/zomes/threads -i dna/zomes/threads_integrity -o webcomponents/src/bindings/threads.ts
