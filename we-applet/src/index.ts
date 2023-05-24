import {
  AppAgentClient,
  CellType,
  DnaHash,
  EntryHash,
} from "@holochain/client";
import { html, render, TemplateResult } from "lit";
import { msg } from "@lit/localize";
//import { wrapPathInSvg } from "@holochain-open-dev/elements";
import { decode } from "@msgpack/msgpack";

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


import "./applet-main";
import "./cross-applet-main";


/** */
async function attachmentTypes(appletClient: AppAgentClient) {
  return {}
}

const applet: WeApplet = {
  appletViews,
  crossAppletViews,
  attachmentTypes,
  search: async (appletClient: AppAgentClient, filter: string) => {
    return []
    // const client = new SynClient(appletClient, "notebooks");
    //
    // const roots = await client.getAllRoots();
    // const appInfo = await appletClient.appInfo();
    // const dnaHash = (appInfo.cell_info.notebooks[0] as any)[
    //   CellType.Provisioned
    // ].cell_id[0];
    //
    // return roots
    //   .filter((r) => {
    //     const noteMeta = decode(r.entry.meta!) as NoteMeta;
    //
    //     return noteMeta.title.includes(filter);
    //   })
    //   .map((r) => ({ hrl: [dnaHash, r.entryHash], context: {} }));
  },
};

export default applet;


import {ProfilesClient} from "@holochain-open-dev/profiles";

function wrapAppletView(
  client: AppAgentClient,
  profilesClient: ProfilesClient,
  weServices: WeServices,
  innerTemplate: TemplateResult
): TemplateResult {
  const synStore = new SynStore(new SynClient(client, "notebooks"));
  return html`
    <we-services-context .services=${weServices}>
      <profiles-context .store=${new ProfilesStore(profilesClient)}>
        <syn-context .synstore=${synStore}>
          ${innerTemplate}
        </syn-context></profiles-context
      ></we-services-context
    >
  `;
}

function appletViews(
  client: AppAgentClient,
  _appletId: EntryHash,
  profilesClient: ProfilesClient,
  weServices: WeServices
): AppletViews {
  return {
    main: (element) =>
      render(
        wrapAppletView(
          client,
          profilesClient,
          weServices,
          html`
            <applet-main
              @note-selected=${async (e: CustomEvent) => {
                const appInfo = await client.appInfo();
                const dnaHash = (appInfo.cell_info.notebooks[0] as any)[
                  CellType.Provisioned
                ].cell_id[0];
                weServices.openViews.openHrl([dnaHash, e.detail.noteHash], {});
              }}
              @note-created=${async (e: CustomEvent) => {
                const appInfo = await client.appInfo();
                const dnaHash = (appInfo.cell_info.notebooks[0] as any)[
                  CellType.Provisioned
                ].cell_id[0];
                weServices.openViews.openHrl([dnaHash, e.detail.noteHash], {});
              }}
            ></applet-main>
          `
        ),
        element
      ),
    blocks: {},
    entries: {
      notebooks: {
        syn_integrity: {
          commit: {
            info: async (hrl: Hrl) => {
              const synClient = new SynClient(client, "notebooks");
              const root = await synClient.getCommit(hrl[1]);

              if (!root) return undefined;

              return {
                icon_src: wrapPathInSvg(mdiNotebook),
                name: (decode(root.entry.meta!) as NoteMeta).title,
              };
            },
            view: (element, hrl: Hrl, context) =>
              render(
                wrapAppletView(
                  client,
                  profilesClient,
                  weServices,
                  html`
                    <markdown-note
                      .noteHash=${hrl[1]}
                      style="flex: 1"
                    ></markdown-note>
                  `
                ),
                element
              ),
          },
        },
      },
    },
  };
}

function crossAppletViews(
  applets: ReadonlyMap<EntryHash, { profilesClient: ProfilesClient; appletClient: AppAgentClient }>, // Segmented by groupId
  weServices: WeServices,
): CrossAppletViews {
  return {
    main: (element) =>
      render(
        html`
          <we-services-context .services=${weServices}>
            <cross-applet-main .applets=${applets}></cross-applet-main>
          </we-services-context>
        `,
        element
      ),
    blocks: {},
  };
}


