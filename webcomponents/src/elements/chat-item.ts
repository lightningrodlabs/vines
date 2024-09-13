import {html, css, PropertyValues} from "lit";
import {customElement, property} from "lit/decorators.js";
import {msg} from "@lit/localize";
import {consume} from "@lit/context";
import {ActionId, AgentId, DnaElement} from "@ddd-qc/lit-happ";
import {ThreadsDvm} from "../viewModels/threads.dvm";
import 'emoji-picker-element';

import {renderAvatar, renderProfileAvatar} from "../render";
import {ThreadsEntryType} from "../bindings/threads.types";
import {beadJumpEvent, threadJumpEvent, ShowProfileEvent, CommentRequest} from "../events";
import {filesContext, onlineLoadedContext, weClientContext} from "../contexts";
import {intoHrl, WeServicesEx} from "@ddd-qc/we-utils";
import {Hrl, weaveUrlFromWal, weaveUrlToWAL} from "@lightningrodlabs/we-applet";
import {FilesDvm} from "@ddd-qc/files";

import Menu from "@ui5/webcomponents/dist/Menu";
import Button from "@ui5/webcomponents/dist/Button";
import Popover from "@ui5/webcomponents/dist/Popover";

import {toasty} from "../toast";
import {popoverStyleTemplate} from "../styles";
import {determineBeadName} from "../utils";
import {Profile as ProfileMat} from "@ddd-qc/profiles-dvm/dist/bindings/profiles.types";
import {ThreadsPerspective} from "../viewModels/threads.perspective";
import {AnyBeadMat, BeadInfo, EntryBeadMat, TextBeadMat} from "../viewModels/threads.materialize";


/**
 * @element
 */
@customElement("chat-item")
export class ChatItem extends DnaElement<unknown, ThreadsDvm> {

  constructor() {
    super(ThreadsDvm.DEFAULT_BASE_ROLE_NAME)
  }

  /** -- Properties -- */

  /** Hash of bead to display */
  @property() hash!: ActionId;

  @property() prevBeadAh?: ActionId;

  @property({type: Boolean}) shortmenu: boolean = false;

  /** Observed perspective from zvm */
  @property({type: Object, attribute: false, hasChanged: (_v, _old) => true})
  threadsPerspective!: ThreadsPerspective;

  @consume({ context: weClientContext, subscribe: true })
  weServices?: WeServicesEx;

  @consume({ context: filesContext, subscribe: true })
  _filesDvm!: FilesDvm;


  @consume({ context: onlineLoadedContext, subscribe: true })
  onlineLoaded!: boolean;


  private _renderCount = 0;


  /** -- Methods -- */

  /**
   * In dvmUpdated() this._dvm is not already set!
   * Subscribe to ThreadsZvm
   */
  protected override async dvmUpdated(newDvm: ThreadsDvm, oldDvm?: ThreadsDvm): Promise<void> {
    //console.log("<chat-item>.dvmUpdated()", this.hash, newDvm.cell.address.dnaId.b64)
    if (oldDvm) {
      oldDvm.threadsZvm.unsubscribe(this);
    }
    newDvm.threadsZvm.subscribe(this, 'threadsPerspective');
  }


  /** Probe bead and its reactions */
  protected override firstUpdated(_changedProperties: PropertyValues) {
    super.firstUpdated(_changedProperties);
    this.loadBead();
  }


  /** */
  protected override willUpdate(changedProperties: PropertyValues<this>) {
    super.willUpdate(changedProperties);
    //console.log("<chat-item>.willUpdate()", changedProperties, !!this._dvm, this.hash);
    if (this._dvm && (changedProperties.has("hash"))) {
      this.loadBead();
    }
  }

  /** */
  protected override async updated(_changedProperties: PropertyValues) {
    /** Fiddle with shadow CSS */
    const popover = this.shadowRoot!.getElementById("buttonsPop") as Popover;
    if (popover) {
      popover.shadowRoot!.appendChild(popoverStyleTemplate.content.cloneNode(true));
    }
  }


  /** */
  private async loadBead() {
    const beadInfo = this._dvm.threadsZvm.perspective.getBeadInfo(this.hash);
    if (!beadInfo) {
      await this._dvm.threadsZvm.fetchUnknownBead(this.hash);
    }
    await this._dvm.threadsZvm.pullEmojiReactions(this.hash);
  }


