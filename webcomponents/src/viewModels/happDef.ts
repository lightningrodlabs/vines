/** */
import {HvmDef} from "@ddd-qc/lit-happ";
import {ThreadsDvm} from "./threads.dvm";
import {Context, createContext} from "@lit-labs/context";
import {ProfilesZvm} from "./profiles.zvm";
import {ProfilesDvm} from "./profiles.dvm";


export const DEFAULT_THREADS_WE_DEF: HvmDef = {
  id: "ThreadsWeApplet",
  dvmDefs: [{ctor: ThreadsDvm, isClonable: false}],
}

export const DEFAULT_THREADS_DEF: HvmDef = {
  id: "threads",
  dvmDefs: [{ctor: ThreadsDvm, isClonable: false}, {ctor: ProfilesDvm, isClonable: false}],
}

export const globalProfilesContext = createContext<ProfilesZvm>('global/profiles');
