import {html, css, PropertyValues} from "lit";
import {customElement, property} from "lit/decorators.js";
import {msg} from "@lit/localize";
import {consume} from "@lit/context";
import {ActionId, AgentId, delay, DnaElement} from "@ddd-qc/lit-happ";
import {ThreadsDvm} from "../../viewModels/threads.dvm";
import 'emoji-picker-element';

import {renderAvatar, renderProfileAvatar} from "../../render";
import {ThreadsEntryType} from "../../bindings/threads.types";
import {
  beadJumpEvent,
  threadJumpEvent,
  ShowProfileEvent,
  CommentRequest,
  favoritesEvent,
} from "../../events";
import {filesContext, onlineLoadedContext, weClientContext} from "../../contexts";
import {intoHrl, WeServicesEx} from "@ddd-qc/we-utils";
import {Hrl, weaveUrlToWAL} from "@theweave/api";
import {FilesDvm} from "@ddd-qc/files";

import Menu from "@ui5/webcomponents/dist/Menu";
import Button from "@ui5/webcomponents/dist/Button";
import Popover from "@ui5/webcomponents/dist/Popover";

import {toasty} from "../../toast";
//import {popoverStyleTemplate} from "../../styles";
import {determineBeadName} from "../../utils";
import {Profile as ProfileMat} from "@ddd-qc/profiles-dvm/dist/bindings/profiles.types";
import {ThreadsPerspective} from "../../viewModels/threads.perspective";
import {AnyBeadMat, BeadInfo, EntryBeadMat} from "../../viewModels/threads.materialize";
import {ChatTextEdit} from "./chat-text-edit";


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

  @property({type: Boolean}) assetview: boolean = false;

  @property({type: Boolean}) shortmenu: boolean = false;

  @property({type: Boolean}) nomenu: boolean = false;

  @property({type: Boolean}) canEdit: boolean = false;


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
      this.canEdit = false;
    }
  }


  /** */
  private async loadBead() {
    await this._dvm.threadsZvm.fetchUnknownBead(this.hash);
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
      case "addFavorite": this.dispatchEvent(favoritesEvent(this.hash, true)); break;
      case "removeFavorite": this.dispatchEvent(favoritesEvent(this.hash, false)); break;
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
        this.dispatchEvent(new CustomEvent<Hrl>("copy", {detail: hrl, bubbles: true, composed: true}));
      break;
      case "downloadItem": {
        const beadInfo = this._dvm.threadsZvm.perspective.getBaseBeadInfo(this.hash)!;
        if (beadInfo.beadType == ThreadsEntryType.TextBead) {
          let value = this._dvm.threadsZvm.perspective.getLatestEdit(this.hash);
          navigator.clipboard.writeText(value);
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
            this.weServices.assets.assetToPocket(wal);
          }
          toasty(msg("Copied WAL Link to clipboard"));
        }
      }
        break;
      case "flagMessage":
        this._dvm.threadsZvm.flagBead(this.hash).then(async () => {await delay(100); this.requestUpdate()});
        toasty(msg("Message has been flagged"));
        break;
    }
  }


  /** */
  renderTopVine(beadInfo: BeadInfo) {
    console.log("<chat-item>.renderTopVine()", this.prevBeadAh, beadInfo);
    const hasFarPrev = !beadInfo.bead.prevBeadAh.equals(beadInfo.bead.ppAh) && this.prevBeadAh && !beadInfo.bead.prevBeadAh.equals(this.prevBeadAh)
    const prevBeadInfo = this._dvm.threadsZvm.perspective.getBaseBeadInfo(beadInfo.bead.prevBeadAh);
    if (!prevBeadInfo) {
      return html`<div style="height: 5px;"></div>`;
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
    const beadInfo = this._dvm.threadsZvm.perspective.getBeadInfo(this.hash);
    const baseBeadInfo = this._dvm.threadsZvm.perspective.getBaseBeadInfo(this.hash);
    if (!beadInfo || !baseBeadInfo) {
      return html`<ui5-busy-indicator delay="0" size="Medium" active style="margin:auto; width:100%; height:100%;"></ui5-busy-indicator>`;
    }
    const isPersistent = this._dvm.threadsZvm.perspective.isPersistent(this.hash.b64);
    //const isPersistent = false;
    const canParticipate = this._dvm.threadsZvm.canParticipate(beadInfo.bead.ppAh, this.cell.address.agentId);
    const isEncrypted = beadInfo.beadType == ThreadsEntryType.EncryptedBead;
    const typed = this._dvm.threadsZvm.perspective.getBaseBead(this.hash)!;
    const isFlagged = this._dvm.threadsZvm.perspective.hasFlag(beadInfo.bead.ppAh, this.hash);
    //console.log("isFlagged", isFlagged, this.hash);
    /** hide if prevBead is closer than a minute and same author */
    let hidemeta = false;
    if (this.prevBeadAh) {
      const prevInfo = this._dvm.threadsZvm.perspective.getBaseBeadInfo(this.prevBeadAh);
      if (prevInfo) {
        const diff = baseBeadInfo.creationTime - prevInfo.creationTime;
        hidemeta = baseBeadInfo.author.equals(prevInfo.author) && diff < 60 * 1000 * 1000; // 60 secs
      }
    }
    let beadAsSubjectName = determineBeadName(baseBeadInfo.beadType, typed, this._filesDvm, this.weServices);
    let item = html``;
    let downloadItem = html``;
    const itemClass = hidemeta? "" : "innerItem";
    if (baseBeadInfo.beadType == ThreadsEntryType.TextBead) {
      if (!this.canEdit) {
        item = html`<chat-text class="${itemClass}" .hash=${this.hash}></chat-text>`;
      } else {
        item = html`<chat-text-edit id="text-edit" class="${itemClass}" .hash=${this.hash} 
                                    @edit-bead=${async(e: CustomEvent<string | null>) => {
                                      this.canEdit = false;
                                      ///*let ah =*/ await this._dvm.publishMessage(ThreadsEntryType.TextBead, e.detail, beadInfo.bead.ppAh, undefined, undefined, this.weServices);
                                        if (e.detail) {
                                          await this._dvm.threadsZvm.editMyTextBead(this.hash, e.detail);
                                        }
                                  }}
        ></chat-text-edit>`;
      }
      downloadItem = html`<ui5-menu-item id="downloadItem" icon="copy" text=${msg("Copy Text")}></ui5-menu-item>`;
    }
    if (baseBeadInfo.beadType == ThreadsEntryType.EntryBead) {
      item = html`<chat-file class="${itemClass}" .hash=${this.hash.b64}></chat-file>`;
      downloadItem = html`<ui5-menu-item id="downloadItem" icon="download" text=${msg("Download File")}></ui5-menu-item>`;
    }
    if (baseBeadInfo.beadType == ThreadsEntryType.AnyBead) {
      item = html`<chat-wal class="${itemClass}" .hash=${this.hash}></chat-wal>`;
      downloadItem = this.weServices
        ? html`<ui5-menu-item id="downloadItem" text=${msg("Add WAL to Pocket")}></ui5-menu-item>`
        : html`<ui5-menu-item id="downloadItem" icon="chain-link" text=${msg("Copy WAL Link")}></ui5-menu-item>`;
    }
    /** Determine the comment button to display depending on current comments for this message */
    const maybeCommentThread = this._dvm.threadsZvm.perspective.getCommentThreadForSubject(this.hash);
    let commentThread = html``;
    let commentButton = html`
        <ui5-button icon="sys-add" tooltip=${msg("Create comment thread for this message")} design="Transparent" style="border:none;"
                      @click="${(_e:any) => this.onClickComment(maybeCommentThread, beadAsSubjectName, baseBeadInfo.beadType, "side")}">                      
        </ui5-button>`;
    const hasComments = maybeCommentThread && this.threadsPerspective.threads.get(maybeCommentThread);
    if (hasComments) {
      commentButton = html`              
          <ui5-button icon="discussion" tooltip=${msg("View comments on the side")} design="Transparent" style="border:none;"
                       @click="${(_e:any) => this.onClickComment(maybeCommentThread, beadAsSubjectName, baseBeadInfo.beadType, "side")}">
          </ui5-button>`;
      const isUnread = this.threadsPerspective.unreads.has(maybeCommentThread);
      const commentLinkColor = isUnread ? "#33A000" : "#2C74FF";
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
            return renderAvatar(this._dvm.profilesZvm, new AgentId(author), "XS", "");
          });

        const avatarGroup = Object.keys(authors).length > 1
          ? html`<ui5-avatar-group type="Group" style="width: auto">${avatars}</ui5-avatar-group>`
          : html`${avatars}`;

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
              ${msg("view comments")}
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
                    @click=${(_e:any) => this.dispatchEvent(favoritesEvent(this.hash, false))}></ui5-button>
        ` : html`
        <ui5-button id="star-btn" icon="add-favorite" tooltip=${msg("Add to favorite")} design="Transparent" style="border:none;"
                    @click="${(_e:any) => {
                      this.dispatchEvent(favoritesEvent(this.hash, true));
                      console.log("Favorites", this._dvm.threadsZvm.perspective.favorites.length);
    }}"></ui5-button>
    `;

    let sideButtons = [menuButton];
    //console.log("<chat-item> shortmenu", this.shortmenu)
    if (!this.shortmenu) {
      sideButtons = [starButton, reactionButton, replyButton, commentButton, menuButton];
      if (!isEncrypted && baseBeadInfo.beadType == ThreadsEntryType.TextBead && baseBeadInfo.author.equals(this.cell.address.agentId)) {
        sideButtons.unshift(html`
            <ui5-button id="star-btn" icon="edit" tooltip=${msg("Edit")} design="Transparent" style="border:none;"
                        @click=${(_e:any) => this.canEdit = true}></ui5-button>
        `);
      }
    }

    const timeZone = this._dvm.profilesZvm.getMyProfile()!.fields['timezone']!;
    const date = new Date(baseBeadInfo.creationTime / 1000); // Holochain timestamp is in micro-seconds, Date wants milliseconds
    const date_str = date.toLocaleString('en-US', {hour12: false, timeZone });
    const time_str = date.getHours().toString().padStart(2, '0').slice(-2) + ":" + date.getMinutes().toString().padStart(2, '0').slice(-2);

    const maybeProfile = this._dvm.profilesZvm.perspective.getProfile(baseBeadInfo.author);
    const agentName = maybeProfile? maybeProfile.nickname : "unknown";


    /** render all */
    return html`
      <div id="innerChatItem" style="position: relative; ${isFlagged? "background: #fbc6c6" : ""}">
        ${isPersistent? html`` : html`<div class="grey-veil"></div>`}
        <!-- Vine row -->
        ${hidemeta? html`` : this.renderTopVine(baseBeadInfo)}
        <!-- main horizontal div (row) -->
        <div id=${"chat-item__" + this.hash.b64} class="chatItem"
             @mouseenter=${(_e:any) => {
                 const popover = this.shadowRoot!.getElementById("buttonsPop") as HTMLElement;
                 if (popover) {
                     popover.style.display = "block";
                 }
              }}
             @mouseleave=${(_e:any) => {
               const popover = this.shadowRoot!.getElementById("buttonsPop") as HTMLElement;
               if (popover) {
                 popover.style.display = "none";
               }
             }}>
            <!-- avatar column -->
            <div id="avatarColumn" style="display: flex; flex-direction: column; min-width:48px;"
                    @click=${(e:any) => {
                      e.stopPropagation();
                      this.dispatchEvent(new CustomEvent<ShowProfileEvent>('show-profile', {detail: {agentId: baseBeadInfo.author, x: e.clientX, y: e.clientY}, bubbles: true, composed: true}));
                    }}>
              ${hidemeta? html`` : renderAvatar(this._dvm.profilesZvm, baseBeadInfo.author, "S")}
              <div style="display: flex; flex-direction: row; flex-grow: 1; margin-top:1px; position: relative;">
                  <div class="${hidemeta? "no-minutes":"minutes"}" style="position: absolute;">${time_str}</div>
                  <div style="flex-grow:1;"></div>
                  <div class="vine"></div>
              </div>
            </div>
            <!-- message column -->
            <div style="display:flex; flex-direction:column; gap:0px; flex-grow:1;overflow:auto; position: relative">
                <div id="nameRow" style="display:flex; flex-direction:row; align-items: flex-end">
                    ${hidemeta? html`` : html`
                        <span id="agentName">${agentName}</span>
                        <span class="chatDate"> ${date_str}</span>
                    `}
                    <span style="flex-grow: 1"></span>
                    <span id="nameEnd" style="width:10px"></span>
                </div>
                ${item}
                ${this.canEdit? html`<div style="font-size: small; margin-top:-2px; margin-bottom:5px">
                    ${msg("escape to")} <span class="linky" @click=${() => this.canEdit = false}>${msg("cancel")}</span> • ${msg("enter to")} <span class="linky" @click=${async() => {
                      this.canEdit = false;
                      const elem = this.shadowRoot!.getElementById("text-edit") as ChatTextEdit;
                    /*let ah =*/ await this._dvm.threadsZvm.editMyTextBead(this.hash, elem.value);
                }}>${msg("save")}</span>
                </div>`: html``}
                <emoji-bar .hash=${this.hash}></emoji-bar>
            </div>
            <!-- Popovers -->
            ${this.nomenu || !isPersistent || !canParticipate ? html`` : html`<div id="buttonsPop">${sideButtons}</div>`}
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
                        : html`<ui5-menu-item id="addFavorite" icon="add-favorite" text=${msg("Add to favorite")}></ui5-menu-item>`}
                ${hasComments
                        ? html`<ui5-menu-item id="viewComments" icon="discussion" text=${msg("View comment thread")} ></ui5-menu-item>`
                        : html`<ui5-menu-item id="createCommentThread" icon="sys-add" text=${msg("Create new comment thread")}></ui5-menu-item>`}
                ${this.weServices
                      ? html`<ui5-menu-item id="intoHrl" text=${msg("Add Message to Pocket")}></ui5-menu-item>`
                      : html`<ui5-menu-item id="intoHrl" icon="chain-link" text=${msg("Copy Message Link")}></ui5-menu-item>`}
                ${downloadItem}
                <ui5-menu-item id="flagMessage" ?disabled=${!this._dvm.threadsZvm.isSelfModerator(beadInfo.bead.ppAh) || isFlagged} icon="flag" text=${msg("Report Message")}></ui5-menu-item>

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
    //const VINE_COLOR = "rgb(108, 176, 70)";
    return [
      css`
        :host {
          max-width: 100%;
        }

        #avatarColumn:hover {
          cursor: pointer;
        }

        #buttonsPop {
          padding: 1px 2px 1px 2px;
          border-radius: 8px;
          border: 1px solid #29538a;
          display: none;
          background: rgba(255, 255, 255, 0.95);
          position: absolute;
          top: 5px;
          right: 5px;
        }

        #agentName {
          font-family: "72";
          font-weight: bold;
          color: rgba(38, 38, 38, 0.9);
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
          border-left: 2px solid rgba(227, 227, 227, 0.49); /*#939393;*/
        }

        .replyVine {
          border-top: 2px solid rgba(185, 185, 185, 0.41); /*#939393;*/
          border-top-left-radius: 10px;
        }

        .bordered {
          /*border-left: 2px solid #939393;*/
          border-bottom: 2px solid rgba(185, 185, 185, 0.41); /*#939393;*/
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

        .grey-veil {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(222, 222, 222, 0.33);
          z-index: 800;
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
          /*box-shadow: rgba(25, 74, 3, 0.98) 1px 1px 1px 1px;*/
          /*outline: #4a7b57 solid 2px;*/
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

        .linky {
          color: blue;
        }

        .linky:hover {
          text-decoration: underline;
          cursor: pointer;
        }

        .no-minutes {
          padding-left: 10px;
          font-size: 0px;
          color: grey;
          padding-top: 1px;
        }

        .chatItem:hover .no-minutes {
          font-size: 12px;
        }

        .minutes {
          font-size: 0px;
        }
      `,];
  }
}
