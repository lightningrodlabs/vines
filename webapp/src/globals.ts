import {DEFAULT_THREADS_DEF} from "./happDef";
import {HAPP_BUILD_MODE, HappBuildModeType} from "@ddd-qc/lit-happ";
import {isTauri} from '@tauri-apps/api/core';

export const IS_TAURI: boolean = isTauri();
export let HAPP_ID: string = DEFAULT_THREADS_DEF.id;
export let HC_APP_PORT: number | undefined = undefined;
export let HC_ADMIN_PORT: number | undefined = undefined;
export let HAPP_TOKEN: number[] | undefined = undefined;

try {
    HC_ADMIN_PORT = Number(process.env.HC_ADMIN_PORT);
    HC_APP_PORT = Number(process.env.HC_APP_PORT);
} catch (e: any) {
    console.warn("process.env not defined");
}

if (!HC_APP_PORT) {
    console.debug({window});
    const __HC_LAUNCHER_ENV__: string = "__HC_LAUNCHER_ENV__";
    const isLauncher = window && __HC_LAUNCHER_ENV__ in window;
    if (isLauncher) {
        // @ts-ignore
        const env = window[__HC_LAUNCHER_ENV__];
        console.log("env", env);
        HC_APP_PORT = env!.APP_INTERFACE_PORT;
        HAPP_ID = env!.INSTALLED_APP_ID;
        HC_ADMIN_PORT = env!.ADMIN_INTERFACE_PORT;
        HAPP_TOKEN = env!.APP_INTERFACE_TOKEN;
    } else {
        console.warn("HC_APP_PORT not defined");
    }
}

/** look-up appId from URL query param (tauri) */
const params = new URLSearchParams(window.location.search);
const maybeAppId = params.get('appId');
console.debug("maybeAppId", maybeAppId);
if (maybeAppId) {
    HAPP_ID = maybeAppId;
}
const maybeAppPort = params.get('appPort');
console.debug("maybeAppPort", maybeAppPort);
if (maybeAppPort) {
    HC_APP_PORT = Number(maybeAppPort);
}
const maybeToken = params.get('token');
console.debug("maybeToken", maybeToken);
if (maybeToken) {
    const numbers = maybeToken.split(',').map(n => parseInt(n.trim()));
    HAPP_TOKEN = Array.from(new Uint8Array(numbers));
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
