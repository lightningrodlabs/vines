import {html, css, PropertyValues} from "lit";
import {customElement, property, state} from "lit/decorators.js";
import {msg} from "@lit/localize";
import {consume} from "@lit/context";
import {ActionHashB64, decodeHashFromBase64} from "@holochain/client";
import {DnaElement} from "@ddd-qc/lit-happ";
import {ThreadsDvm} from "../viewModels/threads.dvm";
import {BeadInfo, ThreadsPerspective} from "../viewModels/threads.perspective";
import 'emoji-picker-element';

import {renderAvatar, renderProfileAvatar} from "../render";
import {ThreadsEntryType} from "../bindings/threads.types";
import {beadJumpEvent, threadJumpEvent} from "../jump";
import {globaFilesContext, onlineLoadedContext, weClientContext} from "../contexts";
import {WeServicesEx} from "@ddd-qc/we-utils";
import {Hrl, weaveUrlFromWal} from "@lightningrodlabs/we-applet";
import {FilesDvm} from "@ddd-qc/files";

import Menu from "@ui5/webcomponents/dist/Menu";
import Button from "@ui5/webcomponents/dist/Button";
import Popover from "@ui5/webcomponents/dist/Popover";

import {toasty} from "../toast";
import {popoverStyleTemplate} from "../styles";
import {determineBeadName} from "../utils";
import {Profile as ProfileMat} from "@ddd-qc/profiles-dvm/dist/bindings/profiles.types";


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
  @property() hash: ActionHashB64 = ''

  @property() prevBeadAh: ActionHashB64 = ''

  @property({type: Boolean}) shortmenu: boolean = false;

  /** Observed perspective from zvm */
  @property({type: Object, attribute: false, hasChanged: (_v, _old) => true})
  threadsPerspective!: ThreadsPerspective;

  @consume({ context: weClientContext, subscribe: true })
  weServices: WeServicesEx;

  @consume({ context: globaFilesContext, subscribe: true })
  _filesDvm!: FilesDvm;


  @consume({ context: onlineLoadedContext, subscribe: true })
  onlineLoaded!: boolean;


  /**
   * In dvmUpdated() this._dvm is not already set!
   * Subscribe to ThreadsZvm
   */
  protected async dvmUpdated(newDvm: ThreadsDvm, oldDvm?: ThreadsDvm): Promise<void> {
    //console.log("<chat-item>.dvmUpdated()");
    if (oldDvm) {
      //console.log("\t Unsubscribed to threadsZvm's roleName = ", oldDvm.threadsZvm.cell.name)
      oldDvm.threadsZvm.unsubscribe(this);
    }
    newDvm.threadsZvm.subscribe(this, 'threadsPerspective');
    //console.log("\t Subscribed threadsZvm's roleName = ", newDvm.threadsZvm.cell.name)
  }


  // /** */
  // protected async updated(_changedProperties: PropertyValues) {
  //   // try {
  //   //   const childElements = this.shadowRoot.querySelectorAll('*');
  //   //   console.log({childElements}); // This will log all child elements of the shadowRoot
  //   //   childElements.forEach(async(childElement) => {
  //   //     const chatItem = childElement as ChatMessageItem;
  //   //     await chatItem.updateComplete;
  //   //   });
  //   //   console.log("ChatView.updated2() ", this.chatElem.scrollTop, this.chatElem.scrollHeight, this.chatElem.clientHeight)
  //   // } catch(e) {
  //   //   // element not present
  //   //   //this.requestUpdate();
  //   // }
  // }
  //
  //
  // /** */
  // async getUpdateComplete(): Promise<boolean> {
  //   //console.log("ChatView.msg.getUpdateComplete()")
  //   const superOk = await super.getUpdateComplete();
  //   //const childOk = await this.chatElem.updateComplete;
  //   // const childElements = this.shadowRoot.querySelectorAll('*');
  //   // console.log("ChatView.msg children", childElements); // This will log all child elements of the shadowRoot
  //   // childElements.forEach(async(childElement) => {
  //   //   const chatItem = childElement// as ChatMessageItem;
  //   //   //await chatItem.updateComplete;
  //   //   console.log("ChatView.msg child height", /*chatItem.offsetHeight,*/ chatItem.scrollHeight, chatItem.clientHeight, chatItem);
  //   // });
  //   return superOk /*&& childOk*/;
  // }


  /** Probe bead and its reactions */
  protected firstUpdated(_changedProperties: PropertyValues) {
    super.firstUpdated(_changedProperties);
    this.loadBead();
  }


  /** */
  private async loadBead() {
    const beadInfo = this._dvm.threadsZvm.getBeadInfo(this.hash);
    if (!beadInfo) {
      await this._dvm.threadsZvm.fetchUnknownBead(this.hash);
    }
    await this._dvm.threadsZvm.probeEmojiReactions(this.hash);
  }


  /** */
  protected willUpdate(changedProperties: PropertyValues<this>) {
    super.willUpdate(changedProperties);
    //console.log("<chat-item>.willUpdate()", changedProperties, !!this._dvm, this.hash);
    if (this._dvm && (changedProperties.has("hash"))) {
      this.loadBead();
    }
  }


  /** */
  protected async updated(_changedProperties: PropertyValues) {
    /** Fiddle with shadow CSS */
    const popover = this.shadowRoot.getElementById("buttonsPop") as Popover;
    if (popover) {
      popover.shadowRoot.appendChild(popoverStyleTemplate.content.cloneNode(true));
    }
  }


  /** */
  onClickComment(maybeCommentThread: ActionHashB64 | null, subjectName?: string, subjectType?: string, viewType?: string) {
    this.dispatchEvent(new CustomEvent('commenting-clicked', {
      detail: {maybeCommentThread, subjectHash: this.hash, subjectType, subjectName, viewType: viewType? viewType : "side"},
      bubbles: true,
      composed: true,
    }));
  }


  /** */
  onClickReply() {
    this.dispatchEvent(new CustomEvent('reply-clicked', {detail: this.hash, bubbles: true, composed: true,}));
  }

  /** */
  onClickAddEmoji() {
    const popover = this.shadowRoot.getElementById("emojiPopover") as Popover;
    const btn = this.shadowRoot.getElementById("buttonsPop") as HTMLElement;
    popover.showAt(btn);
  }



  /** */
  onMoreMenu(e) {
    console.log("onMoreMenu item-click", e)
    switch (e.detail.item.id) {
      case "addReaction": this.onClickAddEmoji(); break;
      case "addFavorite": this.updateFavorite(this.hash, true); break;
      case "removeFavorite": this.updateFavorite(this.hash, false); break;
      case "viewComments":
      case "createCommentThread":
        const maybeCommentThread = this._dvm.threadsZvm.getCommentThreadForSubject(this.hash);
        const beadInfo = this._dvm.threadsZvm.getBaseBeadInfo(this.hash);
        const typed = this._dvm.threadsZvm.getBaseBead(this.hash);
        const beadName = determineBeadName(beadInfo.beadType, typed, this._filesDvm, this.weServices);
        this.onClickComment(maybeCommentThread, beadName, beadInfo.beadType, "side");
      break;
      case "intoHrl":
        const hrl: Hrl = [decodeHashFromBase64(this.cell.dnaHash), decodeHashFromBase64(this.hash)];
        const wurl = weaveUrlFromWal({hrl});
        navigator.clipboard.writeText(wurl);
        if (this.weServices) {
          this.weServices.walToPocket({hrl});
        }
        toasty(("Copied Message's WAL to clipboard"));
      break;
      case "copyText": /* TODO */break;
      case "flagMessage": /* TODO */  break;
    }
  }



  async updateFavorite(beadAh: ActionHashB64, canAdd: boolean) {
    if (canAdd) {
      await this._dvm.threadsZvm.addFavorite(beadAh);
      toasty("Message added to favorites");
    } else {
      await this._dvm.threadsZvm.removeFavorite(beadAh);
      toasty("Message removed from favorites");
    }
  }


  /** */
  renderTopVine(beadInfo: BeadInfo) {
    const hasFarPrev = beadInfo.bead.prevBeadAh != beadInfo.bead.ppAh && beadInfo.bead.prevBeadAh != this.prevBeadAh && this.prevBeadAh != '';
    const prevBeadInfo = this._dvm.threadsZvm.getBaseBeadInfo(beadInfo.bead.prevBeadAh);
    if (!prevBeadInfo) {
      return html``;
    }
    const prevBead = this._dvm.threadsZvm.getBaseBead(beadInfo.bead.prevBeadAh);
    let prevProfile: ProfileMat = {nickname: "unknown", fields: {lang: "en"}} as ProfileMat;
    if (prevBeadInfo) {
      prevProfile = this._dvm.profilesZvm.perspective.profiles[prevBeadInfo.author];
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
               @click=${(e) => {
                  e.stopPropagation();
                  this.dispatchEvent(new CustomEvent('show-profile', {detail: {agent: prevBeadInfo.author, x: e.clientX, y: e.clientY}, bubbles: true, composed: true}));}}>
            @${prevProfile? prevProfile.nickname : "unknown"}
          </div>
          <div id="prevBeadName"               
               @click=${(e) => {e.stopPropagation();this.dispatchEvent(beadJumpEvent(beadInfo.bead.prevBeadAh))}}>
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
  render() {
    console.log("<chat-item>.render()", this.hash, !!this._filesDvm, !!this.weServices, !!this.threadsPerspective);
    if (this.hash == "") {
      return html`<div>No bead selected</div>`;
    }
    const beadInfo = this._dvm.threadsZvm.getBaseBeadInfo(this.hash);
    if (!beadInfo) {
      return html`<ui5-busy-indicator delay="0" size="Medium" active style="margin:auto; width:100%; height:100%;"></ui5-busy-indicator>`;
    }
    const typed = this._dvm.threadsZvm.getBaseBead(this.hash);
    /** Determine the comment button to display depending on current comments for this message */
    let beadAsSubjectName = determineBeadName(beadInfo.beadType, typed, this._filesDvm, this.weServices);
    let item = html``;
    if (beadInfo.beadType == ThreadsEntryType.TextBead) {
      item = html`<chat-text class="innerItem" .hash=${this.hash}></chat-text>`;
    }
    if (beadInfo.beadType == ThreadsEntryType.EntryBead) {
      item = html`<chat-file class="innerItem" .hash=${this.hash}></chat-file>`;
    }
    if (beadInfo.beadType == ThreadsEntryType.AnyBead) {
      item = html`<chat-wal class="innerItem" .hash=${this.hash}></chat-wal>`;
    }

    const maybeCommentThread = this._dvm.threadsZvm.getCommentThreadForSubject(this.hash);

    //let isUnread = false;
    let commentThread = html``;
    let commentButton = html`
        <ui5-button icon="sys-add" tooltip=${msg("Create comment Thread for this message")} design="Transparent" style="border:none;"
                      @click="${(_e) => this.onClickComment(maybeCommentThread, beadAsSubjectName, beadInfo.beadType, "side")}">                      
        </ui5-button>`;
    const hasComments = maybeCommentThread && this.threadsPerspective.threads.get(maybeCommentThread);
    if (hasComments) {
      commentButton = html`              
          <ui5-button icon="discussion" tooltip=${msg("View comments on the side")} design="Transparent" style="border:none;"
                       @click="${(_e) => this.onClickComment(maybeCommentThread, beadAsSubjectName, beadInfo.beadType, "side")}">
          </ui5-button>`;
      const isUnread = Object.keys(this.threadsPerspective.unreadThreads).includes(maybeCommentThread);
      const commentLinkColor = isUnread ? "red" : "blue";
      const thread = this.threadsPerspective.threads.get(maybeCommentThread);
      const threadAvatar = renderAvatar(this._dvm.profilesZvm, thread.author, "XS");
      if (thread.beadLinksTree.length > 0) {
        /** Grab all authors */
        let authors = {};
        for (const bead of thread.beadLinksTree.values) {
          const beadInfo = this._dvm.threadsZvm.getBeadInfo(bead.beadAh);
          if (!beadInfo) {
            console.warn("Bead not found in <chat-item>.render()", bead.beadAh);
            continue;
          }
          if (!authors[beadInfo.author]) {
            authors[beadInfo.author] = 0;
          }
          authors[beadInfo.author] += 1;
        }
        /** Create avatar for each author */
          //console.log("Authors' Avatar", Object.keys(authors).length);
        let avatars = Object.keys(authors).map((author) => {
            return renderAvatar(this._dvm.profilesZvm, author, "XS");
          });
        const avatarGroup = avatars.length > 1 ? html`
            <ui5-avatar-group type="Group" style="width: auto">${avatars}</ui5-avatar-group>` : html`${avatars}`;
        commentThread = html`
                ${avatarGroup}
                <span class="thread-link" style="color: ${commentLinkColor}"
                      @click=${(_e) => this.dispatchEvent(threadJumpEvent(maybeCommentThread))}>
              ${thread.beadLinksTree.length > 1 ? "" + thread.beadLinksTree.length + " comments" : "" + thread.beadLinksTree.length + " comment"} 
            </span>
        `;
      } else {
        /** Display avatar of thread creator */
        commentThread = html`
                ${threadAvatar}
                <span class="thread-link" style="color: ${commentLinkColor}"
                      @click=${(_e) => this.dispatchEvent(threadJumpEvent(maybeCommentThread))}>
              view comments
            </span>
        `;
      }
    }

    //console.log("<chat-item>.render() maybeCommentThread", maybeCommentThread, commentThread);

    const menuButton = html`
        <ui5-button id="menu-btn" icon="overflow" tooltip=${msg('More')} design="Transparent" style="border:none;"
                    @click=${(e) => {
                        e.preventDefault(); e.stopPropagation();
                        //console.log("onSettingsMenu()", e);
                        const menu = this.shadowRoot.getElementById("moreMenu") as Menu;
                        const btn = this.shadowRoot.getElementById("menu-btn") as Button;
                        menu.showAt(btn);
                    }}></ui5-button>`;

    const replyButton = /*this.cell.agentPubKey == beadInfo.author? html`` :*/
      html`
        <ui5-button id="reply-btn" icon="response" tooltip=${msg('Reply')} design="Transparent" style="border:none;"
                    @click=${(_e) => this.onClickReply()}></ui5-button>`;

    const reactionButton = html`
              <ui5-button id="add-reaction-btn" icon="feedback" tooltip=${msg('Add Reaction')} design="Transparent" style="border:none;"
                          @click=${(_e) => this.onClickAddEmoji()}></ui5-button>`;

    const isFavorite = this._dvm.threadsZvm.perspective.favorites.includes(this.hash);
    const starButton = isFavorite? html`
        <ui5-button id="star-btn" icon="favorite" tooltip=${msg("Remove from favorites")} design="Transparent" style="border:none;"
                    @click=${(_e) => this.updateFavorite(this.hash, false)}></ui5-button>
        ` : html`
        <ui5-button id="star-btn" icon="add-favorite" tooltip=${msg("Add to favorite")} design="Transparent" style="border:none;"
                    @click="${async (_e) => {
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

    const id = "chat-item__" + this.hash;

    const agentName = this._dvm.profilesZvm.perspective.profiles[beadInfo.author]? this._dvm.profilesZvm.perspective.profiles[beadInfo.author].nickname : "unknown";


    /** render all */
    return html`
      <div id="innerChatItem">
        <!-- Vine row -->
        ${this.renderTopVine(beadInfo)}
        <!-- main horizontal div (row) -->
        <div id=${id} class="chatItem"
             @mouseenter=${(e) => {
                 const popover = this.shadowRoot.getElementById("buttonsPop") as Popover;
                 const anchor = this.shadowRoot.getElementById("nameEnd") as HTMLElement;
                 popover.showAt(anchor);
              }}
             @mouseleave=${(e) => {
               const popover = this.shadowRoot.getElementById("buttonsPop") as Popover;
               popover.close();
             }}>
            <!-- avatar column -->
            <div id="avatarColumn" style="display: flex; flex-direction: column; width:48px;"
                    @click=${(e) => {
                      e.stopPropagation();
                      this.dispatchEvent(new CustomEvent('show-profile', {detail: {agent: beadInfo.author, x: e.clientX, y: e.clientY}, bubbles: true, composed: true}));}}>
              ${renderAvatar(this._dvm.profilesZvm, beadInfo.author, "S")}
              <div style="display: flex; flex-direction: row; flex-grow: 1; margin-top:1px;">
                  <div style="flex-grow:1;"></div>
                  <div class="vine"></div>
              </div>
            </div>
            <!-- message column -->
            <div style="display:flex; flex-direction:column; gap:0px; flex-grow:1;overflow:auto">
                <div id="nameRow" style="display:flex; flex-direction:row;">
                    <span id="agentName">${agentName}</span>
                    <span class="chatDate"> ${date_str}</span>
                    <span style="flex-grow: 1"></span>
                    <span id="nameEnd" style="width:10px"></span>
                </div>
                ${item}
                <emoji-bar .hash=${this.hash}></emoji-bar>
            </div>
            <!-- Popovers -->
            <ui5-popover id="buttonsPop" hide-arrow allow-target-overlap placement-type="Left" style="min-width: 0px;">${sideButtons}</ui5-popover>
            <ui5-popover id="emojiPopover" header-text="Add Reaction">
                <emoji-picker id="emoji-picker" class="light"
                              style="display: block"
                              @emoji-click=${(event) => {
                                  const unicode = event?.detail?.unicode
                                  console.log("emoji-click: " + unicode)
                                  if (unicode) {
                                      this._dvm.publishEmoji(this.hash, unicode);
                                  }
                                  const popover = this.shadowRoot.getElementById("emojiPopover") as Popover;
                                  if (popover.isOpen()) {
                                      popover.close();
                                  }
                              }}></emoji-picker>
            </ui5-popover>
            <ui5-menu id="moreMenu" @item-click=${this.onMoreMenu}>
                <ui5-menu-item id="addReaction" text=${msg("Add Reaction")} icon="feedback"></ui5-menu-item>
                ${isFavorite
                        ? html`<ui5-menu-item id="removeFavorite" icon="favorite" text=${msg("Remove from favorites")}></ui5-menu-item>`
                        : html`<ui5-menu-item id="addFavorite" icon="add-favorite" text=${msg("Add to favorite")}></ui5-menu-item>`
                }
                ${hasComments
                        ? html`<ui5-menu-item id="viewComments" icon="discussion" text=${msg("View comment Thread")} ></ui5-menu-item>`
                        : html`<ui5-menu-item id="createCommentThread" icon="sys-add" text=${msg("Create comment Thread")}></ui5-menu-item>`
                }
                <ui5-menu-item id="intoHrl" text=${msg("Copy Message Link")} icon="chain-link"></ui5-menu-item>
                <ui5-menu-item id="copyText" disabled text=${msg("Copy Text")} icon="copy"></ui5-menu-item>
                <ui5-menu-item id="flagMessage" disabled text=${msg("Report Message")} icon="flag"></ui5-menu-item>

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
  static get styles() {
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
          /*margin: 10px 5px 10px 5px;*/
          margin-top: 5px;
          margin-bottom: 10px;
        }

        .chatItem {
          display: flex;
          flex-direction: row;
          gap: 18px;
          min-height: 55px;
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
          margin: 0px 0px 0px 5px;
          font-size: smaller;
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
