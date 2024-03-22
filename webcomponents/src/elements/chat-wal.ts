import {css, html, PropertyValues} from "lit";
import {customElement, property, state} from "lit/decorators.js";
import {ZomeElement} from "@ddd-qc/lit-happ";
import {ActionHashB64, decodeHashFromBase64} from "@holochain/client";
import {AnyBeadMat, ThreadsPerspective} from "../viewModels/threads.perspective";
import {consume} from "@lit/context";
import {weClientContext} from "../contexts";
import {AppletInfo, Hrl, weaveUrlFromWal} from "@lightningrodlabs/we-applet";
import {AssetLocationAndInfo} from "@lightningrodlabs/we-applet/dist/types";
import {ThreadsZvm} from "../viewModels/threads.zvm";
import {WeServicesEx} from "@ddd-qc/we-utils";
import {weaveUrlToWal} from "../utils";
import {sharedStyles} from "../styles";


/**
 * @element
 */
@customElement("chat-wal")
export class ChatWal extends ZomeElement<ThreadsPerspective, ThreadsZvm> {

  constructor() {
    super(ThreadsZvm.DEFAULT_ZOME_NAME);
    this.loadHrl();
  }


  /** -- Properties -- */

  /** Hash of File bead to display */
  @property() hash: ActionHashB64 = '' // BeadAh

  @consume({ context: weClientContext, subscribe: true })
  weServices!: WeServicesEx;

           private _assetLocAndInfo?: AssetLocationAndInfo;
  @state() private _appletInfo?: AppletInfo;


  /** Don't update during online loading */
  shouldUpdate(changedProperties: PropertyValues<this>) {
    console.log("<chat-file>.shouldUpdate()", changedProperties, this.hash);
    const upper = super.shouldUpdate(changedProperties);
    /** */
    if (changedProperties.has("hash")) {
      /* await */ this.loadHrl();
    }
    return upper;
  }


  /** */
  async loadHrl() {
    console.log("<chat-wal>.loadHrl()", this.hash);
    if (!this.hash) {
      return;
    }
    try {
      const anyBeadInfoPair = this.perspective.beads[this.hash];
      const anyBead = anyBeadInfoPair[1] as AnyBeadMat;
      const wal = weaveUrlToWal(anyBead.value);

      this._assetLocAndInfo = await this.weServices.assetInfo(wal);
      this._appletInfo = await this.weServices.appletInfo(this._assetLocAndInfo.appletHash);
    } catch(e) {
      console.warn("Failed to load HRL", this.hash, e);
    }
  }


  /** */
  render() {
    console.log("<chat-wal>.render()", this.hash, this._appletInfo);

    if (!this.weServices) {
      return html`        
          <ui5-list id="fileList">
          <ui5-li id="fileLi" class="fail" icon="warning" description=${this.hash}>
              Failed to retrieve Asset. WeServices not available.
          </ui5-li>
      </ui5-list>
      `;

    }
    if (this.hash == "") {
      return html`<ui5-busy-indicator delay="0" size="Medium" active style="margin:auto; width:50%; height:50%;"></ui5-busy-indicator>`;
    }
    if (!this._appletInfo || !this._assetLocAndInfo) {
      return html`        
          <ui5-list id="fileList">
          <ui5-li id="fileLi" class="fail" icon="synchronize" description=${this.hash}
                  @click=${(e) => this.loadHrl()}>
              Failed to retrieve Asset.
          </ui5-li>
      </ui5-list>
      `;
    }

    const anyBeadInfoPair = this.perspective.beads[this.hash];
    if (!anyBeadInfoPair) {
      return html`
        <ui5-list id="fileList">
            <ui5-li id="fileLi" class="fail" icon="synchronize" description=${this.hash}
                    @click=${async (e) => {
                        await this._zvm.probeAllInner();
                        const anyBeadInfoPair = this.perspective.beads[this.hash];
                        if (anyBeadInfoPair) {
                          this.requestUpdate();
                        }
                      }}>
                Asset not found
            </ui5-li>
        </ui5-list>
      `;
    }
    const anyBead = anyBeadInfoPair[1] as AnyBeadMat;
    if (anyBead.typeInfo != "wal") {
      return html`          
          <ui5-list id="fileList">
          <ui5-li id="fileLi" class="fail" icon="warning" description=${this.hash}>
              Error: Message not of type WAL
          </ui5-li>
      </ui5-list>
      `;
    }

    /** render all */
    return html`
        <ui5-list id="fileList">
          <ui5-li id="fileLi" icon="chain-link" description=${this._appletInfo.appletName}
                  @click=${(e) => this.weServices.openWal(weaveUrlToWal(anyBead.value))}>
            ${this._assetLocAndInfo.assetInfo.name}
          </ui5-li>
        </ui5-list>
    `;
  }


  /** */
  static get styles() {
    return [
      sharedStyles,
      css`
        :host {
          max-width: 600px;
        }
        #fileList {
          min-width: 350px;
          border-radius: 10px;
          margin: 10px 5px 10px 5px;
          box-shadow: rgba(0, 0, 0, 0.25) 0px 14px 28px, rgba(0, 0, 0, 0.22) 0px 10px 10px;
        }

        #fileLi {
          border-radius: 10px;
        }
        
      `,];
  }
}
