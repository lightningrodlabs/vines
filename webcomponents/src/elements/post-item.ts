import {html, css, PropertyValues} from "lit";
import {customElement, property, state} from "lit/decorators.js";
import {msg} from "@lit/localize";
import {consume} from "@lit/context";
import {ActionHashB64, decodeHashFromBase64, encodeHashToBase64} from "@holochain/client";
import {DnaElement} from "@ddd-qc/lit-happ";
import {ThreadsDvm} from "../viewModels/threads.dvm";
import {materializeSubject, ThreadsPerspective} from "../viewModels/threads.perspective";
import 'emoji-picker-element';

import {renderAvatar} from "../render";
import {threadJumpEvent} from "../jump";
import {globaFilesContext, onlineLoadedContext, THIS_APPLET_ID, weClientContext} from "../contexts";
import {WeServicesEx} from "@ddd-qc/we-utils";
import {Hrl, weaveUrlFromWal} from "@lightningrodlabs/we-applet";
import {FilesDvm} from "@ddd-qc/files";

import Menu from "@ui5/webcomponents/dist/Menu";
import Button from "@ui5/webcomponents/dist/Button";
import Popover from "@ui5/webcomponents/dist/Popover";

import {toasty} from "../toast";
import {CommentRequest, determineBeadName, determineSubjectName, parseMentions} from "../utils";
import {ParticipationProtocol, Subject, ThreadsEntryType} from "../bindings/threads.types";


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
  onClickComment() {
    const maybeCommentThread = this._dvm.threadsZvm.getCommentThreadForSubject(this.hash);
    const beadInfo = this._dvm.threadsZvm.getBeadInfo(this.hash);
    const typed = this._dvm.threadsZvm.getBead(this.hash);
    const beadName = determineBeadName(beadInfo.beadType, typed, this._filesDvm, this.weServices);
  }


  /** */
  onClickAddEmoji() {
    const popover = this.shadowRoot.getElementById("emojiPopover") as Popover;
    const btn = this.shadowRoot.getElementById("add-reaction-btn") as HTMLElement;
    popover.showAt(btn);
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
  onMoreMenu(e) {
    console.log("onMoreMenu item-click", e)
    switch (e.detail.item.id) {
      case "addReaction": this.onClickAddEmoji(); break;
      case "addFavorite": this.updateFavorite(this.hash, true); break;
      case "removeFavorite": this.updateFavorite(this.hash, false); break;
      case "viewComments":
      case "createCommentThread":
        this.onClickComment(/*maybeCommentThread, beadName, beadInfo.beadType, "side"*/);
      break;
      case "intoHrl":
        this.copyMessageLink();
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
  async onCreateComment(inputText: string) {
    let commentThreadAh = this._dvm.threadsZvm.getCommentThreadForSubject(this.hash);
    if (!commentThreadAh) {
      await this._dvm.threadsZvm.probeSubjectThreads(this.hash);
      commentThreadAh = this._dvm.threadsZvm.getCommentThreadForSubject(this.hash);
      if (!commentThreadAh) {
        console.log("Missing Comment thread. Creating it");
        commentThreadAh = await this.createCommentThread(this.hash);
      }
    }
    const agentsToNotify = parseMentions(inputText, this._dvm.profilesZvm);
    /** Publish */
    const ah = await this._dvm.publishTypedBead(ThreadsEntryType.TextBead, inputText, commentThreadAh, this.cell.agentPubKey, agentsToNotify);
    console.log("onCreateComment() ah:", ah);
  }




  /** */
  async createCommentThread(beadAh: ActionHashB64): Promise<ActionHashB64> {
    const subject: Subject = {
      hash: decodeHashFromBase64(beadAh),
      typeName: ThreadsEntryType.EntryBead,
      appletId: this.weServices? this.weServices.appletId : THIS_APPLET_ID,
      dnaHash: decodeHashFromBase64(this.cell.dnaHash),
    };
    const pp: ParticipationProtocol = {
      purpose: "comment",
      rules: "N/A",
      subject,
      //subject_name: request.subjectName,
      subject_name: await determineSubjectName(materializeSubject(subject), this._dvm.threadsZvm, this._filesDvm, this.weServices),
    };
    const [ppAh, _ppMat] = await this._dvm.threadsZvm.publishParticipationProtocol(pp);
    return ppAh;
  }


  /** */
  render() {
    console.log("<post-item>.render()", this.hash, !!this._filesDvm, !!this.weServices, !!this.threadsPerspective);
    if (this.hash == "") {
      return html`<div>No post selected</div>`;
    }
    const tuple = this.threadsPerspective.beads[this.hash];
    if (!tuple) {
      return html`<div>No posts found</div>`;
    }
    const beadInfo = tuple[0];
    /** Determine the comment button to display depending on current comments for this message */
    let postContent = html`<chat-text class="contentItem" .hash=${this.hash}></chat-text>`;

    const commentThreadAh = this._dvm.threadsZvm.getCommentThreadForSubject(this.hash);
    let commentThread = undefined;
    if (commentThreadAh) {
      commentThread = this.threadsPerspective.threads.get(commentThreadAh);
    }



    const menuButton = html`
        <ui5-button id="menu-btn" icon="overflow" tooltip=${msg('More')} design="Transparent" style="border:none;"
                    @click=${(e) => {
                        e.preventDefault(); e.stopPropagation();
                        //console.log("onSettingsMenu()", e);
                        const menu = this.shadowRoot.getElementById("moreMenu") as Menu;
                        const btn = this.shadowRoot.getElementById("menu-btn") as Button;
                        menu.showAt(btn);
                    }}></ui5-button>`;


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

    let sideButtons= [/*starButton,*/ menuButton];

    const date = new Date(beadInfo.creationTime / 1000); // Holochain timestamp is in micro-seconds, Date wants milliseconds
    const date_str = date.toLocaleString('en-US', {hour12: false});
    const agentName = this._dvm.profilesZvm.perspective.profiles[beadInfo.author]? this._dvm.profilesZvm.perspective.profiles[beadInfo.author].nickname : "unknown";

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
            ${renderAvatar(this._dvm.profilesZvm, beadInfo.author, "XS")}
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
        <div style="display:flex; flex-direction:row; color:#686767">
            <emoji-bar .hash=${this.hash}></emoji-bar>
            <div style="flex-grow:1"></div>
            <div>${!commentThread? html`` : html`${commentThread.beadLinksTree.values.length} comments`}</div>
        </div>
        <!-- Footer Action Row -->
        <hr/>
        <div style="display:flex; flex-direction:row; gap:5px; color:#686767">
            <!-- <div style="flex-grow:1; text-align: center;" @click=${(_e) => this.onClickAddEmoji()}>Like</div> -->
            <ui5-button id="add-reaction-btn" style="flex-grow:1; text-align: center;" icon="feedback" tooltip=${msg('Add Reaction')} design="Transparent" style="border:none;"
                        @click=${(_e) => this.onClickAddEmoji()}>Like</ui5-button>
            <!-- <div style="flex-grow:1; text-align: center;">Comment</div> -->
            <ui5-button id="share-btn" style="flex-grow:1; text-align: center;" icon="comment" design="Transparent" style="border:none;"
                        @click=${(_e) => this.onClickComment()}>Comment</ui5-button>
            <!-- <div style="flex-grow:1; text-align: center;">Share</div> -->
            <ui5-button id="share-btn" style="flex-grow:1; text-align: center;" icon="forward" design="Transparent" style="border:none;"
                        @click=${(_e) => this.copyMessageLink()}>Share</ui5-button>
        </div>
        <hr/>
        <!-- Comments row -->
        <div style="display:flex; flex-direction:column;">
            ${commentThreadAh? html`<post-comment-thread-view .threadHash=${commentThreadAh}></post-comment-thread-view>` : html``}
        </div>
        <!-- Input Row -->
        <div id="inputRow">
            ${renderAvatar(this._dvm.profilesZvm, this.cell.agentPubKey, "XS")}
            <vines-input-bar id="input-bar"
                             style="flex-grow:1;"
                             background="#eee"
                             .profilesZvm=${this._dvm.profilesZvm}
                             topic="comment"
                             .cachedInput=${this._dvm.perspective.threadInputs[this.hash]? this._dvm.perspective.threadInputs[this.hash] : ""}
                             showFileBtn="true"
                             @input=${(e) => {e.preventDefault(); this.onCreateComment(e.detail)}}
                             @upload=${(e) => {e.preventDefault();}}
                             @grab_hrl=${async (e) => {e.preventDefault();}}
            ></vines-input-bar>
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
            <!-- <ui5-menu-item id="addReaction" text=${msg("Add Reaction")} icon="feedback"></ui5-menu-item> -->
            ${isFavorite
      ? html`<ui5-menu-item id="removeFavorite" icon="favorite" text=${msg("Remove from favorites")}></ui5-menu-item>`
      : html`<ui5-menu-item id="addFavorite" icon="add-favorite" text=${msg("Add to favorite")}></ui5-menu-item>`
    }
            <ui5-menu-item id="intoHrl" text=${msg("Copy Message Link")} icon="chain-link"></ui5-menu-item>
            <ui5-menu-item id="copyText" disabled text=${msg("Copy Text")} icon="copy"></ui5-menu-item>
            <ui5-menu-item id="flagMessage" disabled text=${msg("Report Message")} icon="flag"></ui5-menu-item>
        </ui5-menu>
      </div>
    `;

//     ${hasComments
// ? html`<ui5-menu-item id="viewComments" icon="discussion" text=${msg("View comment Thread")} ></ui5-menu-item>`
//   : html`<ui5-menu-item id="createCommentThread" icon="sys-add" text=${msg("Create comment Thread")}></ui5-menu-item>`
//   }

  }

  /** */
  static get styles() {
    return [
      css`
        :host {
          max-width: 100%;
          box-shadow: rgba(0, 0, 0, 0.35) 0px 5px 15px;
          padding: 10px;
          border-radius: 6px;
        }

        hr {
          width: 100%;
          margin: 0px;
        }
        
        #avatarColumn:hover {
          cursor: pointer;
        }

        #inputRow {
          display: flex;
          flex-direction: row;
          gap:5px;
        }
        
        #titleRow {
          display: flex;
          flex-direction: row;
        }

        #innerPostItem {
          display: flex;
          flex-direction: column;
          gap: 5px;
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
          margin: 5px 5px 10px 5px;
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
          box-shadow: rgba(38, 38, 38, 0.86) 1px 1px 1px 1px;
          outline: rgba(74, 74, 74, 0.82) solid 1px;
        }

        .chatDate {
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
