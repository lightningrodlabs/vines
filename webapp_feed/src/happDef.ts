import {HvmDef} from "@ddd-qc/lit-happ";
import {ThreadsDvm} from "@vines/elements";
import {FilesDvm} from "@ddd-qc/files";



export const DEFAULT_THREADS_DEF: HvmDef = {
  id: "vines", // "communityFeed",
  dvmDefs: [
    {ctor: ThreadsDvm, isClonable: false},
    {ctor: FilesDvm, isClonable: false},
    //{ctor: ProfilesDvm, isClonable: false},
  ],
}
