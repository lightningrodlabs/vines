import {createContext} from "@lit/context";
import {FilesDvm} from "@ddd-qc/files";
import {WeServicesEx} from "@ddd-qc/we-utils";
import {EntryId, NetworkCaller} from "@ddd-qc/lit-happ";
import {NetworkStatsSource} from "./network-stats-source";

//export const THIS_APPLET_ID = "__this"
export const THIS_APPLET_ID = EntryId.empty(118); // 'v'

export const weClientContext = createContext<WeServicesEx>('we_client');

export const filesContext = createContext<FilesDvm>('main/files');
export const allFilesContext = createContext<FilesDvm[]>('all/files');

export const onlineLoadedContext = createContext<boolean>('__vines_online_loaded');

export const networkCallerContext = createContext<NetworkCaller>('networkCaller');

/** Transport stats, from Moss when running in it. See network-stats-source.ts. */
export const networkStatsContext = createContext<NetworkStatsSource>('networkStats');
