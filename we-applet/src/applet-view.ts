import {AppAgentClient, AppAgentWebsocket, AppWebsocket, encodeHashToBase64, EntryHash} from "@holochain/client";
import { html, render} from "lit";
import { msg } from "@lit/localize";

import {
  Hrl,
  AppletViews,
  CrossAppletViews,
  WeApplet,
  WeServices,
} from "@lightningrodlabs/we-applet";

import "@holochain-open-dev/profiles/dist/elements/profiles-context.js";
import "@lightningrodlabs/we-applet/dist/elements/we-services-context.js";
import "@lightningrodlabs/we-applet/dist/elements/hrl-link.js";

import {ProfilesClient, ProfilesStore} from "@holochain-open-dev/profiles";
import {ThreadsApp} from "@threads/app";
import {asCellProxy} from "./we-utils";
import {ThreadsProxy} from "@threads/elements/dist/bindings/threads.proxy";
import {ConductorAppProxy} from "@ddd-qc/cell-proxy";
import {ConductorProxyProfilesMock} from "./mock";
import {ProfilesApi} from "./profilesApi";
import {ExternalAppProxy} from "@ddd-qc/cell-proxy/dist/ExternalAppProxy";
import {HCL} from "@ddd-qc/lit-happ";


// FIXME: Add threads-context in some way

class ProfilesZomeMock {
}

/** */
export function appletViews(
  client: AppAgentClient,
  _appletId: EntryHash,
  profilesClient: ProfilesClient,
  weServices: WeServices
): AppletViews {
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
      const hcl = new HCL(profilesAppInfo.installed_app_id, profilesClient.roleName);
      const profilesApi = new ProfilesApi(profilesClient);
      const profilesProxy = new ExternalAppProxy(profilesApi, 10 * 1000);
      await profilesProxy.fetchCells(profilesAppInfo.installed_app_id, profilesClient.roleName);
      await profilesProxy.createCellProxy(hcl);
      /** Create and append <threads-app> */
      const app = new ThreadsApp(mainAppWs, undefined, true, "threads-applet", profilesAppInfo.installed_app_id, profilesClient.roleName, profilesClient.zomeName, profilesProxy, weServices);
      element.appendChild(app);
    },
    blocks: {},
    entries: {
      rThreads: {
        threads_integrity: {

          /** Thread */
          participation_protocol: {
            info: async (hrl: Hrl) => {
              const cellProxy = await asCellProxy(client, hrl, "threads-applet", "rThreads");
              const proxy: ThreadsProxy = new ThreadsProxy(cellProxy);
              const pp = await proxy.getPp(hrl[1]);
              return {
                icon_src: "",
                name: pp[0].purpose,
              };
            },
            view: async (element, hrl: Hrl, context) => {
              //const cellProxy = await asCellProxy(client, hrl, "threads-applet", "rThreads");
              //const proxy: ThreadsProxy = new ThreadsProxy(cellProxy);
              const spaceElem = html`
                  <div>Before custom element</div>
                  <comment-thread-view .threadHash=${encodeHashToBase64(hrl[1])}></comment-thread-view>
                  <div>After custom element</div>
              `;
              render(spaceElem, element);
            },
          },


          /** TextMessage */
          text_message: {
            info: async (hrl: Hrl) => {
              const cellProxy = await asCellProxy(client, hrl, "threads-applet", "rThreads");
              const proxy: ThreadsProxy = new ThreadsProxy(cellProxy);
              const tuple = await proxy.getTextMessage(hrl[1]);
              return {
                icon_src: "",
                name: tuple[2].value,
              };
            },
            view: async (element, hrl: Hrl, context) => {
              //const cellProxy = await asCellProxy(client, hrl, "threads-applet", "rThreads");
              //const proxy: ThreadsProxy = new ThreadsProxy(cellProxy);
              const spaceElem = html`
                  <div>Before custom element</div>
                  <chat-message-item .hash=${encodeHashToBase64(hrl[1])}></chat-message-item>
                  <div>After custom element</div>
              `;
              render(spaceElem, element);
            },
          },


          // /** Path entry type */
          // path: {
          //   info: async (hrl: Hrl) => {
          //     const cellProxy = await asCellProxy(client, hrl, "threads-applet", "rThreads");
          //     const proxy: ThreadsProxy = new ThreadsProxy(cellProxy);
          //     const tuple = await proxy.getSubjectsByType(hrl[1]);
          //     return {
          //       icon_src: "",
          //       name: tuple[2].value,
          //     };
          //   },
          //   view: async (element, hrl: Hrl, context: any) => {
          //     //const cellProxy = await asCellProxy(client, hrl, "threads-applet", "rThreads");
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
