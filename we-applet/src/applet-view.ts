import {
  AppAgentClient,
  AppAgentWebsocket,
  encodeHashToBase64,
  EntryHash
} from "@holochain/client";
import {html, render} from "lit";
import { msg } from "@lit/localize";

import {
  Hrl,
  AppletViews,
  WeServices,
} from "@lightningrodlabs/we-applet";

import "@holochain-open-dev/profiles/dist/elements/profiles-context.js";
import "@lightningrodlabs/we-applet/dist/elements/we-services-context.js";
import "@lightningrodlabs/we-applet/dist/elements/hrl-link.js";

import {ProfilesClient} from "@holochain-open-dev/profiles";
import {ThreadsApp} from "@threads/app";
import {asCellProxy} from "./we-utils";
import {ThreadsProxy} from "@threads/elements";
import {ProfilesApi} from "./profilesApi";
import {ExternalAppProxy} from "@ddd-qc/cell-proxy/";
import {destructureCloneId, HCL} from "@ddd-qc/lit-happ";


export interface ViewThreadContext {
  detail: string,
  subjectType: string,
  subjectName: string,
}


/** */
export async function appletViews(
  client: AppAgentClient,
  thisAppletId: EntryHash,
  profilesClient: ProfilesClient,
  weServices: WeServices
): Promise<AppletViews> {

  const mainAppInfo = await client.appInfo();

  /** */
  const createThreadsApp = async (showCommentThreadOnly?: boolean) => {
    /** Determine profilesAppInfo */
    console.log("ThreadsApplet.main()", client);
    const mainAppAgentWs = client as AppAgentWebsocket;
    const mainAppWs = mainAppAgentWs.appWebsocket;
    // const mainAppWs = client as unknown as AppWebsocket;
    // const mainAppInfo = await mainAppWs.appInfo({installed_app_id: 'threads-applet'});
    console.log("mainAppInfo", mainAppInfo);
    //const profilesAppAgentClient: AppAgentClient = profilesClient.client;
    let profilesAppInfo = await profilesClient.client.appInfo();
    console.log("profilesAppInfo", profilesAppInfo, profilesClient.roleName);
    /** Check if roleName is actually a cloneId */
    let maybeCloneId = undefined;
    let baseRoleName = profilesClient.roleName;
    const maybeBaseRoleName = destructureCloneId(profilesClient.roleName);
    if (maybeBaseRoleName) {
      baseRoleName = maybeBaseRoleName[0];
      maybeCloneId = profilesClient.roleName;
    }
    /** Determine profilesCellProxy */
    const hcl = new HCL(profilesAppInfo.installed_app_id, baseRoleName, maybeCloneId);
    const profilesApi = new ProfilesApi(profilesClient);
    const profilesAppProxy = new ExternalAppProxy(profilesApi, 10 * 1000);
    await profilesAppProxy.fetchCells(profilesAppInfo.installed_app_id, baseRoleName);
    const profilesCellProxy = await profilesAppProxy.createCellProxy(hcl);
    console.log("profilesCellProxy", profilesCellProxy);
    /** Create ThreadsApp */
    const app = await ThreadsApp.fromWe(
      mainAppWs, undefined, false, mainAppInfo.installed_app_id,
      profilesAppInfo.installed_app_id, baseRoleName, maybeCloneId, profilesClient.zomeName, profilesAppProxy,
      weServices, thisAppletId, showCommentThreadOnly);
    /** Done */
    return app;
  }

  /** */
  return {
    main: async (hostElem) => {
      /** Link to styles */
      const cssLink = document.createElement('link');
      cssLink.href = "https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.4.0/dist/themes/light.css";
      cssLink.rel = "stylesheet";
      cssLink.media="(prefers-color-scheme:light)"
      /** Create and append <threads-app> */
      const app = await createThreadsApp();
      /** Append Elements to host */
      hostElem.appendChild(cssLink);
      hostElem.appendChild(app);
    },

    blocks: {},

    entries: {
      role_threads: {
        threads_integrity: {

          /** TextMessage */
          text_message: {
            /** */
            info: async (hrl: Hrl) => {
              console.log("(applet-view) text_message info", hrl);
              const cellProxy = await asCellProxy(
                client,
                undefined, //hrl[0],
                mainAppInfo.installed_app_id, //"ThreadsWeApplet",
                "role_threads",
              );
              const proxy: ThreadsProxy = new ThreadsProxy(cellProxy);
              const tuple = await proxy.getTextMessage(hrl[1]);
              return {
                icon_src: "",
                name: tuple[2].value,
              };
            },
            /** */
            view: async (element, hrl: Hrl, context) => {
              // FIXME
              // const spaceElem = html`
              //     <div>Before custom element</div>
              //     <chat-message-item .hash=${encodeHashToBase64(hrl[1])}></chat-message-item>
              //     <div>After custom element</div>
              // `;
              // render(spaceElem, element);
            },
          },


          /** Thread */
          participation_protocol: {
            /** */
            info: async (hrl: Hrl) => {
              console.log("(applet-view) pp info", hrl);
              const cellProxy = await asCellProxy(
                client,
                undefined, // hrl[0],
                mainAppInfo.installed_app_id,
              "role_threads");
              console.log("(applet-view) cellProxy", cellProxy);
              const proxy: ThreadsProxy = new ThreadsProxy(cellProxy);
              console.log("(applet-view) getPp()", encodeHashToBase64(hrl[1]), proxy);
              const pp = await proxy.getPp(hrl[1]);
              console.log("(applet-view) pp", pp);
              return {
                icon_src: "",
                name: pp[0].purpose,
              };
            },


            /** */
            view: async (hostElem, hrl: Hrl, context: ViewThreadContext) => {
              console.log("(applet-view) participation_protocol:", encodeHashToBase64(hrl[1]), context);

              const happElem = await createThreadsApp(true);

              /** TODO: Figure out why cell-context doesn't propagate normally via ThreadsApp and has to be inserted again within the slot */
              const template = html`
                  <cell-context .cell=${happElem.threadsDvm.cell}>
                      <comment-thread-view .threadHash=${encodeHashToBase64(hrl[1])} showInput="true" .subjectName=${context.subjectName} .subjectType=${context.subjectType}></comment-thread-view>
                  </cell-context>
              `;

              /** Append Elements */
              console.log("Appending <comment-thread-view> to ThreadsApp...");
              render(template, happElem);
              console.log("DONE - Appending <comment-thread-view> to ThreadsApp");

              hostElem.appendChild(happElem); //render(happElem, hostElem);
            },
          },


          // /** Path entry type */
          // path: {
          //   info: async (hrl: Hrl) => {
          //     const cellProxy = await asCellProxy(client, hrl, "ThreadsWeApplet", "role_threads");
          //     const proxy: ThreadsProxy = new ThreadsProxy(cellProxy);
          //     const tuple = await proxy.getSubjectsByType(hrl[1]);
          //     return {
          //       icon_src: "",
          //       name: tuple[2].value,
          //     };
          //   },
          //   view: async (element, hrl: Hrl, context: any) => {
          //     //const cellProxy = await asCellProxy(client, hrl, "ThreadsWeApplet", "role_threads");
          //     //const proxy: ThreadsProxy = new ThreadsProxy(cellProxy);
          //     const spaceElem = html`
          //         <div>Before custom element</div>
          //
          //         <div>After custom element</div>
          //     `;
          //     render(spaceElem, element);
          //   },
          // },


        }
      }
    },
  };
}
