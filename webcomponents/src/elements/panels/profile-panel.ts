import { html, css, LitElement } from 'lit';
import { property, query, state, customElement } from 'lit/decorators.js';
import { localized, msg, str } from '@lit/localize';

import "@shoelace-style/shoelace/dist/components/avatar/avatar.js"
import "@shoelace-style/shoelace/dist/components/color-picker/color-picker.js"
import "@shoelace-style/shoelace/dist/components/radio/radio.js";
import "@shoelace-style/shoelace/dist/components/radio-group/radio-group.js"
import {Profile as ProfileMat, ProfilesAltZvm} from "@ddd-qc/profiles-dvm";
import {AgentPubKeyB64, Timestamp} from "@holochain/client";
import {ZomeElement} from "@ddd-qc/lit-happ";
import {renderProfileAvatar, ts2day} from "../../render";
import {toasty} from "../../toast";
import {ProfilesAltPerspective} from "@ddd-qc/profiles-dvm/dist/profilesAlt.zvm";


/**
 *
 */
@localized()
@customElement("profile-panel")
export class ProfilePanel extends ZomeElement<ProfilesAltPerspective, ProfilesAltZvm> {

  constructor() {
    super(ProfilesAltZvm.DEFAULT_ZOME_NAME);
  }

  @property()
  hash: AgentPubKeyB64

  private _profile?: ProfileMat;
  private _profileDate: Timestamp;

  /**
   * In zvmUpdated() this._zvm is not already set!
   * Subscribe to ThreadsZvm
   */
  protected async zvmUpdated(newZvm: ProfilesAltZvm, oldZvm?: ProfilesAltZvm): Promise<void> {
    console.log("<profile-panel>.zvmUpdated()");
    if (!this.hash) {
      return;
    }
    this._profile = newZvm.perspective.profiles[this.hash];
    if (!this._profile) {
      this._profile = await newZvm.probeProfile(this.hash)
      this.requestUpdate();
    }
  }



  /** -- Methods -- */

  /** */
  render() {
    console.log("<profile-panel>.render()", this.hash, this._profile);

    if (this.hash == "") {
      return html`<div>Missing AgentPubKey</div>`;
    }
    this._profile = this.perspective.profiles[this.hash];
    if (!this._profile) {
      return html`<h3 style="margin:10px; color:#cc2525;">Missing Profile</h3>`;
    }
    const timestamp = this.perspective.profileDates[this.hash];
    const avatar = renderProfileAvatar(this._profile, "XL");

    /** */
    return html`
          <div style="background: ${this._profile.fields['color']}; width: 100%; height: 70px;"></div>
          <div style="display: flex; flex-direction:row; min-height:60px;">
              <div style="flex-grow:1;"></div>
              ${this.hash == this.cell.agentPubKey? html`
                  <ui5-button design="Transparent" icon="edit" tooltip=${msg("Settings")} style="margin-right: 5px;"
                  @click=${(e) => {
                  e.stopPropagation();
                  this.dispatchEvent(new CustomEvent('edit-profile', { detail: null, bubbles: true, composed: true }));
              }}></ui5-button>
            ` : html``}    
          </div>
          <div style="display: flex; flex-direction:column; padding:10px; margin:10px; border-radius:15px; background: #c6c6c6d6; color: #111;">
            <div style="display: flex; flex-direction:row; align-items:center;">
              <h3>${this._profile.nickname}</h3>
              <div style="flex-grow:1;"></div>
              <ui5-button icon="number-sign" design="Transparent" tooltip=${this.hash} @click=${(e) => {navigator.clipboard.writeText(this.hash); toasty(("Copied AgentPubKey to clipboard"));}}></ui5-button>
            </div>
            <hr style="width: 100%"/>
            <h5>${msg('Language')}</h5>
            <div class="info">${this._profile.fields['lang']}</div>
            <h5>${msg('Member since')}</h5>
            <div class="info">${ts2day(timestamp)}</div>
          </div>
          <div style="position:absolute; top:10px; left:10px">${avatar}</div>
    `;
  }


  static styles = [
    css`
      :host {
        display: flex;
        flex-direction: column;
        min-width: 250px;
      }

      h3 {
        margin: 0px;
      }

      h5 {
        text-transform: uppercase;
        margin: 0px;
      }

      .info {
        margin-bottom: 8px;
      }

      ui5-avatar {
        outline: 1px solid #606060;
      }

    `]
}
