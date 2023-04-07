/** */
import {HvmDef} from "@ddd-qc/lit-happ";
import {ThreadsDvm} from "./threads.dvm";


export const DEFAULT_THREADS_DEF: HvmDef = {
  id: "threads",
  dvmDefs: [{ctor:ThreadsDvm, isClonable: false}],
}
