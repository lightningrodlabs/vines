import {css, html, TemplateResult} from "lit";
import {customElement, property, state} from "lit/decorators.js";
import {msg} from "@lit/localize";
import {consume} from "@lit/context";
import {unsafeHTML} from 'lit/directives/unsafe-html.js';

import {ActionHashB64, AgentPubKeyB64, decodeHashFromBase64} from "@holochain/client";
import {DnaElement} from "@ddd-qc/lit-happ";
import {FilesDvm, prettyFileSize} from "@ddd-qc/files";
import {WeServicesEx} from "@ddd-qc/we-utils";

import {
  AnyBeadMat,
  dematerializeAnyBead,
  EntryBeadMat, materializeAnyBead, materializeBead, materializeTypedBead,
  TextBeadMat,
  ThreadsPerspective,
} from "../viewModels/threads.perspective";
import {ThreadsDvm} from "../viewModels/threads.dvm";
import {AnyBead, ThreadsEntryType} from "../bindings/threads.types";
import {md} from "../markdown/md";
import {timeSince, weaveUrlToWal} from "../utils";
import {toasty} from "../toast";
import {renderAvatar} from "../render";
import {globaFilesContext, weClientContext} from "../contexts";
import {codeStyles} from "../markdown/code-css";
import {sharedStyles} from "../styles";
import {Hrl, weaveUrlFromWal} from "@lightningrodlabs/we-applet";


/**
 * @element
 */
@customElement("post-comment-item")
export class PostCommentItem extends DnaElement<unknown, ThreadsDvm> {

  constructor() {
    super(ThreadsDvm.DEFAULT_BASE_ROLE_NAME);
  }

  /** -- Properties -- */

  /** Hash of bead to display */
  @property() hash: ActionHashB64 = ''

  @property() new: boolean = false;

  @property({type: Boolean}) shortmenu: boolean = false;

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
    console.log("<post-comment-item>.dvmUpdated()", this.hash, newDvm);
    if (oldDvm) {
      oldDvm.threadsZvm.unsubscribe(this);
    }
    newDvm.threadsZvm.subscribe(this, 'threadsPerspective');
    let beadInfo = newDvm.threadsZvm.getBeadInfo(this.hash);
    let typedBead = newDvm.threadsZvm.getBead(this.hash);
    let beadType;
    /* Try loading AnyBead Asset */
    if (!beadInfo) {
      const tuple = await newDvm.threadsZvm.fetchUnknownBead(this.hash);
      beadType = tuple[1];
      typedBead = materializeTypedBead(tuple[0], beadType);
    } else {
      beadType = beadInfo.beadType
    }
    if (beadType == ThreadsEntryType.AnyBead && this.weServices) {
      const anyBead = typedBead as AnyBeadMat;
      const wal = weaveUrlToWal(anyBead.value);
      await this.weServices.assetInfo(wal);
    }
    await newDvm.threadsZvm.pullEmojiReactions(this.hash);
  }


  /** */
  renderContent(): [TemplateResult<1>, AgentPubKeyB64, Date] {
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
        console.log("<post-comment-item> entryBead", entryBead, entryBead.sourceEh);
        const manifestEh = entryBead.sourceEh;
        const maybePprm = this._filesDvm.deliveryZvm.perspective.publicParcels[manifestEh];
        if (maybePprm) {
          const desc = maybePprm.description;
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
    return [content, beadInfo.author, date];
  }


  /** */
  copyMessageLink() {
    const hrl: Hrl = [decodeHashFromBase64(this.cell.dnaHash), decodeHashFromBase64(this.hash)];
    const wurl = weaveUrlFromWal({hrl});
    navigator.clipboard.writeText(wurl);
    if (this.weServices) {
      this.weServices.walToPocket({hrl});
    }
    toasty(("Copied Message's WAL to clipboard"));
  }


  /** */
  render() {
    console.log("<post-comment-item>.render()", this.hash);

    const [content, author, date] = this.renderContent();
    const agentName = this._dvm.profilesZvm.perspective.profiles[author]? this._dvm.profilesZvm.perspective.profiles[author].nickname : "unknown";
    const date_str = timeSince(date);

    /* render item */
    return html`
    <div id="sideItem">
        <div id="avatarColumn">
            <div style="cursor:pointer"
                @click=${(e) => {
                    //console.log("sideItem onShowProfile clicked", beadAh);
                    e.stopPropagation();
                    this.dispatchEvent(new CustomEvent('show-profile', {detail: {agent: author, x: e.clientX, y: e.clientY}, bubbles: true, composed: true}));
                }}>
                ${renderAvatar(this._dvm.profilesZvm, author, "XS")}                
            </div>
        </div>
        <div id="sideContentColumn">
          <div class="nameColumn" style="display:flex; flex-direction:column;">
              <span class="sideAgentName" style="font-size: 0.8em">${agentName}</span>
              ${content}              
          </div>
          <div class="underRow">
              <div>${date_str}</div>
              <div id="likeBtn" class="textBtn" @click=${(e) => this.dispatchEvent(new CustomEvent('show-emoji', {detail: {bead: this.hash, x: e.clientX, y: e.clientY}, bubbles: true, composed: true}))}>${msg('Like')}</div>
              <div class="textBtn" @click=${(_e) => this.copyMessageLink()}>${msg('Share')}</div>
              <div style="flex-grow: 1;"></div>
              <emoji-bar .hash=${this.hash} style="margin-top:2px;"></emoji-bar>
          </div>
        </div>
    </div>
    `;
  }


  /** */
  static get styles() {
    return [
      codeStyles,
      sharedStyles,
      css`
        
        .textBtn {
          font-weight: bold;
        }

        .textBtn:hover {
          text-decoration: underline;
          cursor: pointer;
        }
        #sideItem {
          display: flex;
          flex-direction: row;
          /*padding: 5px;*/
          /*gap:5px;*/
        }
        
        #avatarColumn {
          padding-top: 8px;
        }
        
        .nameColumn {
          background: #eee;
          border-radius: 10px;
          padding-top: 2px;
          padding-bottom: 8px;
          padding-left: 8px;          
        }
        #sideContentColumn {
          display: flex;
          flex-direction: column;
          flex-grow: 1;
          padding: 5px;          
        }
        
        .underRow {
          display: flex; 
          flex-direction: row;
          gap: 15px;
          font-size: 0.75em;
          margin-left: 5px;
        }
      `,
    ];
  }
}
