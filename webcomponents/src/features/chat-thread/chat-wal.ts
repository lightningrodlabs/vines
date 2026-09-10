import {css, html, PropertyValues} from "lit";
import {customElement, property, state} from "lit/decorators.js";
import {ActionId, ZomeElement} from "@ddd-qc/lit-happ";
import {ThreadsPerspective} from "../../viewModels/threads.perspective";
import {consume} from "@lit/context";
import {weClientContext} from "../../contexts";
import {AppletInfo} from "@theweave/api";
import {AssetLocationAndInfo} from "@theweave/api/dist/types";
import {ThreadsZvm} from "../../viewModels/threads.zvm";
import {WeServicesEx} from "@ddd-qc/we-utils";
import {weaveUrlToWal} from "../../utils";
import {sharedStyles} from "../../styles";

import "@theweave/elements/dist/elements/wal-embed.js";
import {AnyBeadMat} from "../../viewModels/threads.materialize";
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

  @consume({context: weClientContext, subscribe: true})
  weServices!: WeServicesEx;

  @state() private _appletInfo: AppletInfo | undefined = undefined;
  private _assetLocAndInfo: AssetLocationAndInfo | undefined = undefined;

  /** Height of the embed box, in px. Dragged with the handle below it. */
  @state() private _embedHeight: number = 400;
  private _dragStart: {y: number, height: number} | undefined = undefined;

  static readonly MIN_EMBED_HEIGHT = 50;


  /** -- Methods -- */

  /** Don't update during online loading */
  override shouldUpdate(changedProperties: PropertyValues<this>) {
    //console.log("<chat-wal>.shouldUpdate()", changedProperties, this.hash);
    const upper = super.shouldUpdate(changedProperties);
    /** */
    if (changedProperties.has("hash")) {
      if (!changedProperties.get("hash")) {
        return false;
      }
      /* await */
      this.loadHrl(changedProperties.get("hash")!, this._zvm);
    }
    return upper;
  }


  /** In zvmUpdated() this._zvm is not already set! */
  protected override async zvmUpdated(newZvm: ThreadsZvm, _oldZvm?: ThreadsZvm): Promise<void> {
    await this.loadHrl(this.hash, newZvm);
  }


  /** CSS `resize` cannot be used here: the drag passes over a cross-origin
   *  iframe, which swallows the pointer events, so the gesture jumps and the
   *  pointerup that should end it never arrives. Capturing the pointer on the
   *  handle keeps every event coming to us until the button is released. */
  private onResizeStart(e: PointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    this._dragStart = {y: e.clientY, height: this._embedHeight};
  }

  /** */
  private onResizeMove(e: PointerEvent) {
    if (!this._dragStart) {
      return;
    }
    e.preventDefault();
    this._embedHeight = Math.max(ChatWal.MIN_EMBED_HEIGHT, this._dragStart.height + (e.clientY - this._dragStart.y));
  }

  /** */
  private onResizeEnd(e: PointerEvent) {
    if (!this._dragStart) {
      return;
    }
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    this._dragStart = undefined;
  }


  /** */
  async loadHrl(hash: ActionId, zvm: ThreadsZvm) {
    //console.log("<chat-wal>.loadHrl()", hash);
    if (!hash) {
      return;
    }
    try {
      const anyBead = zvm.perspective.getBaseBead(hash) as AnyBeadMat;
      const wal = weaveUrlToWal(anyBead.value);
      this._assetLocAndInfo = await this.weServices.assets.assetInfo(wal);
      this._appletInfo = await this.weServices.appletInfo(this._assetLocAndInfo!.appletHash);
    } catch (e: any) {
      console.warn("Failed to load HRL", hash, e);
      this._assetLocAndInfo = undefined;
      this._appletInfo = undefined;
    }
  }


  /** */
  override render() {
    //console.log("<chat-wal>.render()", this.hash, this._appletInfo);
    /** No WeServices */
    if (!this.weServices) {
      return html`        
          <ui5-list id="fileList" class="listfail">
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
          <ui5-list id="fileList" class="listfail">
          <ui5-li id="fileLi" class="fail" icon="synchronize" description=${this.hash.b64}
                  @click=${(_e: any) => this.loadHrl(this.hash, this._zvm)}>
              ${msg("Failed to retrieve Asset")}
          </ui5-li>
      </ui5-list>
      `;
    }
    /** No Bead at hash */
    const anyBead = this._zvm.perspective.getBaseBead(this.hash) as AnyBeadMat;
    if (!anyBead) {
      return html`
        <ui5-list id="fileList" class="listfail">
            <ui5-li id="fileLi" class="fail" icon="synchronize" description=${this.hash.b64}
                    @click=${(_e: any) => {
                      this._zvm.probeAllInner();
                      const anyBead = this._zvm.perspective.getBaseBead(this.hash);
                      if (anyBead) {
                        this.requestUpdate();
                      }
                    }}>
              ${msg("Asset not found")}
            </ui5-li>
        </ui5-list>
      `;
    }
    /** Wrong bead type */
    if (anyBead.typeInfo != "wal") {
      return html`          
          <ui5-list id="fileList" class="listfail">
          <ui5-li id="fileLi" class="fail" icon="warning" description=${this.hash.b64}>
              ${msg("Error: Message not an Asset type")}
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
                      @click=${(_e: any) => this.weServices.openAsset(weaveUrlToWal(anyBead.value))}>
                  ${this._assetLocAndInfo.assetInfo.name}
              </ui5-li>
          </ui5-list>
      `;
    }

    /** render all */
    return html`
        <div id="walEmbedWrapper">
            <div id="walEmbedBox" style="height: ${this._embedHeight}px">
                <!-- 2px shorter than the box: wal-embed's own .container is
                     height:100% with a 2px bottom border on top of that, so at a
                     flat 100% the border falls outside the box and is clipped. -->
                <wal-embed .src=${anyBead.value} style="width: 100%; height: calc(100% - 2px)"
                           @click=${(e: any) => {e.stopPropagation()}}></wal-embed>
            </div>
            <div id="resizeHandle" title=${msg("Drag to resize")}
                 @pointerdown=${(e: PointerEvent) => this.onResizeStart(e)}
                 @pointermove=${(e: PointerEvent) => this.onResizeMove(e)}
                 @pointerup=${(e: PointerEvent) => this.onResizeEnd(e)}
                 @pointercancel=${(e: PointerEvent) => this.onResizeEnd(e)}
                 @click=${(e: any) => e.stopPropagation()}></div>
        </div>
    `;
  }


  /** */
  static override get styles() {
    return [
      sharedStyles,
      css`
        :host {
          /*max-width: 600px;*/
        }
        #fileList {
          min-width: 350px;
          border-radius: 10px;
          margin: 10px 5px 10px 5px;
          /*box-shadow: rgba(0, 0, 0, 0.25) 0px 14px 28px, rgba(0, 0, 0, 0.22) 0px 10px 10px;*/
        }

        /* wal-embed fills its host box (:host and .container are both height:100%)
           and cannot measure the cross-origin iframe inside it, so the box has to
           state a height. min-height alone left the embed at its content height
           with the rest of the 300px showing as empty space underneath.
           The top margin keeps the embed's own toolbar clear of the message
           toolbar, which hovers just above the message. */
        #walEmbedWrapper {
          margin: 22px 5px 10px 5px;
        }

        /* The radius matches wal-embed's own .container (3px). At 10px the box
           clipped the corners off the container's border instead of following
           it, which read as a cropped frame. */
        #walEmbedBox {
          min-width: 350px;
          max-width: 100%;
          overflow: hidden;
          border-radius: 3px;
        }

        /* A real element rather than CSS resize, so the drag survives crossing
           the iframe. Full width so it is easy to grab. */
        #resizeHandle {
          height: 10px;
          margin-top: 2px;
          border-radius: 0 0 3px 3px;
          background: repeating-linear-gradient(90deg, #b6c2dd 0 6px, transparent 6px 12px);
          background-position: center;
          background-size: auto 2px;
          background-repeat: repeat-x;
          cursor: ns-resize;
          touch-action: none;
        }

        #resizeHandle:hover {
          background-image: repeating-linear-gradient(90deg, #8595bf 0 6px, transparent 6px 12px);
        }

        #fileLi {
          border-radius: 10px;
        }
        .listfail {
          max-width: 600px;
        }
      `,];
  }
}
