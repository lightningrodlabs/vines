#!/bin/bash

zits --default-zome-name zThreads -i crates/time_indexing -i crates/path_utils -i dna/zomes/path_explorer -i dna/zomes/threads -i dna/zomes/threads_integrity -o webcomponents/src/bindings/threads.ts
