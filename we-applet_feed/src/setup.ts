import {createDefaultWeServicesMock, setup} from "@ddd-qc/we-utils";
import {createFeedApplet} from "./createFeedApplet";
import {ThreadsEntryType} from "@vines/elements";
import {AppletServices} from "@theweave/api";
import {creatables} from "./appletServices/creatables";
import {getAssetInfo} from "./appletServices/getAssetInfo";
import {setupFeedEntryView, devtestNames} from "./devtest";
import {search} from "./appletServices/search";
import {bindAsset} from "./appletServices/bindAsset";


/** */
export async function setupFeedApplet() {
  /** Determine appletView */
  let APPLET_VIEW = "main";
  try {
    APPLET_VIEW = process.env.APPLET_VIEW!;
    //console.log(`HAPP_ENV defined by process.ENV: "${happEnv}"`);
  } catch (e:any) {
  }
  console.log("Feed we-applet setup() APPLET_VIEW", APPLET_VIEW);
  switch(APPLET_VIEW) {
    case ThreadsEntryType.ParticipationProtocol: return setupFeedEntryView(); break;
    case "main":
    default: return setupFeedMainView();
  }
}


/** */
async function setupFeedMainView() {
  const appletServices: AppletServices = {
    creatables,
    getAssetInfo,
    bindAsset,
    blockTypes: {},
    search,
  };
  return setup(appletServices, createFeedApplet, devtestNames, createDefaultWeServicesMock);
}