  /** */
  onClickComment(maybeCommentThread: ActionId | null, subjectName: string, subjectType: string, viewType?: string) {
    this.dispatchEvent(new CustomEvent<CommentRequest>('commenting-clicked', {
      detail: {maybeCommentThread, subjectId: this.hash, subjectType, subjectName, viewType: viewType? viewType : "side"},
      bubbles: true,
      composed: true,
    }));
  }

  /** */
  onClickReply() {
    this.dispatchEvent(new CustomEvent<ActionId>('reply-clicked', {detail: this.hash, bubbles: true, composed: true,}));
  }

  /** */
  onClickAddEmoji() {
    const popover = this.shadowRoot!.getElementById("emojiPopover") as Popover;
    const btn = this.shadowRoot!.getElementById("buttonsPop") as HTMLElement;
    popover.showAt(btn);
  }


  /** */
  onMoreMenu(e:any) {
    console.debug("onMoreMenu item-click", e)
    switch (e.detail.item.id) {
      case "addReaction": this.onClickAddEmoji(); break;
      case "addFavorite": this.updateFavorite(this.hash, true); break;
      case "removeFavorite": this.updateFavorite(this.hash, false); break;
      case "viewComments":
      case "createCommentThread":
        const maybeCommentThread = this._dvm.threadsZvm.perspective.getCommentThreadForSubject(this.hash);
        const beadInfo = this._dvm.threadsZvm.perspective.getBaseBeadInfo(this.hash)!;
        const typed = this._dvm.threadsZvm.perspective.getBaseBead(this.hash)!;
        const beadName = determineBeadName(beadInfo.beadType, typed, this._filesDvm, this.weServices);
        this.onClickComment(maybeCommentThread, beadName, beadInfo.beadType, "side");
      break;
      case "intoHrl":
        const hrl: Hrl = intoHrl(this.cell.address.dnaId, this.hash);
        const wurl = weaveUrlFromWal({hrl});
        navigator.clipboard.writeText(wurl);
        if (this.weServices) {
          this.weServices.walToPocket({hrl});
        }
        toasty(msg("Copied Message's WAL to clipboard"));
      break;
      case "downloadItem": {
        const beadInfo = this._dvm.threadsZvm.perspective.getBaseBeadInfo(this.hash)!;
        if (beadInfo.beadType == ThreadsEntryType.TextBead) {
          const tm = this._dvm.threadsZvm.perspective.getBaseBead(this.hash) as TextBeadMat;
          navigator.clipboard.writeText(tm.value);
          toasty(msg("Copied Text to clipboard"));
        }
        if (beadInfo.beadType == ThreadsEntryType.EntryBead) {
          const entryBead = this._dvm.threadsZvm.perspective.getBaseBead(this.hash) as EntryBeadMat;
          this._filesDvm.downloadFile(entryBead.sourceEh);
        }
        if (beadInfo.beadType == ThreadsEntryType.AnyBead) {
          const anyBead = this._dvm.threadsZvm.perspective.getBaseBead(this.hash) as AnyBeadMat;
          const wal = weaveUrlToWAL(anyBead.value);
          navigator.clipboard.writeText(anyBead.value);
          if (this.weServices) {
            this.weServices.walToPocket(wal);
          }
          toasty(msg("Copied WAL Link to clipboard"));
        }
      }
        break;
      case "flagMessage": /* TODO */ break;
    }
  }


  /** */
  async updateFavorite(beadAh: ActionId, canAdd: boolean) {
    if (canAdd) {
      await this._dvm.threadsZvm.addFavorite(beadAh);
      toasty(msg("Message added to favorites"));
    } else {
      await this._dvm.threadsZvm.removeFavorite(beadAh);
      toasty(msg("Message removed from favorites"));
    }
  }


