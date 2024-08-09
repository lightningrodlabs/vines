import {css, html, PropertyValues} from "lit";
import {customElement, property, state} from "lit/decorators.js";
import {ActionId, ZomeElement} from "@ddd-qc/lit-happ";
import {ThreadsPerspective} from "../viewModels/threads.perspective";
import {consume} from "@lit/context";
import {weClientContext} from "../contexts";
import {WAL, WeaveUrl} from "@lightningrodlabs/we-applet";
import {ThreadsZvm} from "../viewModels/threads.zvm";
import {WeServicesEx} from "@ddd-qc/we-utils";
import {ppName, weaveUrlToWal, hrl2Id} from "../utils";
import {sharedStyles} from "../styles";
import {ThreadsEntryType} from "../bindings/threads.types";
import {beadJumpEvent, threadJumpEvent} from "../events";
import {localized, msg} from "@lit/localize";
import {toasty} from "../toast";


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
  protected override async zvmUpdated(newZvm: ThreadsZvm, _oldZvm?: ThreadsZvm): Promise<void> {
    console.log("<wurl-link>.zvmUpdated()", !!newZvm);
    await this.loadWal(newZvm);
  }


  /** -- Properties -- */

  @property()
  wurl!: WeaveUrl;

  // @property()
  // onlyIcon = false;

  @consume({ context: weClientContext, subscribe: true })
  weServices!: WeServicesEx;

           private _vinesTypes: string = ""
           private _assetName: string = ""
  @state() private _appletName: string = ""


  /** Don't update during online loading */
  override shouldUpdate(changedProperties: PropertyValues<this>) {
    //console.log("<wurl-link>.shouldUpdate()", changedProperties, this.wurl);
    const upper = super.shouldUpdate(changedProperties);
    /** */
    if (changedProperties.has("wurl") && this._zvm) {
      this._vinesTypes = "";
      this._appletName = "";
      this._assetName = "";
      /* await */ this.loadWal(this._zvm);
    }
    return upper;
  }


  /** */
  async loadBeadInfo(beadAh: ActionId, threadsZvm: ThreadsZvm): Promise<boolean> {
    const beadInfo = threadsZvm.perspective.getBaseBeadInfo(beadAh);
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
      const [dnaId, dhtId] = hrl2Id(wal.hrl);
      if (this.cell.address.dnaId.equals(dnaId)) {
        this._appletName = "Vines";
        /** Determine entry */
        const hash = new ActionId(dhtId.b64);
        console.log("<wurl-link>.loadWal() hash", hash, threadsZvm);
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
          const thread = threadsZvm.perspective.threads.get(hash)!;
          this._assetName = thread.name;
          this._vinesTypes = ThreadsEntryType.ParticipationProtocol;
        } catch(e:any) {}
        /** Try Bead */
        try {
          await threadsZvm.fetchUnknownBead(hash);
        } catch(e:any) {
          //console.warn(`No bead found for wurl-link: ${e}`);
        }
        return;
      }
      const assetLocAndInfo = await this.weServices.assetInfo(wal);
      if (assetLocAndInfo) {
        const appletInfo = await this.weServices.appletInfo(assetLocAndInfo.appletHash);
        if (appletInfo) {
          this._assetName = "🔗 " + assetLocAndInfo.assetInfo.name;
          this._appletName = appletInfo.appletName;
        }
      }
    } catch(e:any) {
      console.warn("Failed to load HRL", this.wurl, e);
    }
  }


  /** */
  renderBadLink() {
    return html`
      <abbr .title=${this.wurl}>
          <ui5-badge design="Set1" color-scheme="2" style="color:#b50202"
          @click=${(_e:any) => {
              navigator.clipboard.writeText(this.wurl);
              if (this.weServices) {
                  this.weServices.walToPocket(weaveUrlToWal(this.wurl));
              }
              toasty(msg("Copied WAL to clipboard"));
          }}>
            ${msg('Unknown HRL')}
          </ui5-badge>
      </abbr>`;
  }


  /** */
  override render() {
    console.log("<wurl-link>.override render()", this.wurl, this._appletName);
    if (this.wurl == "") {
      //return html`<div>Failed to retrieve Asset. WeServices not available.</div>`;
      return html``;
    }
    let wal: WAL;
    try {
      wal = weaveUrlToWal(this.wurl)
    } catch(e:any) {
      return this.renderBadLink();
    }
    if (!this._assetName || !this._appletName) {
      return this.renderBadLink();
    }
    const [dnaId, dhtId] = hrl2Id(wal.hrl);
    let colorIdx = 6;
    if (!this.cell.address.dnaId.equals(dnaId) && !this.weServices) {
      colorIdx = 3;
    }
    const hash = new ActionId(dhtId.b64)

    /** render valid link */
    return html`
        <!-- <sl-tooltip content="To ${this._appletName}"> -->
          <ui5-badge design="Set1" color-scheme=${colorIdx}  style="color:#0064D9"
                     @click=${(e:any) => {
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
  static override get styles() {
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
