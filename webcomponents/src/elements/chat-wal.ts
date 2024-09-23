import {css, html, PropertyValues} from "lit";
import {customElement, property, state} from "lit/decorators.js";
import {ActionId, ZomeElement} from "@ddd-qc/lit-happ";
import {ThreadsPerspective} from "../viewModels/threads.perspective";
import {consume} from "@lit/context";
import {weClientContext} from "../contexts";
import {AppletInfo} from "@theweave/api";
import {AssetLocationAndInfo} from "@theweave/api/dist/types";
import {ThreadsZvm} from "../viewModels/threads.zvm";
import {WeServicesEx} from "@ddd-qc/we-utils";
import {weaveUrlToWal} from "../utils";
import {sharedStyles} from "../styles";

import "@theweave/elements/dist/elements/wal-embed.js";
import {AnyBeadMat} from "../viewModels/threads.materialize";
import {msg} from "@lit/localize";

/**
 * @element
 */
@customElement("chat-wal")
export class ChatWal extends ZomeElement<ThreadsPerspective, ThreadsZvm> {

  constructor() {
    super(ThreadsZvm.DEFAULT_ZOME_NAME);
  }

  /** -- Properties -- */

  /** Hash of bead to display */
  @property() hash!: ActionId;

  @consume({ context: weClientContext, subscribe: true })
  weServices!: WeServicesEx;

  @state() private _appletInfo: AppletInfo | undefined = undefined;
           private _assetLocAndInfo: AssetLocationAndInfo | undefined = undefined;


  /** -- Methods -- */

  /** Don't update during online loading */
  override shouldUpdate(changedProperties: PropertyValues<this>) {
    console.log("<chat-wal>.shouldUpdate()", changedProperties, this.hash);
    const upper = super.shouldUpdate(changedProperties);
    /** */
    if (changedProperties.has("hash")) {
      if (!changedProperties.get("hash")) {
        return false;
      }
      /* await */ this.loadHrl(changedProperties.get("hash")!, this._zvm);
    }
    return upper;
  }


  /** In zvmUpdated() this._zvm is not already set! */
  protected override async zvmUpdated(newZvm: ThreadsZvm, _oldZvm?: ThreadsZvm): Promise<void> {
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
      this._appletInfo = await this.weServices.appletInfo(this._assetLocAndInfo!.appletHash);
    } catch(e:any) {
      console.warn("Failed to load HRL", hash, e);
      this._assetLocAndInfo = undefined;
      this._appletInfo = undefined;
    }
  }


  /** */
  override render() {
    console.log("<chat-wal>.render()", this.hash, this._appletInfo);
    /** No WeServices */
    if (!this.weServices) {
      return html`        
          <ui5-list id="fileList">
          <ui5-li id="fileLi" class="fail" icon="warning" description=${this.hash.b64}>
              ${msg("Failed to retrieve Asset. WeaveServices not available.")}
          </ui5-li>
      </ui5-list>
      `;
    }
    /** No Hash */
    if (!this.hash) {
      return html`<ui5-busy-indicator delay="0" size="Medium" active style="margin:auto; width:50%; height:50%;"></ui5-busy-indicator>`;
    }
    /** No asset info */
    if (!this._appletInfo || !this._assetLocAndInfo) {
      return html`        
          <ui5-list id="fileList">
          <ui5-li id="fileLi" class="fail" icon="synchronize" description=${this.hash.b64}
                  @click=${(_e:any) => this.loadHrl(this.hash, this._zvm)}>
              Failed to retrieve Asset.
          </ui5-li>
      </ui5-list>
      `;
    }
    /** No Bead at hash */
    const anyBead = this._zvm.perspective.getBaseBead(this.hash) as AnyBeadMat;
    if (!anyBead) {
      return html`
        <ui5-list id="fileList">
            <ui5-li id="fileLi" class="fail" icon="synchronize" description=${this.hash.b64}
                    @click=${async (_e:any) => {
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
    /** Wrong bead type */
    if (anyBead.typeInfo != "wal") {
      return html`          
          <ui5-list id="fileList">
          <ui5-li id="fileLi" class="fail" icon="warning" description=${this.hash.b64}>
              Error: Message not of type WAL
          </ui5-li>
      </ui5-list>
      `;
    }

    /** Not embed */
    const canEmbed = true;
    if (!canEmbed) {
      return html`
          <ui5-list id="fileList">
              <ui5-li id="fileLi" icon="chain-link" description=${this._appletInfo.appletName}
                      @click=${(_e:any) => this.weServices.openWal(weaveUrlToWal(anyBead.value))}>
                  ${this._assetLocAndInfo.assetInfo.name}
              </ui5-li>
          </ui5-list>
      `;
    }

    /** render all */
    return html`
        <div id="fileList" style="min-height: 300px;">
            <wal-embed .src=${anyBead.value} style="width: 100%; height: 100%"
                       @click=${(e:any)=> {e.stopPropagation()}}></wal-embed>
        </div>
    `;
  }


  /** */
  static override get styles() {
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
