import {createDefaultWeServicesMock, EntryViewInfo, setup, setupDevtest} from "@ddd-qc/we-utils";
import {appletServices, threadsNames} from "./appletServices/appletServices";
import {createThreadsApplet} from "./createThreadsApplet";
import {emptyEntryAppletView} from "@ddd-qc/we-utils/dist/mocks/renderInfoMock";
import {THREADS_DEFAULT_INTEGRITY_ZOME_NAME, THREADS_DEFAULT_ROLE_NAME, ThreadsEntryType} from "@threads/elements";
import {snake} from "@ddd-qc/cell-proxy";
import {ActionHash, EntryHash, fakeActionHash, fakeEntryHash} from "@holochain/client";
import {ViewThreadContext} from "@threads/app";


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
    case ThreadsEntryType.ParticipationProtocol: return setupEntryViewThreadsApplet();
    case "main":
    default: return setup(appletServices, createThreadsApplet, threadsNames, createDefaultWeServicesMock);
  }
}



/** -- DevTest Entry Views -- */

/** */
function createPpEntryRenderInfo(ppAh: ActionHash, context: ViewThreadContext): EntryViewInfo {
  const entryInfo = emptyEntryAppletView as EntryViewInfo;
  entryInfo.roleName = THREADS_DEFAULT_ROLE_NAME;
  entryInfo.integrityZomeName = THREADS_DEFAULT_INTEGRITY_ZOME_NAME;
  entryInfo.entryType = snake(ThreadsEntryType.ParticipationProtocol);
  entryInfo.hrl[1] = ppAh;
  entryInfo.context = context;

  return entryInfo;
}


/** */
export async function setupEntryViewThreadsApplet() {
  console.log("Using EntryView we-applet setup()");

  const context: ViewThreadContext = {
    detail: "none",
    subjectName: "DevTest subject",
    subjectType: "unknown",
  }

  const appletView = createPpEntryRenderInfo(await fakeActionHash(), context);
  return setupDevtest(createThreadsApplet, threadsNames, createDefaultWeServicesMock, appletView);
}
