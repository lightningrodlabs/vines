import {AppAgentClient, AppAgentWebsocket, AppWebsocket, encodeHashToBase64, EntryHash} from "@holochain/client";
import { html, render} from "lit";
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
import {ThreadsProxy} from "@threads/elements/dist/bindings/threads.proxy";
import {ProfilesApi} from "./profilesApi";
import {ExternalAppProxy} from "@ddd-qc/cell-proxy/dist/ExternalAppProxy";
import {destructureCloneId, HCL} from "@ddd-qc/lit-happ";



/** */
export async function appletViews(
  client: AppAgentClient,
  thisAppletId: EntryHash,
  profilesClient: ProfilesClient,
  weServices: WeServices
): Promise<AppletViews> {
  return {
    main: async (element) => {
      /** Link to styles */
      const cssLink = document.createElement('link');
      cssLink.href = "https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.4.0/dist/themes/light.css";
      cssLink.rel = "stylesheet";
      cssLink.media="(prefers-color-scheme:light)"
      element.appendChild(cssLink);
      /** Determine profilesAppInfo */
      console.log("ThreadsApplet.main()", client);
      const mainAppAgentWs = client as AppAgentWebsocket;
      let mainAppInfo = await mainAppAgentWs.appInfo();
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

      const hcl = new HCL(profilesAppInfo.installed_app_id, baseRoleName, maybeCloneId);
      const profilesApi = new ProfilesApi(profilesClient);
      const profilesProxy = new ExternalAppProxy(profilesApi, 10 * 1000);
      await profilesProxy.fetchCells(profilesAppInfo.installed_app_id, baseRoleName);
      await profilesProxy.createCellProxy(hcl);
      /** Create and append <threads-app> */
      const app = await ThreadsApp.fromWe(
        mainAppWs, undefined, false, "threads-applet",
        profilesAppInfo.installed_app_id, baseRoleName, profilesClient.zomeName, profilesProxy,
        weServices, thisAppletId);
      element.appendChild(app);
    },

    blocks: {},

    entries: {
      role_threads: {
        threads_integrity: {

          /** TextMessage */
          text_message: {
            info: async (hrl: Hrl) => {
              console.log("(applet-view) text_message info", hrl);
              const cellProxy = await asCellProxy(client, hrl, "threads-applet", "role_threads");
              const proxy: ThreadsProxy = new ThreadsProxy(cellProxy);
              const tuple = await proxy.getTextMessage(hrl[1]);
              return {
                icon_src: "",
                name: tuple[2].value,
              };
            },
            view: async (element, hrl: Hrl, context) => {
              //const cellProxy = await asCellProxy(client, hrl, "threads-applet", "role_threads");
              //const proxy: ThreadsProxy = new ThreadsProxy(cellProxy);
              const spaceElem = html`
                  <div>Before custom element</div>
                  <chat-message-item .hash=${encodeHashToBase64(hrl[1])}></chat-message-item>
                  <div>After custom element</div>
              `;
              render(spaceElem, element);
            },
          },


          /** Thread */
          participation_protocol: {
            info: async (hrl: Hrl) => {
              console.log("(applet-view) pp info", hrl);
              const cellProxy = await asCellProxy(client, hrl, "threads-applet", "role_threads");
              const proxy: ThreadsProxy = new ThreadsProxy(cellProxy);
              const pp = await proxy.getPp(hrl[1]);
              return {
                icon_src: "",
                name: pp[0].purpose,
              };
            },
            view: async (element, hrl: Hrl, context) => {
              //const cellProxy = await asCellProxy(client, hrl, "threads-applet", "role_threads");
              //const proxy: ThreadsProxy = new ThreadsProxy(cellProxy);
              const spaceElem = html`
                  <div>Before custom element</div>
                  <comment-thread-view .threadHash=${encodeHashToBase64(hrl[1])}></comment-thread-view>
                  <div>After custom element</div>
              `;
              render(spaceElem, element);
            },
          },


          // /** Path entry type */
          // path: {
          //   info: async (hrl: Hrl) => {
          //     const cellProxy = await asCellProxy(client, hrl, "threads-applet", "role_threads");
          //     const proxy: ThreadsProxy = new ThreadsProxy(cellProxy);
          //     const tuple = await proxy.getSubjectsByType(hrl[1]);
          //     return {
          //       icon_src: "",
          //       name: tuple[2].value,
          //     };
          //   },
          //   view: async (element, hrl: Hrl, context: any) => {
          //     //const cellProxy = await asCellProxy(client, hrl, "threads-applet", "role_threads");
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
