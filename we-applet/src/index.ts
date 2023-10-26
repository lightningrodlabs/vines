import {createDefaultWeServicesMock, setup} from "@ddd-qc/we-utils";
import {appletServices, threadsNames} from "./appletServices/appletServices";
import {createThreadsApplet} from "./createThreadsApplet";

export default setupThreadsApplet;


/** */
async function setupThreadsApplet() {
  return setup(appletServices, createThreadsApplet, threadsNames, createDefaultWeServicesMock);
}

