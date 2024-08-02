import {css, html, PropertyValues} from "lit";
import {customElement, property, state} from "lit/decorators.js";
import {ActionId, ZomeElement} from "@ddd-qc/lit-happ";
import {ThreadsPerspective} from "../viewModels/threads.perspective";
import {consume} from "@lit/context";
import {weClientContext} from "../contexts";
import {AppletInfo} from "@lightningrodlabs/we-applet";
import {AssetLocationAndInfo} from "@lightningrodlabs/we-applet/dist/types";
import {ThreadsZvm} from "../viewModels/threads.zvm";
import {WeServicesEx} from "@ddd-qc/we-utils";
import {weaveUrlToWal} from "../utils";
import {sharedStyles} from "../styles";

import "@lightningrodlabs/we-elements/dist/elements/wal-embed.js";
import {AnyBeadMat} from "../viewModels/threads.materialize";

/**
 * @element
 */
@customElement("chat-wal")
export class ChatWal extends ZomeElement<ThreadsPerspective, ThreadsZvm> {
  /** */
  constructor() {
    super(ThreadsZvm.DEFAULT_ZOME_NAME);
    //this.loadHrl();
  }


  /** -- Properties -- */

  /** Hash of bead to display */
  @property() hash?: ActionId;

  @consume({ context: weClientContext, subscribe: true })
  weServices!: WeServicesEx;

           private _assetLocAndInfo?: AssetLocationAndInfo;
  @state() private _appletInfo?: AppletInfo;


  /** -- Methods -- */

  /** Don't update during online loading */
  shouldUpdate(changedProperties: PropertyValues<this>) {
    console.log("<chat-wal>.shouldUpdate()", changedProperties, this.hash);
    const upper = super.shouldUpdate(changedProperties);
    /** */
    if (changedProperties.has("hash")) {
      if (!changedProperties["hash"]) {
        return false;
      }
      /* await */ this.loadHrl(changedProperties["hash"], this._zvm);
    }
    return upper;
  }


  /**
   * In zvmUpdated() this._zvm is not already set!
   * Subscribe to ThreadsZvm
   */
  protected async zvmUpdated(newZvm: ThreadsZvm, oldZvm?: ThreadsZvm): Promise<void> {
    //console.log("<wurl-link>.zvmUpdated()");
    await this.loadHrl(this.hash, newZvm);
  }


  /** */
  async loadHrl(hash: ActionId, zvm: ThreadsZvm) {
    console.log("<chat-wal>.loadHrl()", hash);
    if (!hash) {
      return;
    }
    try {
      const anyBead = zvm.perspective.getBaseBead(hash) as AnyBeadMat;
      const wal = weaveUrlToWal(anyBead.value);
      this._assetLocAndInfo = await this.weServices.assetInfo(wal);
      this._appletInfo = await this.weServices.appletInfo(this._assetLocAndInfo.appletHash);
    } catch(e) {
      console.warn("Failed to load HRL", hash, e);
      this._assetLocAndInfo = undefined;
      this._appletInfo = undefined;
    }
  }


  /** */
  render() {
    console.log("<chat-wal>.render()", this.hash, this._appletInfo);

    if (!this.weServices) {
      return html`        
          <ui5-list id="fileList">
          <ui5-li id="fileLi" class="fail" icon="warning" description=${this.hash.b64}>
              Failed to retrieve Asset. WeServices not available.
          </ui5-li>
      </ui5-list>
      `;

    }
    if (!this.hash) {
      return html`<ui5-busy-indicator delay="0" size="Medium" active style="margin:auto; width:50%; height:50%;"></ui5-busy-indicator>`;
    }
    if (!this._appletInfo || !this._assetLocAndInfo) {
      return html`        
          <ui5-list id="fileList">
          <ui5-li id="fileLi" class="fail" icon="synchronize" description=${this.hash.b64}
                  @click=${(e) => this.loadHrl(this.hash, this._zvm)}>
              Failed to retrieve Asset.
          </ui5-li>
      </ui5-list>
      `;
    }

    const anyBead = this._zvm.perspective.getBaseBead(this.hash) as AnyBeadMat;
    if (!anyBead) {
      return html`
        <ui5-list id="fileList">
            <ui5-li id="fileLi" class="fail" icon="synchronize" description=${this.hash.b64}
                    @click=${async (e) => {
                        await this._zvm.probeAllInner();
                        const anyBead = this._zvm.perspective.getBaseBead(this.hash);
                        if (anyBead) {
                          this.requestUpdate();
                        }
                      }}>
                Asset not found
            </ui5-li>
        </ui5-list>
      `;
    }
    if (anyBead.typeInfo != "wal") {
      return html`          
          <ui5-list id="fileList">
          <ui5-li id="fileLi" class="fail" icon="warning" description=${this.hash.b64}>
              Error: Message not of type WAL
          </ui5-li>
      </ui5-list>
      `;
    }

    // /** render all */
    // return html`
    //     <ui5-list id="fileList">
    //       <ui5-li id="fileLi" icon="chain-link" description=${this._appletInfo.appletName}
    //               @click=${(e) => this.weServices.openWal(weaveUrlToWal(anyBead.value))}>
    //         ${this._assetLocAndInfo.assetInfo.name}
    //       </ui5-li>
    //     </ui5-list>
    // `;

    /** render all */
    return html`
        <div id="fileList" style="min-height: 300px;">
            <wal-embed .src=${anyBead.value} style="width: 100%; height: 100%"
                       @click=${(e:any)=> {e.stopPropagation()}}></wal-embed>
        </div>
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
