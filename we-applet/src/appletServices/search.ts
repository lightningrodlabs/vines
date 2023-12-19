import {
    AgentPubKey, AgentPubKeyB64,
    AppAgentClient,
    decodeHashFromBase64,
    encodeHashToBase64,
    EntryHash,
    Timestamp
} from "@holochain/client";
import {AppletHash, HrlWithContext} from "@lightningrodlabs/we-applet/dist/types";
import {WeServices} from "@lightningrodlabs/we-applet/dist/api";
import {asCellProxy} from "@ddd-qc/we-utils";
import {FILES_DEFAULT_ROLE_NAME, FilesProxy} from "@ddd-qc/files";
import {ParcelDescription, ParcelManifest, ParcelReference} from "@ddd-qc/delivery";
import {THREADS_DEFAULT_ROLE_NAME} from "@threads/elements";

/** */
export interface ThreadsSearchContext {
    isPrivate: boolean
    author: AgentPubKeyB64,
    description: ParcelDescription,
}


/** Return EntryHashs of Manifests whose name match the search filter */
export async function search(appletClient: AppAgentClient, appletHash: AppletHash, weServices: WeServices, searchFilter: string): Promise<Array<HrlWithContext>> {
    console.log("Threads/we-applet/search():", searchFilter);
    const searchLC = searchFilter.toLowerCase();

    /** Get Cell proxy */
    const mainAppInfo = await appletClient.appInfo();
    const cellProxy = await asCellProxy(
        appletClient,
        undefined,
        mainAppInfo.installed_app_id,
        THREADS_DEFAULT_ROLE_NAME);
    console.log("Threads/we-applet/search(): cellProxy", cellProxy);
    const proxy/*: FilesProxy */ = new FilesProxy(cellProxy);
    const dnaHash = decodeHashFromBase64(proxy.cell.dnaHash);

    /** Search PP / messages / subjects? */
    const items = [];

    /** Transform results into HrlWithContext */
    // const results: Array<HrlWithContext> = items
    //     .map(([eh, description, author, isPrivate]) => { return {
    //         hrl: [dnaHash, eh],
    //         context: {isPrivate, author, description} as FilesSearchContext,
    //     }})

    /** Done */
    return [];
}
