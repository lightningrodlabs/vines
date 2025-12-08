import {DEFAULT_THREADS_DEF} from "./happDef";
import {HAPP_BUILD_MODE, HappBuildModeType} from "@ddd-qc/lit-happ";
import {isTauri} from "@tauri-apps/api/core";

declare global {
    var IS_TAURI: boolean;
    var TAURI_SHOW_ADMIN: boolean | undefined;
    var HAPP_TOKEN: number[] | undefined;
    var HAPP_ID: string;
    var HC_APP_PORT: number | undefined;
    var HC_ADMIN_PORT: number | undefined;
    var TAURI_CAN_DEFAULT: boolean;
    var TAURI_IS_DEV: boolean;
    var TAURI_TARGET_ARC: number | undefined;
    var TAURI_ORIGINAL_DNA_HASH: string | undefined;
}

globalThis.IS_TAURI = isTauri();
globalThis.TAURI_IS_DEV = false;
globalThis.TAURI_TARGET_ARC = undefined;
globalThis.TAURI_ORIGINAL_DNA_HASH = undefined;
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
