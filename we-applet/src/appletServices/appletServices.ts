import {getEntryInfo} from "./getEntryInfo";
import {AppletServices} from "@lightningrodlabs/we-applet";
import {DevTestNames} from "@ddd-qc/we-utils";
import {attachmentTypes} from "./attachmentTypes";

/** */
export const threadsNames: DevTestNames = {
    installed_app_id: "ThreadsWeApplet",
    provisionedRoleName: "role_threads",
}


/** */
export const appletServices: AppletServices = {
    attachmentTypes,
    //attachmentTypes: async (_appletClient) => ({}),
    getEntryInfo,
    blockTypes: {},
    search: async (appletClient, searchFilter) => {return []},
};
