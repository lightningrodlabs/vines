import {css, html, PropertyValues} from "lit";
import {customElement, property, state} from "lit/decorators.js";
import {ZomeElement} from "@ddd-qc/lit-happ";
import {encodeHashToBase64} from "@holochain/client";
import {ThreadsPerspective} from "../viewModels/threads.perspective";
import {consume} from "@lit/context";
import {weClientContext} from "../contexts";
import {WeaveUrl} from "@lightningrodlabs/we-applet";
import {ThreadsZvm} from "../viewModels/threads.zvm";
import {WeServicesEx} from "@ddd-qc/we-utils";
import {weaveUrlToWal} from "../utils";
import {sharedStyles} from "../styles";
import {ThreadsEntryType} from "../bindings/threads.types";
import {beadJumpEvent, threadJumpEvent} from "../jump";


/**
 * @element
 */
@customElement("wurl-link")
export class WurlLink extends ZomeElement<ThreadsPerspective, ThreadsZvm> {

  constructor() {
    super(ThreadsZvm.DEFAULT_ZOME_NAME);
    //this.loadWal();
  }


  /**
   * In zvmUpdated() this._zvm is not already set!
   * Subscribe to ThreadsZvm
   */
  protected async zvmUpdated(newZvm: ThreadsZvm, oldZvm?: ThreadsZvm): Promise<void> {
    console.log("<wurl-link>.zvmUpdated()");
    await this.loadWal(newZvm);
  }


  /** -- Properties -- */

  @property()
  wurl!: WeaveUrl;

  // @property()
  // onlyIcon = false;

  @consume({ context: weClientContext, subscribe: true })
  weServices!: WeServicesEx;

  //          private _assetLocAndInfo?: AssetLocationAndInfo;
  // @state() private _appletInfo?: AppletInfo;

           private _vinesTypes?: string;
           private _assetName?: string;
  @state() private _appletName?: string;

  /** Don't update during online loading */
  shouldUpdate(changedProperties: PropertyValues<this>) {
    console.log("<wurl-link>.shouldUpdate()", changedProperties, this.wurl);
    const upper = super.shouldUpdate(changedProperties);
    /** */
    if (changedProperties.has("wurl")) {
      /* await */ this.loadWal(this._zvm);
    }
    return upper;
  }


  /** */
  async loadWal(threadsZvm: ThreadsZvm) {
    console.log("<wurl-link>.loadWal()", this.wurl);
    if (!this.wurl) {
      return;
    }
    try {
      const wal = weaveUrlToWal(this.wurl);
      if (encodeHashToBase64(wal.hrl[0]) == this.cell.dnaHash) {
        this._appletName = "Vines";
        /** Determine entry */
        const hash = encodeHashToBase64(wal.hrl[1]);
        console.log("<wurl-link> loadWal() hash", hash);
        const maybeThread = threadsZvm.perspective.threads[hash];
        if (maybeThread) {
          this._assetName = maybeThread.name;
          this._vinesTypes = ThreadsEntryType.ParticipationProtocol;
          return;
        }
        const beadPair = threadsZvm.perspective.beads[hash];
        if (beadPair) {
          let thread = threadsZvm.perspective.threads[beadPair[0].bead.ppAh];
          if (!thread) {
            /*const ppMat =*/ await threadsZvm.fetchPp(beadPair[0].bead.ppAh);
            thread = threadsZvm.getThread(beadPair[0].bead.ppAh);
          }
          console.log("<wurl-link> loadWal() thread", thread.name);
          this._vinesTypes = ThreadsEntryType.AnyBead;
          this._assetName = `${thread.name} > 💬`;
          return;
        }
        try {
          await threadsZvm.fetchPp(hash);
          const thread = threadsZvm.getThread(hash);
          this._assetName = thread.name;
          this._vinesTypes = ThreadsEntryType.ParticipationProtocol;
        } catch(e) {}
        return;
      }
      const assetLocAndInfo = await this.weServices.assetInfo(wal);;
      this._assetName = "🔗 " + assetLocAndInfo.assetInfo.name;
      this._appletName = (await this.weServices.appletInfo(assetLocAndInfo.appletHash)).appletName;
    } catch(e) {
      console.warn("Failed to load HRL", this.wurl, e);
    }
  }


  /** */
  renderBadLink() {
    return html`<span style="color:#b50202">${this.wurl}</span>`;
  }


  /** */
  render() {
    console.log("<wurl-link>.render()", this.wurl, this._appletName);
    if (this.wurl == "") {
      //return html`<div>Failed to retrieve Asset. WeServices not available.</div>`;
      return html``;
    }
    let wal;
    try {
      wal = weaveUrlToWal(this.wurl)
    } catch(e) {
      return this.renderBadLink();
    }
    if (!this._assetName || !this._appletName) {
      return this.renderBadLink();
    }

    const isThisDna = encodeHashToBase64(wal.hrl[0]) == this.cell.dnaHash;
    let colorIdx = 6;
    if (!isThisDna && !this.weServices) {
      colorIdx = 3;
    }

    /** render valid link */
    return html`
        <!-- <sl-tooltip content="To ${this._appletName}"> -->
          <ui5-badge design="Set1" color-scheme=${colorIdx}  style="color:#0064D9"
                     @click=${(e) => {
                       if (this._vinesTypes == ThreadsEntryType.ParticipationProtocol) {
                         this.dispatchEvent(threadJumpEvent(encodeHashToBase64(wal.hrl[1])))
                         return;
                       }
                       if (this._vinesTypes == ThreadsEntryType.AnyBead) {
                           this.dispatchEvent(beadJumpEvent(encodeHashToBase64(wal.hrl[1])))
                           return;
                       }                       
                       if (this.weServices) {
                         this.weServices.openWal(wal);
                       }
    }}>
              <!-- <ui5-icon slot="icon" name="chain-link"></ui5-icon> -->
              ${this._assetName}
          </ui5-badge>
        <!-- </sl-tooltip> -->
    `;
  }


  /** */
  static get styles() {
    return [
      sharedStyles,
      css`
        :host {
          display:inline-flex;
        }

        ui5-badge:hover {
          cursor:pointer;
        }
      `,];
  }
}