  /** */
  renderTopVine(beadInfo: BeadInfo) {
    console.log("<chat-item>.renderTopVine()", this.prevBeadAh, beadInfo);
    const hasFarPrev = !beadInfo.bead.prevBeadAh.equals(beadInfo.bead.ppAh) && this.prevBeadAh && !beadInfo.bead.prevBeadAh.equals(this.prevBeadAh)
    const prevBeadInfo = this._dvm.threadsZvm.perspective.getBaseBeadInfo(beadInfo.bead.prevBeadAh);
    if (!prevBeadInfo) {
      return html``;
    }
    const prevBead = this._dvm.threadsZvm.perspective.getBaseBead(beadInfo.bead.prevBeadAh)!;
    let prevProfile: ProfileMat = {nickname: "unknown", fields: {lang: "en"}} as ProfileMat;
    if (prevBeadInfo) {
      const maybePrevProfile = this._dvm.profilesZvm.perspective.getProfile(prevBeadInfo.author);
      if (maybePrevProfile) {
        prevProfile = maybePrevProfile
      }
    }
    //console.log(`hasFarPrev`, this.hash, hasFarPrev, beadInfo.bead.prevBeadAh, this.prevBeadAh)

    const topVineRow = hasFarPrev? html`
        <div class="topRow" style="display: flex; flex-direction: row; gap: 5px; font-size: small; align-items: center; color: #2c6ea8; ">
          <div class="vineColumn" style="display: flex; flex-direction: column;">
            <div class="topVine" style="flex-grow:1;">
                <div style="flex-grow:1;"></div>
                <div class=""></div>
            </div>
            <div class="topVine" style="flex-grow:1;">
                <div style="flex-grow:1;"></div>
                <div class="vine replyVine"></div>
            </div>
          </div>
          ${renderProfileAvatar(prevProfile, "XS", "replyAvatar")}
          <div id="prevAuthor"                     
               @click=${(e:any) => {
                  e.stopPropagation();
                  this.dispatchEvent(new CustomEvent<ShowProfileEvent>('show-profile', {detail: {agentId: prevBeadInfo.author, x: e.clientX, y: e.clientY}, bubbles: true, composed: true}));}}>
            @${prevProfile? prevProfile.nickname : "unknown"}
          </div>
          <div id="prevBeadName"               
               @click=${(e:any) => {e.stopPropagation();this.dispatchEvent(beadJumpEvent(beadInfo.bead.prevBeadAh))}}>
              ${determineBeadName(prevBeadInfo.beadType, prevBead, this._filesDvm, this.weServices, 200)}
          </div>
        </div>
    ` : html`
        <div class="topVine">
            <div style="flex-grow:1;"></div>
            <div class="vine"></div>
        </div>
    `;
    /** */
    return topVineRow;
  }


