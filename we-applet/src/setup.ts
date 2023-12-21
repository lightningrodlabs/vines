import {createDefaultWeServicesMock, setup, wrapPathInSvg} from "@ddd-qc/we-utils";
import {createThreadsApplet} from "./createThreadsApplet";
import {ThreadsEntryType} from "@threads/elements";
import {AppletServices, HrlWithContext, WeServices} from "@lightningrodlabs/we-applet";
import {attachmentTypes} from "./appletServices/attachmentTypes";
import {getEntryInfo} from "./appletServices/getEntryInfo";
import {setupThreadsEntryView, devtestNames} from "./devtest";
import {search} from "./appletServices/search";
import {encodeHashToBase64, fakeDnaHash, fakeEntryHash} from "@holochain/client";
import {EntryLocationAndInfo, Hrl} from "@lightningrodlabs/we-applet/dist/types";
import {mdiCommentTextMultiple, mdiFileExcelOutline} from "@mdi/js";


/** */
export async function setupThreadsApplet() {
  /** Determine appletView */
  let APPLET_VIEW = "main";
  try {
    APPLET_VIEW = process.env.APPLET_VIEW;
    //console.log(`HAPP_ENV defined by process.ENV: "${happEnv}"`);
  } catch (e) {
  }
  console.log("Threads we-applet setup() APPLET_VIEW", APPLET_VIEW);
  switch(APPLET_VIEW) {
    case ThreadsEntryType.ParticipationProtocol: return setupThreadsEntryView();
    //case ThreadsEntryType.ParticipationProtocol: return setupThreadsBlockView();
    case "main":
    default: return setupThreadsMainView();
  }
}


/** */
async function setupThreadsMainView() {
  const appletServices: AppletServices = {
    attachmentTypes,
    getEntryInfo,
    blockTypes: {},
    search,
  };
  return setup(appletServices, createThreadsApplet, devtestNames, createDefaultWeServicesMock);
}
