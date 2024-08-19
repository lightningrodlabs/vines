import {css, html, TemplateResult} from "lit";
import {customElement, property} from "lit/decorators.js";
import {msg} from "@lit/localize";
import {consume} from "@lit/context";
import {unsafeHTML} from 'lit/directives/unsafe-html.js';

import {ActionId, AgentId, DnaElement, intoLinkableId} from "@ddd-qc/lit-happ";
import {FilesDvm, prettyFileSize} from "@ddd-qc/files";
import {WeServicesEx} from "@ddd-qc/we-utils";

import {AnyBeadMat, BeadInfo, EntryBeadMat, TextBeadMat} from "../viewModels/threads.materialize";
import {ThreadsDvm} from "../viewModels/threads.dvm";
import {AnyBead, ThreadsEntryType} from "../bindings/threads.types";
import {md} from "../markdown/md";
import {determineBeadName, weaveUrlToWal} from "../utils";
import {toasty} from "../toast";
import {beadJumpEvent, ShowProfileEvent} from "../events";
import {renderAvatar} from "../render";
import {globaFilesContext, weClientContext} from "../contexts";
import {codeStyles} from "../markdown/code-css";
import {sharedStyles} from "../styles";
import {ThreadsPerspective} from "../viewModels/threads.perspective";
import {Profile} from "@ddd-qc/profiles-dvm/dist/bindings/profiles.types";


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
  @property() hash!: ActionId;

  @property() prevBeadAh?: ActionId;

  @property() new: boolean = false;

  @property() deletable: boolean = false;

  /** Observed perspective from zvm */
  @property({type: Object, attribute: false, hasChanged: (_v, _old) => true})
  threadsPerspective!: ThreadsPerspective;

  @consume({context: weClientContext, subscribe: true})
  weServices?: WeServicesEx;

  @consume({context: globaFilesContext, subscribe: true})
  _filesDvm!: FilesDvm;


  /** In dvmUpdated() this._dvm is not already set! */
  protected override async dvmUpdated(newDvm: ThreadsDvm, oldDvm?: ThreadsDvm): Promise<void> {
    /** Subscribe to ThreadsZvm */
    if (oldDvm) {
      oldDvm.threadsZvm.unsubscribe(this);
    }
    newDvm.threadsZvm.subscribe(this, 'threadsPerspective');
    /* Try loading AnyBead Asset */
    const tuple = await newDvm.threadsZvm.fetchUnknownBead(this.hash);
    const [typedBead, type, _ts, _author] = tuple;
    if (type == ThreadsEntryType.AnyBead && this.weServices) {
      const anyBead = typedBead as AnyBead;
      const wal = weaveUrlToWal(anyBead.value);
      await this.weServices.assetInfo(wal);
    }
  }


  /** */
  renderContent(): [TemplateResult<1>, AgentId | undefined, string | undefined] {
    let content = html``;
    if (!this.hash) {
      content = html`<span style="color:red">missing hash</span>`;
      return [content, undefined, undefined];
    }
    const beadInfo = this._dvm.threadsZvm.perspective.getBaseBeadInfo(this.hash);
    if (!beadInfo) {
      content = html`<ui5-busy-indicator delay="0" size="Medium" active style="width:100%; height:100%;"></ui5-busy-indicator>`;
      return [content, undefined, undefined];
    }
    const typedBead = this._dvm.threadsZvm.perspective.getBaseBead(this.hash);
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
                    await this.weServices?.assetInfo(wal);
                    this.requestUpdate();
                  }}>
                  <ui5-icon name="synchronize"></ui5-icon>
                  <span>${msg('Unknown Asset')}</span>
              </div>
          `;
          } else {
            content = html`
              <div .id=${id} style="color:#8a0cb7; cursor:pointer; overflow: auto;"
                   @click=${(_e:any) => this.weServices?.openWal(wal)}>
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
        const maybePprm = this._filesDvm.deliveryZvm.perspective.publicParcels.get(manifestEh);
        if (maybePprm) {
          const desc = maybePprm.description;
          content = html`<div style="color:#1067d7; cursor:pointer; overflow: auto;" 
                              @click=${(_e:any) => {
                              this._filesDvm.downloadFile(manifestEh);
                              toasty(msg("File downloaded") + ": " + desc.name);
                          }}>
                         ${msg("File")}: ${desc.name} (${prettyFileSize(desc.size)})
                      </div>`;
        }
        break;
      default:
        break;
    }
    return [content, beadInfo.author, date_str];
  }


  /** */
  renderPrevBead(beadInfo: BeadInfo) {
    const hasFarPrev = !beadInfo.bead.prevBeadAh.equals(beadInfo.bead.ppAh) && this.prevBeadAh && !beadInfo.bead.prevBeadAh.equals(this.prevBeadAh);
    if (!hasFarPrev) {
      return html``;
    }
    const prevBeadInfo = this._dvm.threadsZvm.perspective.getBaseBeadInfo(beadInfo.bead.prevBeadAh);
    const prevBead = this._dvm.threadsZvm.perspective.getBaseBead(beadInfo.bead.prevBeadAh);
    /** */
    return html`
      <blockquote class="reply"
           @click=${(e:any) => {e.stopPropagation(); this.dispatchEvent(beadJumpEvent(beadInfo.bead.prevBeadAh))}}>
          ${determineBeadName(prevBeadInfo!.beadType, prevBead!, this._filesDvm, this.weServices, 200)}
      </blockquote>
    `;
  }


  /** */
  override render() {
    console.log("<side-item>.render()", this.hash, this.deletable);
    const beadInfo = this._dvm.threadsZvm.perspective.getBeadInfo(this.hash);
    const [content, author, date] = this.renderContent();
    let maybeProfile: Profile | undefined = undefined;
    if (author) {
      maybeProfile = this._dvm.profilesZvm.perspective.getProfile(author);
    }
    const agentName = maybeProfile? maybeProfile.nickname : "unknown";
    /* render item */
    return html`
    <div class="sideItem" style="${this.new? "border: 1px solid #F64F4F;" : ""}"
         @click=${(e:any) => {console.log("sideItem clicked", this.hash); e.stopPropagation(); this.dispatchEvent(beadJumpEvent(this.hash))}}>
        <div class="avatarRow">
            <div @click=${(e:any) => {
                e.stopPropagation();
                if (author) this.dispatchEvent(new CustomEvent<ShowProfileEvent>('show-profile', {detail: {agentId: author, x: e.clientX, y: e.clientY}, bubbles: true, composed: true}));
            }}>
                ${author? renderAvatar(this._dvm.profilesZvm, author, "XS") : ""}                
            </div>
            <div class="nameColumn" style="display:flex; flex-direction:column;">
                <span class="sideAgentName">${agentName}</span>
                <span class="sideChatDate"> ${date}</span>
            </div>
            <div style="flex-grow: 1"></div>
            ${this.deletable? html`<ui5-button icon="decline" design="Transparent"
            @click=${(e:any) => {e.stopPropagation(); e.preventDefault(); this.dispatchEvent(new CustomEvent('deleted', {detail: true, bubbles: true, composed: true}))}}></ui5-button>` : html``}
        </div>
        ${beadInfo? this.renderPrevBead(beadInfo) : ""}
        <div class="sideContentRow">
          ${content}
        </div>
    </div>`;
  }


  /** */
  static override get styles() {
    return [
      codeStyles,
      sharedStyles,
      css`
        .chatAvatar {
          outline: rgb(152, 155, 153) solid 1px;
        }
        .reply {
          /*box-shadow: rgba(0, 0, 0, 0.25) 0px 14px 28px, rgba(0, 0, 0, 0.22) 0px 10px 10px;*/
          color: gray;
          padding: 5px 0px 5px 10px;
        }
        
        .reply:hover {
          background: #def9de;
        }
      `,
    ];
  }
}
