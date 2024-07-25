import {createDefaultWeServicesMock, setup} from "@ddd-qc/we-utils";
import {createVinesApplet} from "./createVinesApplet";
import {ThreadsEntryType} from "@vines/elements";
import {AppletServices} from "@lightningrodlabs/we-applet";
import {creatables} from "./appletServices/creatables";
import {getAssetInfo} from "./appletServices/getAssetInfo";
import {setupVinesEntryView, devtestNames} from "./devtest";
import {search} from "./appletServices/search";
import {bindAsset} from "./appletServices/bindAsset";


/** */
export async function setupVinesApplet() {
  /** Determine appletView */
  let APPLET_VIEW = "main";
  try {
    APPLET_VIEW = process.env.APPLET_VIEW;
    //console.log(`HAPP_ENV defined by process.ENV: "${happEnv}"`);
  } catch (e) {
  }
  console.log("Vines we-applet setup() APPLET_VIEW", APPLET_VIEW);
  switch(APPLET_VIEW) {
    case ThreadsEntryType.ParticipationProtocol: return setupVinesEntryView();
    //case ThreadsEntryType.ParticipationProtocol: return setupThreadsBlockView();
    case "main":
    default: return setupVinesMainView();
  }
}


/** */
async function setupVinesMainView() {
  const appletServices: AppletServices = {
    creatables,
    getAssetInfo,
    bindAsset,//: async (a, b, c, d) => {},
    blockTypes: {},
    search,
  };
  return setup(appletServices, createVinesApplet, devtestNames, createDefaultWeServicesMock);
}
