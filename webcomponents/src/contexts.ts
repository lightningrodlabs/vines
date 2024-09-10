import {createContext} from "@lit/context";
import {FilesDvm} from "@ddd-qc/files";
import {AppProxy} from "@ddd-qc/cell-proxy";
import {WeServicesEx} from "@ddd-qc/we-utils";
import {EntryId} from "@ddd-qc/lit-happ";

//export const THIS_APPLET_ID = "__this"
export const THIS_APPLET_ID = EntryId.empty(118); // 'v'

export const weClientContext = createContext<WeServicesEx>('we_client');

export const filesContext = createContext<FilesDvm>('main/files');
export const allFilesContext = createContext<FilesDvm[]>('all/files');

export const appProxyContext = createContext<AppProxy>('__vines_app_proxy');

export const onlineLoadedContext = createContext<boolean>('__vines_online_loaded');
