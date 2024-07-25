import {html, css, LitElement} from "lit";
import { property, state, customElement } from "lit/decorators.js";
import { localized, msg } from '@lit/localize';

import {ActionId, AgentId, ZomeElement} from "@ddd-qc/lit-happ";

import "@shoelace-style/shoelace/dist/components/avatar/avatar.js"
import "@shoelace-style/shoelace/dist/components/badge/badge.js"
import "@shoelace-style/shoelace/dist/components/tooltip/tooltip.js";
import "@shoelace-style/shoelace/dist/components/input/input.js";
import {Profile as ProfileMat, ProfilesAltPerspective, ProfilesAltZvm,} from "@ddd-qc/profiles-dvm";
import {renderProfileAvatar} from "../render";
import {Timestamp} from "@holochain/client";


/** @element peer-list */
@localized()
@customElement("peer-list")
export class PeerList extends ZomeElement<ProfilesAltPerspective, ProfilesAltZvm> {

  constructor() {
    super(ProfilesAltZvm.DEFAULT_ZOME_NAME);
  }


  /** */
  render() {
    console.log("<peer-list> render()", this.perspective);

    if (this.perspective.profiles.size === 0) {
      return html`<li>${msg('no profiles found')}</li>`;
    }
    /** Build peer list */
    const profiles: [AgentId, ProfileMat, Timestamp][] = [];
    for (const [agentId, profileId] of this.perspective.profileByAgent.entries()) {
      if (agentId.equals(this.cell.address.agentId)) {
        continue;
      }
      const pair = this.perspective.profiles.get(profileId);
      if (!pair) {
        continue;
      }
      profiles.push([agentId, pair[0], pair[1]]);
    }

    /** render each peer */
    const peers = profiles
      .map(([agentId, profile, _ts]) => {
        return html`
          <li class="folk" style="display:flex; align-items:center">
            <span @click=${(e) => this.dispatchEvent(new CustomEvent<AgentId>('avatar-clicked', { detail: agentId, bubbles: true, composed: true }))}>
              ${renderProfileAvatar(profile, "S")}
              <span style="margin-left:4px;margin-right:7px;font-size:16px;font-weight:bold;-webkit-text-stroke:0.1px black;">
                ${profile.nickname}
              </span>
            </span>
          </li>`
      })

    /** render all */
    return html`
      <div class="folks">
        ${peers}
      </div>
    `
  }


  /** */
  static get styles() {
    return [
      css`
        .folks {
          overflow-y: auto;
        }
        
        .folk {
          list-style: none;
          margin: 2px;
          /*text-align: center;*/
          font-size: 70%;
          cursor: pointer;
        }

        .folk:hover {
          background: rgba(202, 230, 250, 0.66);
        }

        .folk > img {
          width: 50px;
          border-radius: 10000px;
        }

        .avatar-badge {
          margin-left: -15px;
          vertical-align: bottom;
        }

        .avatar-badge::part(base) {
          border: 1px solid;
          padding-top: 10px;
        }

        sl-tooltip {
          display: inline;
        }
      `
    ];
  }
}
