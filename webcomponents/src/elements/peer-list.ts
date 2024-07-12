import {html, css, LitElement} from "lit";
import { property, state, customElement } from "lit/decorators.js";
import { localized, msg } from '@lit/localize';

import {ActionId, AgentId, AgentIdMap, DnaElement} from "@ddd-qc/lit-happ";
import {ThreadsDnaPerspective, ThreadsDvm} from "../viewModels/threads.dvm";

import "@shoelace-style/shoelace/dist/components/avatar/avatar.js"
import "@shoelace-style/shoelace/dist/components/badge/badge.js"
import "@shoelace-style/shoelace/dist/components/tooltip/tooltip.js";
import "@shoelace-style/shoelace/dist/components/input/input.js";
import {Profile as ProfileMat, ProfilesAltPerspective,} from "@ddd-qc/profiles-dvm";
import {renderProfileAvatar} from "../render";

/** @element peer-list */
@localized()
@customElement("peer-list")
export class PeerList extends DnaElement<ThreadsDnaPerspective, ThreadsDvm> {
  constructor() {
    super(ThreadsDvm.DEFAULT_BASE_ROLE_NAME);
  }

  @property() soloAgent: AgentId | null  = null; // filter for a specific agent


  @property({type: Object, attribute: false, hasChanged: (_v, _old) => true})
  profilesPerspective!: ProfilesAltPerspective;

  @property() canShowTable: boolean = true;

  @state() private _isHovered = false;

  @state() private _loaded = false;


  /** -- Methods -- */

  /** After first render only */
  firstUpdated() {
    this._dvm.profilesZvm.subscribe(this, "profilesPerspective");

    console.log("<peer-list> firstUpdated()", this.profilesPerspective);
    this._loaded = true;
  }


  /** */
  determineAgentStatus(key: AgentId): string {
    // const status = "primary"; // "neutral"
    if (key.equals(this._dvm.profilesZvm.cell.agentId)) {
      return "success";
    }
    const lastPingTime: number = this.perspective.agentPresences.get(key);
    const currentTime: number = Math.floor(Date.now() / 1000);
    const diff: number = currentTime - lastPingTime;
    if (diff < 30) {
      return "success";
    }
    if (diff < 5 * 60) {
      return "warning";
    }
    return "danger";
  }


  /** */
  handleClickAvatar(agentId: AgentId) {
    console.log("Avatar clicked:", agentId)
    this.dispatchEvent(new CustomEvent<AgentId>('avatar-clicked', { detail: agentId, bubbles: true, composed: true }));
    //console.log(e.detail)
    this.soloAgent = agentId.equals(this.soloAgent)? null : agentId;
    //this.requestUpdate();
  }


  /** */
  status2color(status: string): string {
    switch(status) {
      case "primary": return "rgb(14, 165, 233)"; break;
      case "neutral": return "rgb(113, 113, 122)"; break;
      case "success": return "rgb(34, 197, 94)"; break;
      case "warning": return "rgb(245, 158, 11)"; break;
      case "danger": return "rgb(239, 68, 68)"; break;
      default: return "rgb(0, 0, 0)"; break;
    }
  }


  /** */
  onClickComment(maybeCommentThread: ActionId | null, agent: AgentId) {
    this.dispatchEvent(new CustomEvent('commenting-clicked', {
      detail: {maybeCommentThread, subjectHash: agent, subjectType: "Profile"},
      bubbles: true,
      composed: true,
    }));
  }


  /** */
  renderList(profiles:  AgentIdMap<ProfileMat>) {
    if (profiles.size === 0) {
      return html`
        <li>
            (no profiles found)
        </li>`;
    }
    /** Build avatar agent list */
    const peers = Array.from(profiles.entries())
      .filter(([agentId, _profile]) => !agentId.equals(this.cell.agentId))
      .map(([agentId, profile]) => {

      return html`
        <li class="folk" style="display:flex; align-items:center" 
            @mouseenter=${(e) => this._isHovered = true} @mouseleave=${(e) => this._isHovered = false}
        >
          <span @click=${(e) => this.handleClickAvatar(agentId)}>
            ${renderProfileAvatar(this.profilesPerspective.getProfile(agentId), "S")}
            <!--<sl-badge class="avatar-badge" type="${this.determineAgentStatus(agentId)}" pill></sl-badge> -->
            <span style="margin-left:4px;margin-right:7px;font-size:16px;font-weight:bold;-webkit-text-stroke:0.1px black;">
              ${profile.nickname}
            </span>
          </span>
        </li>`
    })

    /** */
    return html`
      <div class="folks">
        ${peers}
      </div>
    `
  }


  /** */
  render() {
    //console.log("<peer-list> render()", this._loaded);
    if (!this._loaded) {
      return html`<div class="fill center-content">
        Loading...
      </div>`;
    }

    // FIXME
    //return this.renderList(this.profilesPerspective.profiles);
    return html`<div>FIXME</div>`;
  }


  /** */
  static get styles() {
    return [
      css`
        .folks {
          overflow-y: auto;
        }

        .folk-row {
          list-style: none;
          cursor: pointer;
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