  /** */
  override render() {
    console.log("<chat-item>.render()", this.hash, !!this._filesDvm, !!this.threadsPerspective, !!this.weServices, this._renderCount);
    this._renderCount += 1;

    if (!this.hash) {
      return html`<div>No bead selected</div>`;
    }
    const beadInfo = this._dvm.threadsZvm.perspective.getBaseBeadInfo(this.hash);
    if (!beadInfo) {
      return html`<ui5-busy-indicator delay="0" size="Medium" active style="margin:auto; width:100%; height:100%;"></ui5-busy-indicator>`;
    }
    const typed = this._dvm.threadsZvm.perspective.getBaseBead(this.hash)!;
    /** hide if prevBead is closer than a minute and same author */
    let hidemeta = false;
    if (this.prevBeadAh) {
      const prevInfo = this._dvm.threadsZvm.perspective.getBaseBeadInfo(beadInfo.bead.prevBeadAh);
      if (prevInfo) {
        const diff = beadInfo.creationTime - prevInfo.creationTime;
        hidemeta = beadInfo.author.equals(prevInfo.author) && diff < 60 * 1000 * 1000;
      }
    }
    let beadAsSubjectName = determineBeadName(beadInfo.beadType, typed, this._filesDvm, this.weServices);
    let item = html``;
    let downloadItem = html``;
    const itemClass = hidemeta? "" : "innerItem";
    if (beadInfo.beadType == ThreadsEntryType.TextBead) {
      item = html`<chat-text class="${itemClass}" .hash=${this.hash}></chat-text>`;
      downloadItem = html`<ui5-menu-item id="downloadItem" icon="copy" text=${msg("Copy Text")}></ui5-menu-item>`;
    }
    if (beadInfo.beadType == ThreadsEntryType.EntryBead) {
      item = html`<chat-file class="${itemClass}" .hash=${this.hash}></chat-file>`;
      downloadItem = html`<ui5-menu-item id="downloadItem" icon="download" text=${msg("Download File")}></ui5-menu-item>`;
    }
    if (beadInfo.beadType == ThreadsEntryType.AnyBead) {
      item = html`<chat-wal class="${itemClass}" .hash=${this.hash}></chat-wal>`;
      downloadItem = html`<ui5-menu-item id="downloadItem" icon="chain-link" text=${msg("Copy WAL Link")}></ui5-menu-item>`;
    }
    /** Determine the comment button to display depending on current comments for this message */
    const maybeCommentThread = this._dvm.threadsZvm.perspective.getCommentThreadForSubject(this.hash);
    let commentThread = html``;
    let commentButton = html`
        <ui5-button icon="sys-add" tooltip=${msg("Create comment thread for this message")} design="Transparent" style="border:none;"
                      @click="${(_e:any) => this.onClickComment(maybeCommentThread, beadAsSubjectName, beadInfo.beadType, "side")}">                      
        </ui5-button>`;
    const hasComments = maybeCommentThread && this.threadsPerspective.threads.get(maybeCommentThread);
    if (hasComments) {
      commentButton = html`              
          <ui5-button icon="discussion" tooltip=${msg("View comments on the side")} design="Transparent" style="border:none;"
                       @click="${(_e:any) => this.onClickComment(maybeCommentThread, beadAsSubjectName, beadInfo.beadType, "side")}">
          </ui5-button>`;
      const isUnread = this.threadsPerspective.unreadThreads.has(maybeCommentThread);
      const commentLinkColor = isUnread ? "red" : "blue";
      const thread = this.threadsPerspective.threads.get(maybeCommentThread)!;
      const threadAvatar = renderAvatar(this._dvm.profilesZvm, thread.author, "XS");
      if (thread.beadLinksTree.length > 0) {
        /** Grab all authors */
        let authors: Record<string, number> = {};
        for (const bead of thread.beadLinksTree.values) {
          const beadInfo = this._dvm.threadsZvm.perspective.getBeadInfo(bead.beadAh);
          if (!beadInfo) {
            console.warn("Bead not found in <chat-item>.render()", bead.beadAh);
            continue;
          }
          if (!authors[beadInfo.author.b64]) {
            authors[beadInfo.author.b64] = 0;
          }
          authors[beadInfo.author.b64] += 1;
        }
        /** Create avatar for each author */
          //console.log("Authors' Avatar", Object.keys(authors).length);
        let avatars = Object.keys(authors).map((author) => {
            return renderAvatar(this._dvm.profilesZvm, new AgentId(author), "XS");
          });
        const avatarGroup = avatars.length > 1 ? html`
            <ui5-avatar-group type="Group" style="width: auto">${avatars}</ui5-avatar-group>` : html`${avatars}`;
        commentThread = html`
                ${avatarGroup}
                <span class="thread-link" style="color: ${commentLinkColor}"
                      @click=${(_e:any) => this.dispatchEvent(threadJumpEvent(maybeCommentThread))}>
              ${thread.beadLinksTree.length > 1 ? "" + thread.beadLinksTree.length + " comments" : "" + thread.beadLinksTree.length + " comment"} 
            </span>
        `;
      } else {
        /** Display avatar of thread creator */
        commentThread = html`
                ${threadAvatar}
                <span class="thread-link" style="color: ${commentLinkColor}"
                      @click=${(_e:any) => this.dispatchEvent(threadJumpEvent(maybeCommentThread))}>
              view comments
            </span>
        `;
      }
    }

    //console.log("<chat-item>.render() maybeCommentThread", maybeCommentThread, commentThread);

    const menuButton = html`
        <ui5-button id="menu-btn" icon="overflow" tooltip=${msg('More')} design="Transparent" style="border:none;"
                    @click=${(e:any) => {
                        e.preventDefault(); e.stopPropagation();
                        //console.log("onSettingsMenu()", e);
                        const menu = this.shadowRoot!.getElementById("moreMenu") as Menu;
                        const btn = this.shadowRoot!.getElementById("menu-btn") as Button;
                        menu.showAt(btn);
                    }}></ui5-button>`;

    const replyButton = /*this.cell.agentId.b64 == beadInfo.author? html`` :*/
      html`
        <ui5-button id="reply-btn" icon="response" tooltip=${msg('Reply')} design="Transparent" style="border:none;"
                    @click=${(_e:any) => this.onClickReply()}></ui5-button>`;

    const reactionButton = html`
              <ui5-button id="add-reaction-btn" icon="feedback" tooltip=${msg('Add Reaction')} design="Transparent" style="border:none;"
                          @click=${(_e:any) => this.onClickAddEmoji()}></ui5-button>`;

    const isFavorite = this._dvm.threadsZvm.perspective.favorites.map((id) => id.b64).includes(this.hash.b64);
    const starButton = isFavorite? html`
        <ui5-button id="star-btn" icon="favorite" tooltip=${msg("Remove from favorites")} design="Transparent" style="border:none;"
                    @click=${(_e:any) => this.updateFavorite(this.hash, false)}></ui5-button>
        ` : html`
        <ui5-button id="star-btn" icon="add-favorite" tooltip=${msg("Add to favorite")} design="Transparent" style="border:none;"
                    @click="${async (_e:any) => {
                      await this.updateFavorite(this.hash, true);
                      console.log("Favorites", this._dvm.threadsZvm.perspective.favorites.length);
    }}"></ui5-button>
    `;

    let sideButtons = [menuButton];
    //console.log("<chat-item> shortmenu", this.shortmenu)
    if (!this.shortmenu) {
      sideButtons = [starButton, reactionButton, replyButton, commentButton, menuButton];
    }

    const date = new Date(beadInfo.creationTime / 1000); // Holochain timestamp is in micro-seconds, Date wants milliseconds
    const date_str = date.toLocaleString('en-US', {hour12: false});

    const maybeProfile = this._dvm.profilesZvm.perspective.getProfile(beadInfo.author);
    const agentName = maybeProfile? maybeProfile.nickname : "unknown";


    /** render all */
    return html`
      <div id="innerChatItem">
        <!-- Vine row -->
        ${hidemeta? html`` : this.renderTopVine(beadInfo)}
        <!-- main horizontal div (row) -->
        <div id=${"chat-item__" + this.hash.b64} class="chatItem"
             @mouseenter=${(_e:any) => {
                 const popover = this.shadowRoot!.getElementById("buttonsPop") as Popover;
                 const anchor = this.shadowRoot!.getElementById("nameEnd") as HTMLElement;
                 if (popover && anchor) {
                     popover.showAt(anchor);
                 }
              }}
             @mouseleave=${(_e:any) => {
               const popover = this.shadowRoot!.getElementById("buttonsPop") as Popover;
                 if (popover) {
                   popover.close();
                 }
             }}>
            <!-- avatar column -->
            <div id="avatarColumn" style="display: flex; flex-direction: column; width:48px;"
                    @click=${(e:any) => {
                      e.stopPropagation();
                      this.dispatchEvent(new CustomEvent<ShowProfileEvent>('show-profile', {detail: {agentId: beadInfo.author, x: e.clientX, y: e.clientY}, bubbles: true, composed: true}));
                    }}>
              ${hidemeta? html`` : renderAvatar(this._dvm.profilesZvm, beadInfo.author, "S")}
              <div style="display: flex; flex-direction: row; flex-grow: 1; margin-top:1px;">
                  <div style="flex-grow:1;"></div>
                  <div class="vine"></div>
              </div>
            </div>
            <!-- message column -->
            <div style="display:flex; flex-direction:column; gap:0px; flex-grow:1;overflow:auto">
                <div id="nameRow" style="display:flex; flex-direction:row; align-items: flex-end">
                    ${hidemeta? html`` : html`
                        <span id="agentName">${agentName}</span>
                        <span class="chatDate"> ${date_str}</span>
                    `}
                    <span style="flex-grow: 1"></span>
                    <span id="nameEnd" style="width:10px"></span>
                </div>
                ${item}
                <emoji-bar .hash=${this.hash}></emoji-bar>
            </div>
            <!-- Popovers -->
            <ui5-popover id="buttonsPop" hide-arrow allow-target-overlap placement-type="Left" style="min-width: 0px;">${sideButtons}</ui5-popover>
            <ui5-popover id="emojiPopover" header-text=${msg("Add Reaction")}>
                <emoji-picker class="light" style="display: block"
                              @emoji-click=${(event: any) => {
                                  const unicode = event?.detail?.unicode
                                  console.log("emoji-click: " + unicode)
                                  if (unicode) {
                                      this._dvm.publishEmoji(this.hash, unicode);
                                  }
                                  const popover = this.shadowRoot!.getElementById("emojiPopover") as Popover;
                                  if (popover.isOpen()) {
                                      popover.close();
                                  }
                              }}></emoji-picker>
            </ui5-popover>
            <ui5-menu id="moreMenu" @item-click=${this.onMoreMenu}>
                <ui5-menu-item id="addReaction" icon="feedback" text=${msg("Add Reaction")} ></ui5-menu-item>
                ${isFavorite
                        ? html`<ui5-menu-item id="removeFavorite" icon="favorite" text=${msg("Remove from favorites")}></ui5-menu-item>`
                        : html`<ui5-menu-item id="addFavorite" icon="add-favorite" text=${msg("Add to favorite")}></ui5-menu-item>`
                }
                ${hasComments
                        ? html`<ui5-menu-item id="viewComments" icon="discussion" text=${msg("View comment thread")} ></ui5-menu-item>`
                        : html`<ui5-menu-item id="createCommentThread" icon="sys-add" text=${msg("Create new comment thread")}></ui5-menu-item>`
                }
                <ui5-menu-item id="intoHrl" icon="chain-link" text=${msg("Copy Message Link")}></ui5-menu-item>
                ${downloadItem}
                <ui5-menu-item id="flagMessage" disabled icon="flag" text=${msg("Report Message")}></ui5-menu-item>

            </ui5-menu>
        </div>

        <!-- Reply row -->
        <div id="replyRow" style="display:flex; flex-direction:row; min-height: ${hasComments? "36px" : "0px"};">
            <div id="bottomLeft" style="display: flex; flex-direction: column;;">
                <div style="display: flex; flex-direction: row; flex-grow:1;">
                  <!-- split in middle horizontal -->
                  <div style="flex-grow:1;"></div>
                  <div class="vine  ${maybeCommentThread? "bordered" : ""}"></div>
                </div>
                <div style="display: flex; flex-direction: row; flex-grow:1;">
                    <!-- split in middle horizontal -->
                    <div style="flex-grow:1;"></div>
                    <div class="vine"></div>
                </div>
            </div>
            <div style="display:flex; flex-direction:row;">
                ${commentThread}
            </div>
        </div>
      </div>
    `;

  }

