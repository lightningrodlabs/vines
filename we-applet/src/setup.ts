import {createDefaultWeServicesMock, setup} from "@ddd-qc/we-utils";
import {appletServices, threadsNames} from "./appletServices/appletServices";
import {createThreadsApplet} from "./createThreadsApplet";


/** */
export async function setupThreadsApplet() {
  console.log("Using default we-applet setup()");
  return setup(appletServices, createThreadsApplet, threadsNames, createDefaultWeServicesMock);
}
