import {css, html, PropertyValues} from "lit";
import {customElement, property, state} from "lit/decorators.js";
import {delay, ZomeElement} from "@ddd-qc/lit-happ";
import {ActionHashB64, decodeHashFromBase64} from "@holochain/client";
import {ThreadsPerspective} from "../viewModels/threads.perspective";
import {consume} from "@lit/context";
import {weClientContext} from "../contexts";
import {AppletInfo, Hrl, WeServices} from "@lightningrodlabs/we-applet";
import {AttachableLocationAndInfo} from "@lightningrodlabs/we-applet/dist/types";
import {ThreadsZvm} from "../viewModels/threads.zvm";
import {AnyBead} from "../bindings/threads.types";


/**
 * @element
 */
@customElement("chat-hrl")
export class ChatHrl extends ZomeElement<ThreadsPerspective, ThreadsZvm> {

  constructor() {
    super(ThreadsZvm.DEFAULT_ZOME_NAME)
  }

  /** -- Properties -- */

  /** Hash of File bead to display */
  @property() hash: ActionHashB64 = '' // BeadAh

  @consume({ context: weClientContext, subscribe: true })
  weServices!: WeServices;

  @state() private _attLocAndInfo?: AttachableLocationAndInfo;
  @state() private _appletInfo?: AppletInfo;


  /** */
  render() {
    console.log("<chat-hrl>.render()", this.hash);
    if (!this.weServices) {
      return html`<div style="color: red">WeServices not available</div>`;
    }
    if (this.hash == "") {
      return html`<ui5-busy-indicator size="Medium" active style="margin:auto; width:50%; height:50%;"></ui5-busy-indicator>`;
    }
    const anyBeadInfoPair = this.perspective.beads[this.hash];
    if (!anyBeadInfoPair) {
      return html`<ui5-busy-indicator size="Medium" active style="margin:auto; width:50%; height:50%;"></ui5-busy-indicator>`;
    }
    const anyBead = anyBeadInfoPair[1] as AnyBead;
    if (anyBead.typeInfo != "hrl") {
      return html`<div style="color: red">Bead not an HRL</div>`;
    }

    //console.log("<chat-hrl>.render() anyBead", anyBead.value);
    const obj: [string, string] = JSON.parse(anyBead.value);
    const hrl: Hrl = [decodeHashFromBase64(obj[0]), decodeHashFromBase64(obj[1])];
    //console.log("<chat-hrl>.render()", stringifyHrl(hrl));
    if (!this._attLocAndInfo) {
      this.weServices.attachableInfo({hrl}).then((attLocAndInfo) => {
        //console.log("<chat-hrl>.render() attachableInfo", attLocAndInfo);
        this._attLocAndInfo = attLocAndInfo;
      });
      return html`<ui5-busy-indicator size="Medium" active style="margin:auto; width:50%; height:50%;"></ui5-busy-indicator>`;
    }
    if (!this._appletInfo) {
      this.weServices.appletInfo(this._attLocAndInfo.appletHash).then((appletInfo) => {
        //console.log("<chat-hrl>.render() appletInfo:", appletInfo);
        this._appletInfo = appletInfo;
      });
      return html`<ui5-busy-indicator size="Medium" active style="margin:auto; width:50%; height:50%;"></ui5-busy-indicator>`;
    }


    /** render all */
    return html`
        <ui5-list id="fileList">
          <ui5-li id="fileLi" icon="chain-link" description=${this._appletInfo.appletName}
                  @click=${(e) => this.weServices.openHrl({hrl})}>
            ${this._attLocAndInfo.attachableInfo.name}
          </ui5-li>
        </ui5-list>
    `;
  }


  /** */
  static get styles() {
    return [
      css`
        #fileList {
          min-width: 350px;
          border: 1px solid #282727;
          border-radius: 3px;
          margin: 10px 5px 10px 5px;
        }

        #fileLi {
          background: rgb(230, 237, 249);
        }
      `,];
  }
}
