import {css, html, PropertyValues} from "lit";
import {customElement, property, state} from "lit/decorators.js";
import {ActionId, DnaId, intoDhtId, ZomeElement} from "@ddd-qc/lit-happ";
import {ThreadsPerspective} from "../viewModels/threads.perspective";
import {consume} from "@lit/context";
import {weClientContext} from "../contexts";
import {WeaveUrl} from "@lightningrodlabs/we-applet";
import {ThreadsZvm} from "../viewModels/threads.zvm";
import {WeServicesEx} from "@ddd-qc/we-utils";
import {ppName, weaveUrlToWal} from "../utils";
import {sharedStyles} from "../styles";
import {ThreadsEntryType} from "../bindings/threads.types";
import {beadJumpEvent, threadJumpEvent} from "../jump";
import {localized} from "@lit/localize";


/**
 *
 */
@localized()
@customElement("wurl-link")
export class WurlLink extends ZomeElement<ThreadsPerspective, ThreadsZvm> {

  constructor() {
    super(ThreadsZvm.DEFAULT_ZOME_NAME);
  }


  /**
   * In zvmUpdated() this._zvm is not already set!
   * Subscribe to ThreadsZvm
   */
  protected async zvmUpdated(newZvm: ThreadsZvm, oldZvm?: ThreadsZvm): Promise<void> {
    //console.log("<wurl-link>.zvmUpdated()");
    await this.loadWal(newZvm);
  }


  /** -- Properties -- */

  @property()
  wurl!: WeaveUrl;

  // @property()
  // onlyIcon = false;

  @consume({ context: weClientContext, subscribe: true })
  weServices!: WeServicesEx;

           private _vinesTypes?: string;
           private _assetName?: string;
  @state() private _appletName?: string;


  /** Don't update during online loading */
  shouldUpdate(changedProperties: PropertyValues<this>) {
    //console.log("<wurl-link>.shouldUpdate()", changedProperties, this.wurl);
    const upper = super.shouldUpdate(changedProperties);
    /** */
    if (changedProperties.has("wurl")) {
      delete this._vinesTypes;
      delete this._appletName;
      delete this._assetName;
      /* await */ this.loadWal(this._zvm);
    }
    return upper;
  }


  /** */
  async loadBeadInfo(beadAh: ActionId, threadsZvm: ThreadsZvm): Promise<boolean> {
    const beadInfo = threadsZvm.getBaseBeadInfo(beadAh);
    if (beadInfo) {
      let thread = threadsZvm.perspective.threads.get(beadInfo.bead.ppAh);
      let name;
      if (!thread) {
        const [ppMat, _ts, _author] = await threadsZvm.fetchPp(beadInfo.bead.ppAh);
        name = ppName(ppMat);
      } else {
        name = thread.name;
      }
      //console.log("<wurl-link> loadWal() thread", thread.name);
      this._vinesTypes = ThreadsEntryType.AnyBead;
      this._assetName = `${name} > 💬`;
      return true;
    }
    return false;
  }


  /** */
  async loadWal(threadsZvm: ThreadsZvm) {
    console.log("<wurl-link>.loadWal()", this.wurl, threadsZvm);
    if (!this.wurl) {
      return;
    }
    try {
      const wal = weaveUrlToWal(this.wurl);
      if (new DnaId(wal.hrl[0]).b64 == this.cell.dnaId.b64) {
        this._appletName = "Vines";
        /** Determine entry */
        const hash = new ActionId(wal.hrl[1]);
        //console.log("<wurl-link> loadWal() hash", hash);
        const maybeThread = threadsZvm.perspective.threads.get(hash);
        if (maybeThread) {
          this._assetName = maybeThread.name;
          this._vinesTypes = ThreadsEntryType.ParticipationProtocol;
          return;
        }
        const succeeded = await this.loadBeadInfo(hash, threadsZvm);
        if (succeeded) {
          return;
        }
        /** Try PP */
        try {
          await threadsZvm.fetchPp(hash);
          const thread = threadsZvm.perspective.threads.get(hash);
          this._assetName = thread.name;
          this._vinesTypes = ThreadsEntryType.ParticipationProtocol;
        } catch(e) {}
        /** Try Bead */
        try {
          await threadsZvm.fetchUnknownBead(hash);
        } catch(e) {
          //console.warn(`No bead found for wurl-link: ${e}`);
        }
        return;
      }
      const assetLocAndInfo = await this.weServices.assetInfo(wal);
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

    const isThisDna = new DnaId(wal.hrl[0]).b64 == this.cell.dnaId.b64;
    let colorIdx = 6;
    if (!isThisDna && !this.weServices) {
      colorIdx = 3;
    }
    const hash = new ActionId(wal.hrl[1])

    /** render valid link */
    return html`
        <!-- <sl-tooltip content="To ${this._appletName}"> -->
          <ui5-badge design="Set1" color-scheme=${colorIdx}  style="color:#0064D9"
                     @click=${(e) => {
                       e.stopPropagation();
                       if (this._vinesTypes == ThreadsEntryType.ParticipationProtocol) {
                         this.dispatchEvent(threadJumpEvent(hash))
                         return;
                       }
                       if (this._vinesTypes == ThreadsEntryType.AnyBead) {
                           this.dispatchEvent(beadJumpEvent(hash))
                           return;
                       }                       
                       if (this.weServices) {
                         this.weServices.openWal(wal);
                       }
    }}>
              <!-- Icon could also be taken from the asset's icon_src field -->
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
