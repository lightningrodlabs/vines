import {html, css, PropertyValues} from "lit";
import {customElement, property, state} from "lit/decorators.js";
import {msg} from "@lit/localize";
import {consume} from "@lit/context";
import {ActionHashB64, decodeHashFromBase64, encodeHashToBase64} from "@holochain/client";
import {DnaElement} from "@ddd-qc/lit-happ";
import {ThreadsDvm} from "../viewModels/threads.dvm";
import {ThreadsPerspective} from "../viewModels/threads.perspective";
import 'emoji-picker-element';

import {renderAvatar} from "../render";
import {threadJumpEvent} from "../jump";
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


/**
 * @element
 */
@customElement("post-item")
export class PostItem extends DnaElement<unknown, ThreadsDvm> {

  constructor() {
    super(ThreadsDvm.DEFAULT_BASE_ROLE_NAME)
  }


  /** -- Properties -- */

  /** Hash of bead to display */
  @property() hash: ActionHashB64 = ''


  /** Observed perspective from zvm */
  @property({type: Object, attribute: false, hasChanged: (_v, _old) => true})
  threadsPerspective!: ThreadsPerspective;

  @consume({ context: weClientContext, subscribe: true })
  weServices: WeServicesEx;

  @consume({ context: globaFilesContext, subscribe: true })
  _filesDvm!: FilesDvm;

  @consume({ context: onlineLoadedContext, subscribe: true })
  onlineLoaded!: boolean;

  @state() private _loading = true;


  /**
   * In dvmUpdated() this._dvm is not already set!
   * Subscribe to ThreadsZvm
   */
  protected async dvmUpdated(newDvm: ThreadsDvm, oldDvm?: ThreadsDvm): Promise<void> {
    //console.log("<post-item>.dvmUpdated()");
    if (oldDvm) {
      //console.log("\t Unsubscribed to threadsZvm's roleName = ", oldDvm.threadsZvm.cell.name)
      oldDvm.threadsZvm.unsubscribe(this);
    }
    newDvm.threadsZvm.subscribe(this, 'threadsPerspective');
    //console.log("\t Subscribed threadsZvm's roleName = ", newDvm.threadsZvm.cell.name)
  }


  /** Probe bead and its reactions */
  protected firstUpdated(_changedProperties: PropertyValues) {
    super.firstUpdated(_changedProperties);
    this.loadPost();
  }


  /** */
  private async loadPost() {
    let thread = this.threadsPerspective.threads[this.hash];
    if (!thread) {
      await this._dvm.threadsZvm.fetchPp(this.hash);
      thread = this.threadsPerspective.threads[this.hash];
      if (!thread) {
        console.error("Thread not found");
        return;
      }
    }
    const blms = await this._dvm.threadsZvm.probeAllBeads(this.hash);
    if (blms.length == 0) {
      console.error("Thread has no beads");
      return;
    }
    const beadInfo = this._dvm.threadsZvm.getBeadInfo(encodeHashToBase64(blms[0].beadAh));
    if (!beadInfo) {
      await this._dvm.threadsZvm.fetchUnknownBead(decodeHashFromBase64(this.hash), false);
    }
    await this._dvm.threadsZvm.probeEmojiReactions(this.hash);
    this._loading = false;
  }


  /** */
  protected willUpdate(changedProperties: PropertyValues<this>) {
    super.willUpdate(changedProperties);
    //console.log("<post-item>.willUpdate()", changedProperties, !!this._dvm, this.hash);
    if (this._dvm && (changedProperties.has("hash"))) {
      this._loading = true;
      this.loadPost();
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
        const beadInfo = this._dvm.threadsZvm.getBeadInfo(this.hash);
        const typed = this._dvm.threadsZvm.getBead(this.hash);
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
      toasty("Message removed to favorites");
    }
  }



