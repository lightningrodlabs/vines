import { html, css } from "lit";
import { property, state } from "lit/decorators.js";
import { localized, msg } from '@lit/localize';
import {SlAvatar, SlBadge, SlInput, SlTooltip} from '@scoped-elements/shoelace';

import {DnaElement} from "@ddd-qc/lit-happ";
import {ProfilesPerspective} from "../viewModels/profiles.zvm";
import {AgentPubKeyB64, decodeHashFromBase64} from "@holochain/client";
import {Dictionary} from "@ddd-qc/cell-proxy";
import {ThreadsDnaPerspective, ThreadsDvm} from "../viewModels/threads.dvm";
import {ThreadsProfile} from "../viewModels/profiles.proxy";



/** @element peer-list */
@localized()
export class PeerList extends DnaElement<ThreadsDnaPerspective, ThreadsDvm> {
  constructor() {
    super(ThreadsDvm.DEFAULT_BASE_ROLE_NAME);
  }

  /** -- Fields -- */
  @property() soloAgent: AgentPubKeyB64 | null  = null; // filter for a specific agent

  @property() canShowTable: boolean = true;

  @property({type: Object, attribute: false, hasChanged: (_v, _old) => true})
  profilesPerspective!: ProfilesPerspective;

  @state() private _loaded = false;


  /** -- Methods -- */

  /** After first render only */
  firstUpdated() {
    this._dvm.profilesZvm.subscribe(this, "profilesPerspective");
    console.log("<peer-list> firstUpdated()", this.profilesPerspective);
    this._loaded = true;
  }


  /** */
  determineAgentStatus(key: AgentPubKeyB64) {
    // const status = "primary"; // "neutral"
    if (key == this._dvm.cell.agentPubKey) {
      return "success";
    }
    const lastPingTime: number = this.perspective.agentPresences[key];
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
  handleClickAvatar(e: any) {
    const key = e.currentTarget.id
    console.log("Avatar clicked: " + key)
    this.dispatchEvent(new CustomEvent('avatar-clicked', { detail: key, bubbles: true, composed: true }));
    //console.log(e.detail)
    this.soloAgent = key == this.soloAgent? null : key;
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
  renderList(profiles:  Dictionary<ThreadsProfile>) {

    if (Object.keys(profiles).length === 0) {
      return html`
        <li>
            (no profiles found)
        </li>`;
    }

    // const filterField = this.shadowRoot!.getElementById("filter-field") as Input;
    // const filterStr = filterField && filterField.value? filterField.value : "";
    //
    // const visibleProfiles = Object.entries(profiles).filter(([key, profile]) => {
    //   return filterStr.length < 2 || profile.nickname.toLowerCase().includes(filterStr.toLowerCase())
    // });

    //console.log({visibleProfiles})

    /** Build avatar agent list */
    // const folks = visibleProfiles.map(([key, profile])=> {
    //   let opacity = 1.0;
    //   if (this.soloAgent && this.soloAgent != key) {
    //     opacity = 0.4;
    //   }
    //   return html`
    //     <li class="folk" style="opacity: ${opacity};">
    //       <sl-tooltip content=${profile.nickname} placement="right">
    //             <sl-avatar id=${key} @click="${this.handleClickAvatar}" .image=${profile.fields.avatar} style="background-color:${profile.fields.color};border: ${profile.fields.color} 1px solid;" ></sl-avatar>
    //             <sl-badge class="avatar-badge" type="${this.determineAgentStatus(key)}" pill></sl-badge>
    //       </sl-tooltip>
    //     </li>`
    // })

    /** Build avatar agent list */
    const peers = Object.entries(profiles).map(([keyB64, profile]) => {
      let key = decodeHashFromBase64(keyB64)
      let opacity = 1.0;
      if (this.soloAgent && this.soloAgent != keyB64) {
        opacity = 0.4;
      }
      return html`
        <li class="folk" style="opacity: ${opacity};">
          <span @click="${this.handleClickAvatar}">
            <sl-avatar id=${key}  .image=${profile.fields.avatar}
                       style="background-color:${profile.fields.color};border: black 1px solid;border-radius: var(--sl-border-radius-circle);">
            </sl-avatar>
            <sl-badge class="avatar-badge" type="${this.determineAgentStatus(keyB64)}" pill></sl-badge>
            <span style="color:${profile.fields['color']};margin-left:4px;font-size:16px;font-weight:bold;-webkit-text-stroke:0.1px black;">
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

    return this.renderList(this.profilesPerspective.profiles);
  }


  /** */
  static get scopedElements() {
    return {
      'sl-avatar': SlAvatar,
      'sl-tooltip': SlTooltip,
      'sl-badge': SlBadge,
      'sl-input': SlInput,
    };
  }


  /** */
  static get styles() {
    return [
      css`
        .folks {
          /*background-color: red;*/
          overflow-y: auto;
          margin-left: 10px;
          margin-top: 10px;
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
