import {createDefaultWeServicesMock, setup} from "@ddd-qc/we-utils";
import {createThreadsApplet} from "./createThreadsApplet";
import {ThreadsEntryType} from "@threads/elements";
import {AppletServices} from "@lightningrodlabs/we-applet";
import {creatables} from "./appletServices/creatables";
import {getAttachableInfo} from "./appletServices/getAttachableInfo";
import {setupThreadsEntryView, devtestNames} from "./devtest";
import {search} from "./appletServices/search";
import {bindAsset} from "./appletServices/bindAsset";


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
    creatables,
    getAttachableInfo,
    bindAsset,
    blockTypes: {},
    search,
  };
  return setup(appletServices, createThreadsApplet, devtestNames, createDefaultWeServicesMock);
}
