import {html, css, PropertyValues} from "lit";
import {customElement, property, state} from "lit/decorators.js";
import {DnaElement} from "@ddd-qc/lit-happ";
import {ThreadsDvm} from "../viewModels/threads.dvm";
import {ActionHashB64} from "@holochain/client";
import {truncate} from "../utils";
import {TextBeadMat, ThreadsPerspective} from "../viewModels/threads.perspective";
import 'emoji-picker-element';
import {Picker} from "emoji-picker-element";
import Popover from "@ui5/webcomponents/dist/Popover";
import {renderAvatar} from "../render";
import {TextBead, ThreadsEntryType} from "../bindings/threads.types";
import {threadJumpEvent} from "../jump";
import {msg} from "@lit/localize";


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

  @state() private _isHovered = false;


  /** Observed perspective from zvm */
  @property({type: Object, attribute: false, hasChanged: (_v, _old) => true})
  threadsPerspective!: ThreadsPerspective;


  get emojiPickerElem() : Picker {
    return this.shadowRoot!.getElementById("emoji-picker") as Picker;
  }


  /**
   * In dvmUpdated() this._dvm is not already set!
   * Subscribe to ThreadsZvm
   */
  protected async dvmUpdated(newDvm: ThreadsDvm, oldDvm?: ThreadsDvm): Promise<void> {
    //console.log("<chat-message-item>.dvmUpdated()");
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


  /** Probe reactions of first render */
  protected firstUpdated(_changedProperties: PropertyValues) {
    super.firstUpdated(_changedProperties);

    this._dvm.threadsZvm.probeEmojiReactions(this.hash);

    this.emojiPickerElem.addEventListener('emoji-click', (event: any) => {
      const unicode = event?.detail?.unicode
      console.log("emoji-click: " + unicode)
      if (unicode) {
        this._dvm.publishEmoji(this.hash, unicode);
        //this.emojiPickerElem.style.display = 'none';
      }
      const popover = this.shadowRoot.getElementById("emojiPopover") as Popover;
      if (popover.isOpen()) {
        popover.close();
      }
    });
  }


  /** */
  onClickComment(maybeCommentThread: ActionHashB64 | null, subjectName?: string, viewType?: string) {
    this.dispatchEvent(new CustomEvent('commenting-clicked', {
      detail: {maybeCommentThread, subjectHash: this.hash, subjectType: "TextBead", subjectName, viewType: viewType? viewType : "side"},
      bubbles: true,
      composed: true,
    }));
  }


  /** */
  onClickAddEmoji() {
    //this.emojiPickerElem.style.display = 'block';
    const popover = this.shadowRoot.getElementById("emojiPopover") as Popover;
    const btn = this.shadowRoot.getElementById("add-reaction-btn") as HTMLElement;
    popover.showAt(btn);
  }





  /** */
  render() {
    console.log("<chat-item>.render()");
    if (this.hash == "") {
      return html`
          <div>No bead found</div>`;
    }

    let beadInfo = this._dvm.threadsZvm.getBeadInfo(this.hash);
    if (!beadInfo) {
      return html`
          <div>Loading...</div>`;
    }

    /** Determine the comment button to display depending on current comments for this message */
    let subjectName = "";
    let item = html``;
    if (beadInfo.beadType == ThreadsEntryType.TextBead) {
      subjectName = truncate((this.threadsPerspective.beads[this.hash][1] as TextBeadMat).value, 60, true);
      item = html`<chat-message class="innerItem" .hash=${this.hash}></chat-message>`;
    }
    if (beadInfo.beadType == ThreadsEntryType.EntryBead) {
      subjectName = "File";
      item = html`<chat-file class="innerItem" .hash=${this.hash}></chat-file>`;
    }
    if (beadInfo.beadType == ThreadsEntryType.AnyBead) {
      subjectName = "HRL";
      item = html`<chat-hrl class="innerItem" .hash=${this.hash}></chat-hrl>`;
    }


    const maybeCommentThread = this._dvm.threadsZvm.getCommentThreadForSubject(this.hash);

    //let isUnread = false;
    let commentThread = html``;
    let commentButton = html`
        <ui5-button icon="sys-add" tooltip=${msg("Create comment Thread for this message")} design="Transparent" style="border:none;"
                      @click="${(_e) => this.onClickComment(maybeCommentThread, subjectName, "side")}">                      
        </ui5-button>`;

    if (maybeCommentThread && this.threadsPerspective.threads.get(maybeCommentThread)) {
      commentButton = html`              
          <ui5-button icon="discussion" tooltip=${msg("View comments on the side")} design="Transparent" style="border:none;"
                       @click="${(_e) => this.onClickComment(maybeCommentThread, subjectName, "side")}">
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

    console.log("<chat-item>.render() maybeCommentThread", maybeCommentThread, commentThread);

    const reactionButton = html`
              <ui5-button id="add-reaction-btn" icon="feedback" tooltip="Add Reaction" design="Transparent" style="border:none;"
                          @click="${(_e) => this.onClickAddEmoji()}"></ui5-button>`;

    const isFavorite = this._dvm.threadsZvm.perspective.favorites.includes(this.hash);
    const starButton = isFavorite? html`
        <ui5-button id="star-btn" icon="favorite" tooltip="Remove from favorites" design="Transparent" style="border:none;"
                    @click="${(_e) => this._dvm.threadsZvm.removeFavorite(this.hash)}"></ui5-button>
        ` : html`
        <ui5-button id="star-btn" icon="add-favorite" tooltip="Add to favorite" design="Transparent" style="border:none;"
                    @click="${async (_e) => {
                      await this._dvm.threadsZvm.addFavorite(this.hash);
                      console.log("Favorites", this._dvm.threadsZvm.perspective.favorites.length);
    }}"></ui5-button>
    `;

    const sideButtons = [starButton, reactionButton, commentButton];

    const date = new Date(beadInfo.creationTime / 1000); // Holochain timestamp is in micro-seconds, Date wants milliseconds
    const date_str = date.toLocaleString('en-US', {hour12: false});

    const id = "chat-item__" + this.hash;

    const agentName = this._dvm.profilesZvm.perspective.profiles[beadInfo.author]? this._dvm.profilesZvm.perspective.profiles[beadInfo.author].nickname : "unknown";

    /** render all */
    return html`
        <div class="${this._isHovered? "hovered": ""}">
        <!-- Vine row -->
        <div id="topVine">
            <div style="flex-grow:1;"></div>
            <div class="vine"></div>
        </div>      
        
        <!-- main horizontal div (row) -->
        <div id=${id} class="chatItem" 
             @mouseenter=${(e) => {
                 const popover = this.shadowRoot.getElementById("buttonsPop") as Popover;
                 const anchor = this.shadowRoot.getElementById("nameEnd") as HTMLElement;
                 popover.showAt(anchor);
                 this._isHovered = true;
              }} 
             @mouseleave=${(e) => {
               this._isHovered = false;
               const popover = this.shadowRoot.getElementById("buttonsPop") as Popover;
               popover.close();  
             }}>
            <!-- avatar column -->
            <div style="display: flex; flex-direction: column; width:48px;">
              ${renderAvatar(this._dvm.profilesZvm, beadInfo.author, "S")}
              <div style="display: flex; flex-direction: row; flex-grow: 1; margin-top:1px;">
                  <div style="flex-grow:1;"></div>
                  <div class="vine"></div>
              </div>
            </div>
            <!-- message column -->
            <div style="display:flex; flex-direction:column; gap:0px; flex-grow:1;">
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
            <ui5-popover id="buttonsPop" hide-arrow allow-target-overlap placement-type="Left" >${sideButtons}</ui5-popover>
            <ui5-popover id="emojiPopover" header-text="Add Reaction">
                <emoji-picker id="emoji-picker" class="light" style="display: block"></emoji-picker>
            </ui5-popover>            
        </div>
        
        <!-- Reply row -->
        <div id="replyRow" style="display:flex; flex-direction:row;">
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
        
        #buttonsPop::part(content) {
          padding: 0px;
        }
        .hovered {
          background: #d8e2f6;
        }

        #agentName {
          font-family: "72";
          font-weight: bold;
          color: #262626;
        }

        #bottomLeft {
          width: 58px;
        }

        #topVine {
          display: flex;
          flex-direction: row;
          min-height: 15px;
          width: 58px;
          margin-bottom: 1px;
        }

        .vine {
          flex-grow: 1;
          border-left: 2px solid rgb(108, 176, 70); /*#939393;*/
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
        }

        .chatAvatar {
          margin-right: 5px;
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
