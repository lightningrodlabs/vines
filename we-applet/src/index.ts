import {
  AppAgentClient
} from "@holochain/client";

import {
  WeApplet,
} from "@lightningrodlabs/we-applet";

import "@holochain-open-dev/profiles/dist/elements/profiles-context.js";
import "@lightningrodlabs/we-applet/dist/elements/we-services-context.js";
import "@lightningrodlabs/we-applet/dist/elements/hrl-link.js";

import {appletViews} from "./applet-view";
import {crossAppletViews} from "./cross-applet-view";
import {attachmentTypes} from "./attachment-types";



/** */
const applet: WeApplet = {
  appletViews,
  crossAppletViews,
  attachmentTypes,
  search: async (appletClient: AppAgentClient, filter: string) => {return []},
};
export default applet;



