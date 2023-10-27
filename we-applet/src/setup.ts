import {createDefaultWeServicesMock, setup, setupDevtest} from "@ddd-qc/we-utils";
import {appletServices, threadsNames} from "./appletServices/appletServices";
import {createThreadsApplet} from "./createThreadsApplet";
import {delay, HAPP_ENV, HappElement, HappEnvType} from "@ddd-qc/lit-happ";
import {getBasePath, setBasePath} from "@shoelace-style/shoelace/dist/utilities/base-path.js";
import {WeClient} from "@lightningrodlabs/we-applet";
import {html, render} from "lit";
import {encodeHashToBase64} from "@holochain/client";
import {AppletView} from "@lightningrodlabs/we-applet/dist/types";




// /** */
// export async function setupThreadsApplet() {
//   console.log("Using default we-applet setup()");
//   return setup(appletServices, createThreadsApplet, threadsNames, createDefaultWeServicesMock);
// }


/** */
export async function setupThreadsApplet() {
  console.log("setupThreadsApplet() HAPP_ENV", HAPP_ENV);
  console.log("setupThreadsApplet() window", window);
  if (HAPP_ENV == HappEnvType.DevtestWe) {
    return setupDevtest(createThreadsApplet, threadsNames, createDefaultWeServicesMock);
  } else {
    return setupProdView();
  }
}


export interface ViewThreadContext {
  detail: string,
  subjectType: string,
  subjectName: string,
}



/** */
export async function setupProdView(): Promise<HappElement> {
  console.log("setupProdView()");

  setBasePath('./');
  console.log("shoelace basePath", getBasePath());

  console.log("WeClient.connect()...");
  const weClient = await WeClient.connect(appletServices);
  console.log("weClient", weClient);
  if (weClient.renderInfo.type == "cross-applet-view") {
    console.error("cross-applet-view is not implemented")
    return;
  }

  const renderInfo = weClient.renderInfo as any;
  const renderView = renderInfo.view as AppletView;

  let showCommentsOnly = undefined; // important to be undefined!
  switch (renderView.type) {
    case "main": break;
    case "block": throw new Error("Block view is not implemented.");
    case "entry": {
      switch (renderView.entryType) {
        case "participation_protocol": showCommentsOnly = true; break;
        default: throw new Error(`Unknown entry type ${renderView.entryType}.`);
      }
    } break;
    default: throw new Error("Unknown render view type");
  }

  /** Delay because of We 'CellDisabled' bug at startup race condition */
  await delay(1000);

  console.log("setupProdView() showCommentsOnly", showCommentsOnly);
  const happElem = await createThreadsApplet(renderInfo.appletClient, renderInfo.appletHash, renderInfo.profilesClient, weClient, showCommentsOnly);
  console.log("happElem", happElem);

  /** Append Element */
  //let template = html``;
  if (showCommentsOnly) {
    const entryView = renderView as any;
    const viewContext = entryView.context as ViewThreadContext;
    /** participation_protocol entry type */
    /** TODO: Figure out why cell-context doesn't propagate normally via ThreadsApp and has to be inserted again within the slot */
    const template = html`
      <cell-context .cell=${happElem.threadsDvm.cell}>
        <comment-thread-view .threadHash=${encodeHashToBase64(entryView.hrl[1])} showInput="true"
                             .subjectName=${viewContext.subjectName}
                             .subjectType=${viewContext.subjectType}></comment-thread-view>
      </cell-context>
    `;
    console.log("Appending <comment-thread-view> to ThreadsApp...");
    render(template, happElem);
    console.log("DONE - Appending <comment-thread-view> to ThreadsApp");
  }
  /** Done */
  return happElem;
}
