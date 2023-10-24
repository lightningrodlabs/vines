import {getEntryInfo} from "./appletServices/getEntryInfo";
import {weServicesMock} from "./mock";
import {createThreadsApplet} from "./createApplet";
import {AppletServices} from "@lightningrodlabs/we-applet";


/** */
const appletServices: AppletServices = {
  //attachmentTypes,
  attachmentTypes: async (_appletClient) => ({}),
  getEntryInfo,
  blockTypes: {},
  search: async (appletClient, searchFilter) => {return []},
};

export default {
  createThreadsApplet,
  weServicesMock,
  appletServices,
};



