import {
  AppAgentClient, AppAgentWebsocket,
  EntryHash,
} from "@holochain/client";
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

// import "./applet-main";
// import "./cross-applet-main";


/** */
const applet: WeApplet = {
  appletViews,
  crossAppletViews,
  attachmentTypes,
  search: async (appletClient: AppAgentClient, filter: string) => {return []},
};
export default applet;


/** */
async function attachmentTypes(appletClient: AppAgentClient) {
  return {}
}


/** */
function appletViews(
  client: AppAgentClient,
  _appletId: EntryHash,
  profilesClient: ProfilesClient,
  weServices: WeServices
): AppletViews {
  return {
    main: (element) => {
      const agentWs = client as AppAgentWebsocket;
      console.log("ThreadsApplet.main()", client, agentWs.appWebsocket)
      /** Link to styles */
      const cssLink = document.createElement('link');
      cssLink.href = "https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.4.0/dist/themes/light.css";
      cssLink.rel = "stylesheet";
      cssLink.media="(prefers-color-scheme:light)"
      element.appendChild(cssLink);
      /** Create and append <threads-app> */
      const app = new ThreadsApp(agentWs.appWebsocket, undefined, true, "threads-applet");
      element.appendChild(app);
    },
    blocks: {},
    entries: {},
  };
}


function crossAppletViews(
  applets: ReadonlyMap<EntryHash, { profilesClient: ProfilesClient; appletClient: AppAgentClient }>, // Segmented by groupId
  weServices: WeServices,
): CrossAppletViews {
  // .store=${new ProfilesStore(applets[random].profilesClient)}
  return {
    main: (element) =>
      render(
        html`
          <we-services-context .services=${weServices}>
            <!-- <profiles-context> -->
              <cross-applet-main .applets=${applets}></cross-applet-main>
            <!-- </profiles-context> -->
          </we-services-context>
        `,
        element
      ),
    blocks: {},
  };
}