  /** */
  render() {
    console.log("<post-item>.render()", this.hash, !!this._filesDvm, !!this.weServices, !!this.threadsPerspective);
    if (this.hash == "") {
      return html`<div>No thread selected</div>`;
    }
    const thread = this.threadsPerspective.threads.get(this.hash);
    const first = thread.getFirst(1)[0];
    const beadInfo = this._dvm.threadsZvm.getBeadInfo(first.beadAh);
    if (!beadInfo) {
      return html`<div>Unknown bead hash</div>`;
    }
    //const typed = this._dvm.threadsZvm.getBead(first.beadAh);
    /** Determine the comment button to display depending on current comments for this message */
    let postContent = html`<chat-text class="contentItem" .hash=${this.hash}></chat-text>`;

    let comments = thread.beadLinksTree.values;


    const menuButton = html`
        <ui5-button id="menu-btn" icon="overflow" tooltip=${msg('More')} design="Transparent" style="border:none;"
                    @click=${(e) => {
                        e.preventDefault(); e.stopPropagation();
                        //console.log("onSettingsMenu()", e);
                        const menu = this.shadowRoot.getElementById("moreMenu") as Menu;
                        const btn = this.shadowRoot.getElementById("menu-btn") as Button;
                        menu.showAt(btn);
                    }}></ui5-button>`;

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

    let sideButtons= [starButton, menuButton];

    const date = new Date(beadInfo.creationTime / 1000); // Holochain timestamp is in micro-seconds, Date wants milliseconds
    const date_str = date.toLocaleString('en-US', {hour12: false});

    const id = "post-item__" + this.hash;

    const agentName = this._dvm.profilesZvm.perspective.profiles[beadInfo.author]? this._dvm.profilesZvm.perspective.profiles[beadInfo.author].nickname : "unknown";

    const hasComments = false;  // FIXE

    /** render all */
    return html`
      <div id="innerPostItem">
        <!-- Top horizontal div (row) -->
        <div id="titleRow">
          <!-- Avatar column -->
          <div id="avatarColumn" style="width:48px;"
                  @click=${(e) => {
                    e.stopPropagation();
                    this.dispatchEvent(new CustomEvent('show-profile', {detail: {agent: beadInfo.author, x: e.clientX, y: e.clientY}, bubbles: true, composed: true}));}}>
            ${renderAvatar(this._dvm.profilesZvm, beadInfo.author, "S")}
          </div>
          <!-- Info column -->
          <div style="display:flex; flex-direction:column; gap:0px; flex-grow:1;overflow:auto">
                  <span id="agentName">${agentName}</span>
                  <span class="chatDate"> ${date_str}</span>
          </div>
          <!-- padding -->
          <div style="flex-grow:1"></div>
          <!-- menu buttons column -->
          <div>
              ${sideButtons}
          </div>
        </div>
        <!-- Content Row -->
        ${postContent}
        <!-- Reaction Row -->
        <div style="display: flex; flex-direction: row">
            <emoji-bar .hash=${this.hash}></emoji-bar>
            <div style="flex-grow:1"></div>
            <div>x comments</div>
        </div>
        <!-- Footer Action Row -->
        <div style="display: flex; flex-direction: row">
            <div>Like</div>
            <div>Comment</div>
            <div>Share</div>
        </div>
            
        <!-- Comments row -->
        <div style="display:flex; flex-direction:column;">
        </div>
          
        <!-- Input Row -->
        <div>
            <vines-input-var></vines-input-var>
        </div>
          
        <!-- Popovers -->
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
    `;

  }

  /** */
  static get styles() {
    return [
      css`
        :host {
          max-width:100%;
          box-shadow: rgba(0, 0, 0, 0.2) 0px 8px 30px 0px;
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

        #innerPostItem {
          display: flex;
          flex-direction: column;
        }
        
        #innerPostItem:hover {
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

        .bordered {
          /*flex-grow: 1;*/
          /*border-left: 2px solid #939393;*/
          border-bottom: 2px solid rgb(108, 176, 70); /*#939393;*/
          border-bottom-left-radius: 10px;
        }

        emoji-bar {
          margin-bottom: 5px;
          /*margin-top:5px;*/
        }

        .contentItem {
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
