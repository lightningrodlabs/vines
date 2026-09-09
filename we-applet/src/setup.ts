import {createDefaultWeServicesMock, setup} from "@ddd-qc/we-utils";
import {createVinesApplet} from "./createVinesApplet";
import {ThreadsEntryType} from "@vines/elements";
import {AppletServices, initializeHotReload} from "@theweave/api";
import {creatables} from "./appletServices/creatables";
import {getAssetInfo} from "./appletServices/getAssetInfo";
import {setupVinesEntryView, devtestNames} from "./devtest";
import {search} from "./appletServices/search";
import {LitElement} from "lit/development";


/** */
export async function setupVinesApplet(): Promise<LitElement> {
  /** When Moss serves this applet from a dev server (we_dev/config.ts with
   *  source.type "localhost") the iframe is on http://localhost:<uiPort> rather
   *  than Moss's own applet origin, so the bridge WeaveClient connects over has
   *  to be set up explicitly first. Without it, we-utils' setup() awaits a
   *  connection that never arrives and the applet renders nothing, with no
   *  error. Dev only: in a packaged webhapp it is neither needed nor available. */
  if ((import.meta as any).env?.DEV) {
    try {
      await initializeHotReload();
    } catch (e) {
      console.warn("Applet hot-reload not initialized. Expected unless running under `npm run start:moss`.", e);
    }
  }
  /** Check env for appletView type */
  let APPLET_VIEW = "main";
  try {
    APPLET_VIEW = process.env.APPLET_VIEW!;
    //console.log(`HAPP_ENV defined by process.ENV: "${happEnv}"`);
  } catch (e: any) {
  }
  console.log("Vines we-applet setup() APPLET_VIEW = ", APPLET_VIEW);
  switch (APPLET_VIEW) {
    case ThreadsEntryType.ParticipationProtocol:
      return setupVinesEntryView();
    //case ThreadsEntryType.ParticipationProtocol: return setupThreadsBlockView();
    case "main":
    default:
      return setupVinesMainView();
  }
}


/** */
async function setupVinesMainView() {
  const appletServices: AppletServices = {
    creatables,
    getAssetInfo,
    //bindAsset,//: async (a, b, c, d) => {},
    search,
  };
  return setup(appletServices, createVinesApplet, devtestNames, createDefaultWeServicesMock);
}
