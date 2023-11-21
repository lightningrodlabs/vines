/** */
import {HvmDef} from "@ddd-qc/lit-happ";
import {ThreadsDvm} from "@threads/elements";
//import {Context, createContext} from "@lit-labs/context";
import {ProfilesDvm} from "@ddd-qc/profiles-dvm";
import {FilesDvm} from "@ddd-qc/files";
import {createContext} from "@lit/context";


// export const DEFAULT_THREADS_WE_DEF: HvmDef = {
//   id: "ThreadsWeApplet",
//   dvmDefs: [{ctor: ThreadsDvm, isClonable: false}],
// }

export const DEFAULT_THREADS_WE_DEF: HvmDef = {
  id: "ThreadsWeApplet",
  dvmDefs: [{ctor: ThreadsDvm, isClonable: false}, {ctor: FilesDvm, isClonable: false}],
}


export const DEFAULT_THREADS_DEF: HvmDef = {
  id: "threads",
  dvmDefs: [
    {ctor: ThreadsDvm, isClonable: false},
    {ctor: FilesDvm, isClonable: false},
    {ctor: ProfilesDvm, isClonable: false},
  ],
}
