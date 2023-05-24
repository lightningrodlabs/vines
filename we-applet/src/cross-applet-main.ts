import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { SynStore, SynClient } from "@holochain-syn/core";

import { localized, msg } from "@lit/localize";

import "@holochain-syn/core/dist/elements/syn-context.js";
import "@holochain-open-dev/profiles/dist/elements/profiles-context.js";
import "@holochain-open-dev/elements/dist/elements/display-error.js";
import "@shoelace-style/shoelace/dist/components/spinner/spinner.js";

import "@lightningrodlabs/notebooks/dist/elements/markdown-note.js";
import "@lightningrodlabs/notebooks/dist/elements/all-notes.js";

import { sharedStyles } from "@holochain-open-dev/elements";
import { AppAgentClient, DnaHash, EntryHash } from "@holochain/client";
import { ProfilesClient, ProfilesStore } from "@holochain-open-dev/profiles";
import { lazyLoad, StoreSubscriber } from "@holochain-open-dev/stores";
import {
  AppletInfo,
  getAppletsInfosAndGroupsProfiles,
  GroupProfile,
  WeServices,
  weServicesContext,
} from "@lightningrodlabs/we-applet";
import { consume } from "@lit-labs/context";

@localized()
@customElement("cross-applet-main")
export class CrossAppletMain extends LitElement {
  @property()
  applets!: ReadonlyMap<
    EntryHash,
    { appletClient: AppAgentClient; profilesClient: ProfilesClient }
  >;

  @consume({ context: weServicesContext, subscribe: true })
  weServices!: WeServices;

  appletsInfo = new StoreSubscriber(
    this,
    () =>
      lazyLoad(async () =>
        getAppletsInfosAndGroupsProfiles(
          this.weServices,
          Array.from(this.applets.keys())
        )
      ),
    () => []
  );

  renderNotes(
    applets: ReadonlyMap<EntryHash, AppletInfo>,
    groupsProfiles: ReadonlyMap<DnaHash, GroupProfile>
  ) {
    return html`
      <div class="column" style="flex: 1;">
        ${Array.from(this.applets.entries()).map(
          ([appletId, { appletClient, profilesClient }]) =>
            html`
              <profiles-context .store=${new ProfilesStore(profilesClient)}>
                <syn-context
                  .synstore=${new SynStore(
                    new SynClient(appletClient, "notebooks")
                  )}
                >
                  <div class="row">
                    <span class="title">${msg("Notes")} ${msg("in")} </span>
                    ${applets
                      .get(appletId)
                      ?.groupsIds.map(
                        (groupId) => html`
                          <sl-icon
                            .src=${groupsProfiles.get(groupId)?.logo_src}
                            style="margin-right: 4px"
                          ></sl-icon>
                        `
                      )}
                    <span>${applets.get(appletId)?.appletName}</span>
                  </div>
                  <all-notes style="flex: 1; margin: 16px;"></all-notes>
                </syn-context>
              </profiles-context>
            `
        )}
      </div>
    `;
  }

  render() {
    switch (this.appletsInfo.value.status) {
      case "pending":
        return html`<div class="row center-content" style="flex:1">
          <sl-spinner style="font-size: 2rem"></sl-spinner>
        </div>`;
      case "complete":
        return this.renderNotes(
          this.appletsInfo.value.value.appletsInfos,
          this.appletsInfo.value.value.groupsProfiles
        );
      case "error":
        return html`<display-error
          .headline=${msg("Error fetching the applets")}
          .error=${this.appletsInfo.value.error}
        ></display-error>`;
    }
  }

  static styles = [
    css`
      :host {
        display: flex;
        flex: 1;
      }
    `,
    sharedStyles,
  ];
}
