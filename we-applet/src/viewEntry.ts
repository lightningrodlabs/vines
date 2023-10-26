import {encodeHashToBase64} from "@holochain/client";
import {html, css, render} from "lit";
import {Hrl, WeClient} from "@lightningrodlabs/we-applet";
import {ThreadsApp} from "@threads/app";
import {HappElement} from "@ddd-qc/lit-happ";
import {getBasePath, setBasePath} from "@shoelace-style/shoelace/dist/utilities/base-path";
import {appletServices} from "./appletServices/appletServices";
import {CreateAppletFn} from "./common/setup";
import {createThreadsApplet} from "./createThreadsApplet";

export interface ViewThreadContext {
  detail: string,
  subjectType: string,
  subjectName: string,
}


/** participation_protocol entry type */

/** */
export async function setupCommentThread(): Promise<HappElement> {
  console.log("setupCommentThread()");

  setBasePath('./');
  console.log("shoelace basePath", getBasePath());

  console.log("WeClient.connect()...", WeClient);
  const weClient = await WeClient.connect(appletServices);
  console.log("weClient", weClient);
  if (weClient.renderInfo.type != "applet-view") {
    console.error("Setup called for non 'applet-view' type")
    return;
  }

  ///** Delay because of We 'CellDisabled' bug at startup race condition */
  //await delay(1000);

  const renderInfo = weClient.renderInfo as any;
  const happElem = await createThreadsApplet(renderInfo.appletClient, renderInfo.appletHash, renderInfo.profilesClient, weClient, true);
  console.log("applet", happElem);


  /** Append Element */
  /** TODO: Figure out why cell-context doesn't propagate normally via ThreadsApp and has to be inserted again within the slot */
  const template = html`
          <cell-context .cell=${happElem.threadsDvm.cell}>
              <comment-thread-view .threadHash=${encodeHashToBase64(weClient.renderInfo.view.hrl[1])} showInput="true"
                                   .subjectName=${context.subjectName}
                                   .subjectType=${context.subjectType}></comment-thread-view>
          </cell-context>
      `;
  console.log("Appending <comment-thread-view> to ThreadsApp...");
  render(template, happElem);
  console.log("DONE - Appending <comment-thread-view> to ThreadsApp");

  return happElem;
}


// /** participation_protocol entry type */
// let viewParticipationProtocol = async (hostElem, hrl: Hrl, context: ViewThreadContext) => {
//   console.log("viewParticipationProtocol()", encodeHashToBase64(hrl[1]), context);
//
//   const happElem = await createThreadsApplet(true);
//
//   /** TODO: Figure out why cell-context doesn't propagate normally via ThreadsApp and has to be inserted again within the slot */
//   const template = html`
//       <cell-context .cell=${happElem.threadsDvm.cell}>
//           <comment-thread-view .threadHash=${encodeHashToBase64(hrl[1])} showInput="true" .subjectName=${context.subjectName} .subjectType=${context.subjectType}></comment-thread-view>
//       </cell-context>
//   `;
//
//   /** Append Elements */
//   console.log("Appending <comment-thread-view> to ThreadsApp...");
//   render(template, happElem);
//   console.log("DONE - Appending <comment-thread-view> to ThreadsApp");
//
//   hostElem.appendChild(happElem); //render(happElem, hostElem);
// }


// /** Path entry type */
//   letViewPath = async (element, hrl: Hrl, context: any) => {
//     //const cellProxy = await asCellProxy(client, hrl, "ThreadsWeApplet", "role_threads");
//     //const proxy: ThreadsProxy = new ThreadsProxy(cellProxy);
//     const spaceElem = html`
//         <div>Before custom element</div>
//
//         <div>After custom element</div>
//     `;
//     render(spaceElem, element);
//   }

