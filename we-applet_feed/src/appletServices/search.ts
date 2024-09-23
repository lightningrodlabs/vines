import {
    AppClient,
} from "@holochain/client";
import {AppletHash, WAL} from "@theweave/api/dist/types";
import {WeaveServices} from "@theweave/api/dist/api";
//import {asCellProxy} from "@ddd-qc/we-utils";
//import {FilesProxy} from "@ddd-qc/files";
import {ParcelDescription} from "@ddd-qc/delivery";
//import {VINES_DEFAULT_ROLE_NAME} from "@vines/elements";
import {AgentId} from "@ddd-qc/cell-proxy";

/** */
export interface VinesSearchContext {
    isPrivate: boolean
    author: AgentId,
    description: ParcelDescription,
}


/** Return EntryHashs of Manifests whose name match the search filter */
export async function search(_appletClient: AppClient, _appletHash: AppletHash, _weServices: WeaveServices, _searchFilter: string): Promise<Array<WAL>> {
    // console.log("Feed/we-applet/search():", searchFilter);
    // const searchLC = searchFilter.toLowerCase();

    // /** Get Cell proxy */
    // const mainAppInfo = await appletClient.appInfo();
    // if (!mainAppInfo) {
    //     throw Promise.reject("Missing Main AppInfo");
    // }

    // const cellProxy = await asCellProxy(
    //     appletClient,
    //     undefined,
    //     mainAppInfo.installed_app_id,
    //     VINES_DEFAULT_ROLE_NAME);
    // console.log("Feed/we-applet/search(): cellProxy", cellProxy);
    // const proxy/*: FilesProxy */ = new FilesProxy(cellProxy);
    // //const dnaHash = decodeHashFromBase64(proxy.cell.dnaHash);

    // /** Search PP / messages / subjects? */
    // const items = [];

    // /** Transform results into WAL */
    // // const results: Array<WAL> = items
    // //     .map(([eh, description, author, isPrivate]) => { return {
    // //         hrl: [dnaHash, eh],
    // //         context: {isPrivate, author, description} as FilesSearchContext,
    // //     }})

    /** Done */
    return [];
}