  /** */
  static override get styles() {
    return [
      css`
        :host {
          max-width:100%;
        }
        #avatarColumn:hover {
          cursor: pointer;
        }
        #buttonsPop::part(content) {
          padding: 0px;
        }
        .hovered {
          background: #d8e2f6;
        }

        #innerChatItem:hover {
          background: #d8e2f6;
        }

        #agentName {
          font-family: "72";
          font-weight: bold;
          color: rgba(38, 38, 38, 0.89);
        }

        #bottomLeft {
          width: 58px;
        }

        .topVine {
          display: flex;
          flex-direction: row;
          min-height: 15px;
          width: 58px;
          margin-bottom: 1px;
        }

        #prevAuthor {
          font-weight: bold
        }
        
        #prevAuthor:hover {
          text-decoration: underline;
          cursor: pointer;
        }

        #prevBeadName {
          flex-grow: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        #prevBeadName:hover {
          color: black;
          cursor: pointer;
        }
        
        .vine {
          flex-grow: 1;
          border-left: 2px solid rgb(108, 176, 70); /*#939393;*/
        }

        .replyVine {
          border-top: 2px solid rgb(108, 176, 70); /*#939393;*/
          border-top-left-radius: 10px;
        }
        
        .bordered {
          /*border-left: 2px solid #939393;*/
          border-bottom: 2px solid rgb(108, 176, 70); /*#939393;*/
          border-bottom-left-radius: 10px;
        }

        emoji-bar {
          margin-bottom: 5px;
          /*margin-top:5px;*/
        }

        .innerItem {
          margin-top: 5px;
          margin-bottom: 10px;
        }
        
        .chatItem {
          display: flex;
          flex-direction: row;
          gap: 18px;
          /*min-height: 55px;*/
          margin: 0px 5px 0px 5px;
          overflow: auto;
        }

        .chatAvatar {
          margin: 2px 0px 0px 2px;
          box-shadow: rgba(25, 74, 3, 0.98) 1px 1px 1px 1px;
          outline: #4a7b57 solid 2px;
        }

        .replyAvatar {
          margin: 0px -7px 0px -5px;
          transform: scale(0.6);
          outline: #4a7b57 solid 1px;
        }
        
        .chatDate {
          margin: 0px 0px 0px 10px;
          font-size: 12px;
          color: gray;
        }

        .thread-link {
          cursor: pointer;
          padding-top: 7px;
          margin-left: 5px;
        }
      `,];
  }
}
