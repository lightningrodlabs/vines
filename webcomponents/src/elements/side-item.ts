import {css, html, TemplateResult} from "lit";
import {customElement, property, state} from "lit/decorators.js";
import {msg} from "@lit/localize";
import {consume} from "@lit/context";
import {unsafeHTML} from 'lit/directives/unsafe-html.js';

import {ActionHashB64, AgentPubKeyB64, decodeHashFromBase64} from "@holochain/client";
import {DnaElement} from "@ddd-qc/lit-happ";
import {FilesDvm, prettyFileSize} from "@ddd-qc/files";
import {WeServicesEx} from "@ddd-qc/we-utils";

import {AnyBeadMat, EntryBeadMat, TextBeadMat, ThreadsPerspective,} from "../viewModels/threads.perspective";
import {ThreadsDvm} from "../viewModels/threads.dvm";
import {AnyBead, ThreadsEntryType} from "../bindings/threads.types";
import {md} from "../markdown/md";
import {weaveUrlToWal} from "../utils";
import {toasty} from "../toast";
import {beadJumpEvent} from "../jump";
import {renderAvatar} from "../render";
import {globaFilesContext, weClientContext} from "../contexts";
import {codeStyles} from "../markdown/code-css";
import {sharedStyles} from "../styles";


/**
 * @element
 */
@customElement("side-item")
export class SideItem extends DnaElement<unknown, ThreadsDvm> {

  constructor() {
    super(ThreadsDvm.DEFAULT_BASE_ROLE_NAME);
  }

  /** -- Properties -- */

  /** Hash of bead to display */
  @property() hash: ActionHashB64 = ''

  @property() new: boolean = false;

  @property() deletable: boolean = false;

  /** Observed perspective from zvm */
  @property({type: Object, attribute: false, hasChanged: (_v, _old) => true})
  threadsPerspective!: ThreadsPerspective;

  @consume({context: weClientContext, subscribe: true})
  weServices: WeServicesEx;

  @consume({context: globaFilesContext, subscribe: true})
  _filesDvm!: FilesDvm;

  @state() private _loading = true;


  /**
   * In dvmUpdated() this._dvm is not already set!
   * Subscribe to ThreadsZvm
   */
  protected async dvmUpdated(newDvm: ThreadsDvm, oldDvm?: ThreadsDvm): Promise<void> {
    if (oldDvm) {
      oldDvm.threadsZvm.unsubscribe(this);
    }
    newDvm.threadsZvm.subscribe(this, 'threadsPerspective');
    /* Try loading AnyBead Asset */
    const pair = await newDvm.threadsZvm.fetchUnknownBead(decodeHashFromBase64(this.hash), false);
    if (!pair) {
      return;
    }
    const [typedBead, type] = pair;
    if (type == ThreadsEntryType.AnyBead && this.weServices) {
      const anyBead = typedBead as AnyBead;
      const wal = weaveUrlToWal(anyBead.value);
      await this.weServices.assetInfo(wal);
    }
  }


