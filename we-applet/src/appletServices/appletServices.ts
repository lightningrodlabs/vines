import {getEntryInfo} from "./getEntryInfo";
import {AppletServices} from "@lightningrodlabs/we-applet";
import {DevTestNames} from "@ddd-qc/we-utils";
import {attachmentTypes} from "./attachmentTypes";
import {THREADS_DEFAULT_ROLE_NAME} from "@threads/elements";

/** */
export const threadsNames: DevTestNames = {
    installed_app_id: "ThreadsWeApplet",
    provisionedRoleName: THREADS_DEFAULT_ROLE_NAME,
}


/** */
export const appletServices: AppletServices = {
    attachmentTypes,
    //attachmentTypes: async (_appletClient) => ({}),
    getEntryInfo,
    blockTypes: {},
    search: async (appletClient, searchFilter) => {return []},
};
