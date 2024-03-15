/** */
import {HvmDef} from "@ddd-qc/lit-happ";
import {ThreadsDvm} from "@vines/elements";
//import {Context, createContext} from "@lit-labs/context";
//import {ProfilesDvm} from "@ddd-qc/profiles-dvm";
import {FilesDvm} from "@ddd-qc/files";


// export const DEFAULT_THREADS_WE_DEF: HvmDef = {
//   id: "VinesApplet",
//   dvmDefs: [{ctor: ThreadsDvm, isClonable: false}],
// }

// export const DEFAULT_THREADS_WE_DEF: HvmDef = {
//   id: "VinesApplet",
//   dvmDefs: [{ctor: ThreadsDvm, isClonable: false}, {ctor: FilesDvm, isClonable: false}],
// }


export const DEFAULT_THREADS_DEF: HvmDef = {
  id: "vines",
  dvmDefs: [
    {ctor: ThreadsDvm, isClonable: false},
    {ctor: FilesDvm, isClonable: false},
    //{ctor: ProfilesDvm, isClonable: false},
  ],
}
