import {DEFAULT_THREADS_DEF} from "./happDef";
import {HAPP_BUILD_MODE, HappBuildModeType} from "@ddd-qc/lit-happ";
import {/*invoke,*/ isTauri} from "@tauri-apps/api/core";
import {createContext} from "@lit/context";
//import * as APPV from "./generated/version";
//import {AdminWebsocket} from "@holochain/client";
import {DnaHashB64} from "@holochain/client";
import { toUint8Array, fromUint8Array } from 'js-base64';

declare global {
    var IS_TAURI: boolean;
    var TAURI_SHOW_ADMIN: boolean | undefined;
    var HAPP_TOKEN: number[] | undefined;
    var TAURI_CAN_DEFAULT: boolean;
    var TAURI_IS_DEV: boolean;
    var TAURI_TARGET_ARC: number | undefined;
    var TAURI_HAPP_SHA256: string | undefined;
    var TAURI_BOOTSTRAP_URL: string | undefined;
    var HAPP_ID: string;
    var HC_APP_PORT: number | undefined;
    var HC_ADMIN_PORT: number | undefined;
}

globalThis.IS_TAURI = isTauri();
globalThis.TAURI_IS_DEV = false;
globalThis.TAURI_TARGET_ARC = undefined;
globalThis.TAURI_HAPP_SHA256 = undefined;
globalThis.TAURI_BOOTSTRAP_URL = undefined;
globalThis.TAURI_CAN_DEFAULT = true;
globalThis.TAURI_SHOW_ADMIN = undefined;
globalThis.HAPP_TOKEN = undefined;
globalThis.HAPP_ID = DEFAULT_THREADS_DEF.id;
globalThis.HC_APP_PORT = undefined;
globalThis.HC_ADMIN_PORT = undefined;


try {
    globalThis.HC_ADMIN_PORT = Number(process.env.HC_ADMIN_PORT);
    globalThis.HC_APP_PORT = Number(process.env.HC_APP_PORT);
} catch (e: any) {
    console.warn("process.env not defined");
}


if (!globalThis.HC_APP_PORT) {
    console.debug({window});
    const __HC_LAUNCHER_ENV__: string = "__HC_LAUNCHER_ENV__";
    const isLauncher = window && __HC_LAUNCHER_ENV__ in window;
    if (isLauncher) {
        // @ts-ignore
        const env = window[__HC_LAUNCHER_ENV__];
        console.log("env", env);
        globalThis.HC_APP_PORT = env!.APP_INTERFACE_PORT;
        globalThis.HAPP_ID = env!.INSTALLED_APP_ID;
        globalThis.HC_ADMIN_PORT = env!.ADMIN_INTERFACE_PORT;
        globalThis.HAPP_TOKEN = env!.APP_INTERFACE_TOKEN;
    } else {
        console.warn("HC_APP_PORT not defined");
    }
}


console.log("   HAPP_TOKEN =", HAPP_TOKEN)
console.log("     IS_TAURI =", IS_TAURI)
console.log("      HAPP_ID =", HAPP_ID)
console.log("  HC_APP_PORT =", HC_APP_PORT);
console.log("HC_ADMIN_PORT =", HC_ADMIN_PORT);


/** Remove console.log() in Retail */
if (HAPP_BUILD_MODE === HappBuildModeType.Retail) {
  // console.log("console.log() disabled");
  // console.log = () => {};
  console.log("console.log() changed into console.debug()");
  console.log = console.debug
}


export interface MyTauriConfig {
    is_dev: boolean,
    dna: string,
    happ_sha256: string,
    arc: number,
    bootstrap_url: string,
    //can_default: bool,
}

export const happShareCodeContext = createContext<[string, string | null, string][]>('happShareCodes');


/** Call bootstrap server and get the list of known peers */
export async function getBootstrapPeers(bootstrapUrl: string, dnaB64: DnaHashB64): Promise<any> {
    const bootstrap = bootstrapUrl.replace(/\/$/, '');
    /* Convert dnaHash to K2 space hash */
    console.log(`getBootstrapPeers() calling ${bootstrap} for dna`, dnaB64);
    const trimmed = dnaB64.substring(1);
    const rawBytes = toUint8Array(trimmed);
    const slicedBytes = rawBytes.slice(3, 35);
    const k2 = fromUint8Array(slicedBytes, true); // 'true' enables URL-safe mode
    console.log(`getBootstrapPeers() k2`, k2);
    /* Query the boostrap server */
    const response = await fetch(bootstrap + "/bootstrap/" + k2);
    console.log(`getBootstrapPeers() response`, response);
    if (!response.ok) {
    return Promise.reject(`HTTP error: ${response.status}`);
    }
    return response.json();
}
