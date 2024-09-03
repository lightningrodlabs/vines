import {css, html, TemplateResult} from "lit";
import {customElement, property} from "lit/decorators.js";
import {msg} from "@lit/localize";
import {consume} from "@lit/context";
import {unsafeHTML} from 'lit/directives/unsafe-html.js';

import {ActionId, AgentId, DnaElement, intoLinkableId} from "@ddd-qc/lit-happ";
import {FilesDvm, prettyFileSize} from "@ddd-qc/files";
import {intoHrl, WeServicesEx} from "@ddd-qc/we-utils";

import {
  AnyBeadMat, BeadType,
  EntryBeadMat, materializeTypedBead,
  TextBeadMat,
} from "../viewModels/threads.materialize";
import {ThreadsDvm} from "../viewModels/threads.dvm";
import {ThreadsEntryType} from "../bindings/threads.types";
import {md} from "../markdown/md";
import {timeSince, weaveUrlToWal} from "../utils";
import {toasty} from "../toast";
import {renderAvatar} from "../render";
import {globaFilesContext, weClientContext} from "../contexts";
import {codeStyles} from "../markdown/code-css";
import {sharedStyles} from "../styles";
import {Hrl, weaveUrlFromWal} from "@lightningrodlabs/we-applet";
import {ShowEmojiEvent, ShowProfileEvent} from "../events";
import {ThreadsPerspective} from "../viewModels/threads.perspective";


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
  @property() hash!: ActionId;

  @property() new: boolean = false;

  @property({type: Boolean}) shortmenu: boolean = false;

  /** Observed perspective from zvm */
  @property({type: Object, attribute: false, hasChanged: (_v, _old) => true})
  threadsPerspective!: ThreadsPerspective;

  @consume({context: weClientContext, subscribe: true})
  weServices?: WeServicesEx;

  @consume({context: globaFilesContext, subscribe: true})
  _filesDvm!: FilesDvm;


  /** In dvmUpdated() this._dvm is not already set! */
  protected override async dvmUpdated(newDvm: ThreadsDvm, oldDvm?: ThreadsDvm): Promise<void> {
    console.log("<post-comment-item>.dvmUpdated()", this.hash, newDvm);
    /** Subscribe to ThreadsZvm */
    if (oldDvm) {
      oldDvm.threadsZvm.unsubscribe(this);
    }
    newDvm.threadsZvm.subscribe(this, 'threadsPerspective');
    /** */
    let beadInfo = newDvm.threadsZvm.perspective.getBeadInfo(this.hash);
    let typedBead = newDvm.threadsZvm.perspective.getBead(this.hash);
    let beadType: BeadType | undefined = undefined;
    /* Try loading AnyBead Asset */
    if (!beadInfo) {
      const tuple = await newDvm.threadsZvm.fetchUnknownBead(this.hash);
      if (tuple) {
        beadType = tuple[1];
        typedBead = materializeTypedBead(tuple[0], beadType);
      }
    } else {
      beadType = beadInfo.beadType;
    }
    if (beadType == ThreadsEntryType.AnyBead && this.weServices) {
      const anyBead = typedBead as AnyBeadMat;
      const wal = weaveUrlToWal(anyBead.value);
      await this.weServices.assetInfo(wal);
    }
    await newDvm.threadsZvm.pullEmojiReactions(this.hash);
  }


  /** */
  renderContent(): [TemplateResult<1>, AgentId | undefined, Date | undefined] {
    let content = html``;
    if (!this.hash) {
      content = html`<span style="color:red">missing hash</span>`;
      return [content, undefined, undefined];
    }
    const maybePair = this._dvm.threadsZvm.perspective.beads.get(this.hash);
    if (!maybePair) {
      content = html`<ui5-busy-indicator delay="0" size="Medium" active style="width:100%; height:100%;"></ui5-busy-indicator>`;
      return [content, undefined, undefined];
    }
    /** */
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
        content = html`<div style="color:red;">${msg('WeaveServices not available')}</div>`;
        const anyBead = typedBead as AnyBeadMat;
        if (anyBead.typeInfo === "wal" && this.weServices) {
          const wal = weaveUrlToWal(anyBead.value);
          const assetHash = intoLinkableId(wal.hrl[1])
          const id = "wal-item" + "-" + assetHash.b64;
          const maybeInfo = this.weServices.assetInfoCached(wal);
          if (!maybeInfo) {
            content = html`
              <div .id=${id} 
                   style="color:#8a0cb7; cursor:pointer; overflow: auto; display: flex; flex-direction: row; gap:5px"
                   @click=${async (e:any) => {
                    e.stopPropagation();
                    if (!this.weServices) {
                      console.error("WeServices missing");
                      return;
                    }
                    await this.weServices.assetInfo(wal);
                    this.requestUpdate();
                  }}>
                  <ui5-icon name="synchronize"></ui5-icon>
                  <span>${msg('Unknown Asset')}</span>
              </div>
          `;
          } else {
            content = html`
              <div .id=${id} 
                   style="color:#8a0cb7; cursor:pointer; overflow: auto;"
                   @click=${(_e:any) => {if (this.weServices) this.weServices.openWal(wal)}}>
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
        const maybePprm = this._filesDvm.deliveryZvm.perspective.publicParcels.get(manifestEh);
        if (maybePprm) {
          const desc = maybePprm.description;
          content = html`<div style="color:#1067d7; cursor:pointer; overflow: auto;" 
                              @click=${(_e:any) => {
                                this._filesDvm.downloadFile(manifestEh);
                                toasty(`${msg("File downloaded")}: ${desc.name}`);
                          }}>
                            ${msg("File")}: ${desc.name} (${prettyFileSize(desc.size)})
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
    const hrl: Hrl = intoHrl(this.cell.address.dnaId, this.hash);
    const wurl = weaveUrlFromWal({hrl});
    navigator.clipboard.writeText(wurl);
    if (this.weServices) {
      this.weServices.walToPocket({hrl});
    }
    toasty(msg("Copied Message's WAL to clipboard"));
  }


  /** */
  override render() {
    console.log("<post-comment-item>.render()", this.hash);

    const [content, author, date] = this.renderContent();
    const agentName = author && this._dvm.profilesZvm.perspective.getProfile(author)? this._dvm.profilesZvm.perspective.getProfile(author)!.nickname : "unknown";
    const date_str = date? timeSince(date) : "unknown date";

    /* render all */
    return html`
    <div id="sideItem">
        <div id="avatarColumn">
            <div style="cursor:pointer"
                @click=${(e:any) => {
                    //console.log("sideItem onShowProfile clicked", beadAh);
                    e.stopPropagation();
                    if (author) {
                      this.dispatchEvent(new CustomEvent<ShowProfileEvent>('show-profile', {detail: {agentId: author, x: e.clientX, y: e.clientY}, bubbles: true, composed: true}));
                    }
                }}>
                ${author? renderAvatar(this._dvm.profilesZvm, author, "XS") : html``}
            </div>
        </div>
        <div id="sideContentColumn">
          <div class="nameColumn" style="display:flex; flex-direction:column;">
              <span class="sideAgentName" style="font-size: 0.8em">${agentName}</span>
              ${content}
          </div>
          <div class="underRow">
              <div>${date_str}</div>
              <div id="likeBtn" class="textBtn" @click=${(e:any) => this.dispatchEvent(new CustomEvent<ShowEmojiEvent>('show-emoji', {detail: {bead: this.hash, x: e.clientX, y: e.clientY}, bubbles: true, composed: true}))}>${msg('Like')}</div>
              <div class="textBtn" @click=${(_e:any) => this.copyMessageLink()}>${msg('Share')}</div>
              <div style="flex-grow: 1;"></div>
              <emoji-bar .hash=${this.hash} style="margin-top:2px;"></emoji-bar>
          </div>
        </div>
    </div>
    `;
  }


  /** */
  static override get styles() {
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
