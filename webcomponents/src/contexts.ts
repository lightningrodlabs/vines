import {createContext} from "@lit/context";
import {FilesDvm} from "@ddd-qc/files";
import {AppProxy} from "@ddd-qc/cell-proxy";
import {WeServicesEx} from "@ddd-qc/we-utils";
import {ActionHashB64, encodeHashToBase64, fakeEntryHash} from "@holochain/client";

//export const THIS_APPLET_ID = "__this"
export const THIS_APPLET_ID = encodeHashToBase64(await fakeEntryHash(118)); // 'v'

export const SUBJECT_TYPE_TYPE_NAME = "SubjectType";
export const PP_TYPE_NAME = "ParticipationProtocol";

export const weClientContext = createContext<WeServicesEx>('we_client');
//export const wePerspectiveContext = createContext<WePerspective>('we_perspective');
export const globaFilesContext = createContext<FilesDvm>('global/files');

export const appProxyContext = createContext<AppProxy>('__vines_app_proxy');

export const onlineLoadedContext = createContext<boolean>('__vines_online_loaded');