  /** */
  renderContent(): [TemplateResult<1>, AgentPubKeyB64, string] {
    let content = html``;

    if (this.hash == "") {
      content = html`<span>${msg("<Missing hash>")}</span>`;
      return [content, undefined, undefined];
    }
    const maybePair = this._dvm.threadsZvm.perspective.beads[this.hash];
    if (!maybePair) {
      content = html`<ui5-busy-indicator delay="0" size="Medium" active style="width:100%; height:100%;"></ui5-busy-indicator>`;
      return [content, undefined, undefined];
    }

    const [beadInfo, typedBead] = maybePair;
    const date = new Date(beadInfo.creationTime / 1000); // Holochain timestamp is in micro-seconds, Date wants milliseconds
    const date_str = date.toLocaleString('en-US', {hour12: false});

    switch(beadInfo.beadType) {
      case ThreadsEntryType.TextBead:
        const tm = typedBead as TextBeadMat;
        const result = md.render(tm.value);
        const parsed = unsafeHTML(result);
        /** render all */
        content = html`<div>${parsed}</div>`;
        break;
      case ThreadsEntryType.AnyBead:
        content = html`<div style="color: red;">${msg('<WeServices not available>')}</div>`;
        const anyBead = typedBead as AnyBeadMat;
        if (anyBead.typeInfo === "wal" && this.weServices) {
          const wal = weaveUrlToWal(anyBead.value);
          const id = "wal-item" + "-" + wal.hrl[1];
          const maybeInfo = this.weServices.assetInfoCached(wal);
          if (!maybeInfo) {
            content = html`
              <div .id=${id} 
                   style="color:#8a0cb7; cursor:pointer; overflow: auto; display: flex; flex-direction: row; gap:5px"
                   @click=${async (e) => {
                    e.stopPropagation();
                    await this.weServices.assetInfo(wal);
                    this.requestUpdate();
                  }}>
                  <ui5-icon name="synchronize"></ui5-icon>
                  <span>${msg('<unknown asset>')}</span>
              </div>
          `;
          } else {
            content = html`
              <div .id=${id} style="color:#8a0cb7; cursor:pointer; overflow: auto;"
                   @click=${(_e) => this.weServices.openWal(wal)}>
                  ${maybeInfo.assetInfo.name}
              </div>
          `;
          }
        }
        break;
      case ThreadsEntryType.EntryBead:
        content = html`<div>__File__</div>`;
        const entryBead = typedBead as EntryBeadMat;
        console.log("<comment-thread-view> entryBead", entryBead, entryBead.sourceEh);
        const manifestEh = entryBead.sourceEh;
        const maybeTuple = this._filesDvm.deliveryZvm.perspective.publicParcels[manifestEh];
        if (maybeTuple) {
          const desc = maybeTuple[0];
          content = html`<div style="color:#1067d7; cursor:pointer; overflow: auto;" 
                              @click=${(e) => {
            this._filesDvm.downloadFile(manifestEh);
            toasty("File downloaded: " + desc.name);
          }}>
                         File: ${desc.name} (${prettyFileSize(desc.size)})
                      </div>`;
        }
        break;
      default:
        break;
    }
    return [content, beadInfo.author, date_str];
  }


  /** */
  render() {
    console.log("<side-item>.render()", this.hash, this.deletable);

    const [content, author, date] = this.renderContent();
    const agentName = this._dvm.profilesZvm.perspective.profiles[author]? this._dvm.profilesZvm.perspective.profiles[author].nickname : "unknown";

    /* render item */
    return html`
    <div class="sideItem" style="${this.new? "border: 1px solid #F64F4F;" : ""}"
         @click=${(e) => {console.log("sideItem clicked", this.hash); e.stopPropagation(); this.dispatchEvent(beadJumpEvent(this.hash))}}>
        <div class="avatarRow">
            <div @click=${(e) => {
                //console.log("sideItem onShowProfile clicked", beadAh);
                e.stopPropagation();
                this.dispatchEvent(new CustomEvent('show-profile', {detail: {agent: author, x: e.clientX, y: e.clientY}, bubbles: true, composed: true}));
            }}>
                ${renderAvatar(this._dvm.profilesZvm, author, "XS")}                
            </div>
            <div class="nameColumn" style="display:flex; flex-direction:column;">
                <span class="sideAgentName">${agentName}</span>
                <span class="sideChatDate"> ${date}</span>
            </div>
            <div style="flex-grow: 1"></div>
            ${this.deletable? html`<ui5-button icon="decline" design="Transparent"
            @click=${(e) => {e.stopPropagation(); e.preventDefault(); this.dispatchEvent(new CustomEvent('deleted', {detail: true, bubbles: true, composed: true}))}}></ui5-button>` : html``}
        </div>
        <div class="sideContentRow">
          ${content}
        </div>
    </div>`;
  }


  /** */
  static get styles() {
    return [
      codeStyles,
      sharedStyles,
      css``,
    ];
  }
}
