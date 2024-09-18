import {css, html, PropertyValues} from "lit";
import {customElement, property, state} from "lit/decorators.js";
import {ActionId, EntryId, ZomeElement} from "@ddd-qc/lit-happ";
import {ThreadsPerspective} from "../viewModels/threads.perspective";
import {consume} from "@lit/context";
import {filesContext, weClientContext} from "../contexts";
import {WAL, WeaveUrl} from "@lightningrodlabs/we-applet";
import {ThreadsZvm} from "../viewModels/threads.zvm";
import {WeServicesEx} from "@ddd-qc/we-utils";
import {ppName, weaveUrlToWal, hrl2Id} from "../utils";
import {sharedStyles} from "../styles";
import {ThreadsEntryType} from "../bindings/threads.types";
import {beadJumpEvent, threadJumpEvent, viewFileEvent} from "../events";
import {localized, msg} from "@lit/localize";
import {toasty} from "../toast";
import {FilesDvm} from "@ddd-qc/files";

import "@ddd-qc/files/dist/elements/file-button.js";

/**
 *
 */
@localized()
@customElement("wurl-link")
export class WurlLink extends ZomeElement<ThreadsPerspective, ThreadsZvm> {

  constructor() {
    super(ThreadsZvm.DEFAULT_ZOME_NAME);
  }


  /** -- Properties -- */

  @property()
  wurl!: WeaveUrl;

  @consume({ context: filesContext, subscribe: true })
  _filesDvm!: FilesDvm;

  // @property()
  // onlyIcon = false;

  @consume({ context: weClientContext, subscribe: true })
  weServices!: WeServicesEx;

           private _vinesTypes: string = ""
           private _assetName: string = ""
  @state() private _toolName: string = ""


  /** -- Methods -- */

  /** In zvmUpdated() this._zvm is not already set! */
  protected override async zvmUpdated(newZvm: ThreadsZvm, _oldZvm?: ThreadsZvm): Promise<void> {
    console.log("<wurl-link>.zvmUpdated()", !!newZvm);
    await this.loadWal(newZvm);
  }

  /** Don't update during online loading */
  override shouldUpdate(changedProperties: PropertyValues<this>) {
    //console.log("<wurl-link>.shouldUpdate()", changedProperties, this.wurl);
    const upper = super.shouldUpdate(changedProperties);
    /** */
    if (changedProperties.has("wurl") && this._zvm) {
      this._vinesTypes = "";
      this._toolName = "";
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
        const maybe = await threadsZvm.fetchPp(beadInfo.bead.ppAh);
        if (!maybe) {
          return false;
        }
        const [ppMat, _ts, _author] = maybe;
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
      /** Vines */
      if (this.cell.address.dnaId.equals(dnaId)) {
        this._toolName = "Vines";
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
      /** Files */
      if (this._filesDvm.cell.address.dnaId.equals(dnaId)) {
        this._toolName = "Files";
        const hash = new EntryId(dhtId.b64);
        console.log("<wurl-link>.loadWal() Files hash", hash);
        const tuple = this._filesDvm.deliveryZvm.perspective.localPublicManifests.get(hash);
        if (tuple) {
          this._assetName = tuple[0].description.name;
        } else {
          const pprm = this._filesDvm.deliveryZvm.perspective.publicParcels.get(hash);
          //author = pprm.author;
          if (pprm) {
            this._assetName = pprm.description.name;
          } else {
            this._assetName = "Unknown File";
          }
        }

        return;
      }
      /** Some other Tool */
      const assetLocAndInfo = await this.weServices.assetInfo(wal);
      if (assetLocAndInfo) {
        const appletInfo = await this.weServices.appletInfo(assetLocAndInfo.appletHash);
        if (appletInfo) {
          this._assetName = assetLocAndInfo.assetInfo.name;
          this._toolName = appletInfo.appletName;
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
    console.log("<wurl-link>.render()", this.wurl, this._toolName);
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
    if (!this._assetName || !this._toolName) {
      return this.renderBadLink();
    }

    const [_dnaId, dhtId] = hrl2Id(wal.hrl);

    if (this._toolName == "Files") {
      const manifestEh = new EntryId(dhtId.b64);
      //return html`<file-button .hash=${new EntryId(dhtId.b64)}></file-button>`;
      return html`<ui5-badge  style="color:#5e5e6b; background: white; border: 1px solid #cbcbcb"
                              @click=${(e:any) => {e.stopPropagation(); e.preventDefault(); this.dispatchEvent(viewFileEvent(/*this._filesDvm.cell.address.dnaId,*/ manifestEh))}}>
          ${this._assetName}
          <ui5-icon slot="icon" name="attachment"></ui5-icon>
      </ui5-badge>`;
    }

    // let colorIdx = 6;
    // if (!this.cell.address.dnaId.equals(dnaId) && !this.weServices) {
    //   colorIdx = 3;
    // }

    const hash = new ActionId(dhtId.b64)

    /** render valid link */
    return html`
        <!-- <sl-tooltip content="To ${this._toolName}"> -->
          <ui5-badge style="color:#2f4dc4d4; background: white; border: 1px solid #225699a3"
                     @click=${(e:any) => {
                       e.stopPropagation(); e.preventDefault();
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
              ${this._assetName}
              <ui5-icon slot="icon" name="chain-link"></ui5-icon>              
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
      `,];
  }
}
