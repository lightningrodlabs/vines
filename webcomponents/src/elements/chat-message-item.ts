import {css, html, PropertyValues} from "lit";
import {property, state, customElement} from "lit/decorators.js";
import {DnaElement} from "@ddd-qc/lit-happ";
import {ThreadsDvm} from "../viewModels/threads.dvm";
import {ActionHashB64} from "@holochain/client";
import {truncate} from "../utils";
import {ThreadsPerspective} from "../viewModels/threads.perspective";
import {getInitials, Profile as ProfileMat} from "@ddd-qc/profiles-dvm";
//import {ChatThreadView} from "./chat-thread-view";
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import markdownit from 'markdown-it'
//import { full as emoji } from 'markdown-it-emoji/dist/markdown-it-emoji.js'
//import * as emoji from 'markdown-it-emoji/dist/markdown-it-emoji.js'

import 'emoji-picker-element';
import {Picker} from "emoji-picker-element";
import Popover from "@ui5/webcomponents/dist/Popover";

/**
 * @element
 */
@customElement("chat-message-item")
export class ChatMessageItem extends DnaElement<unknown, ThreadsDvm> {

  constructor() {
    super(ThreadsDvm.DEFAULT_BASE_ROLE_NAME)
  }

  /** -- Properties -- */

  /** Hash of TextMessage to display */
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
  onClickComment(maybeCommentThread: ActionHashB64 | null, subjectName?: string) {
    this.dispatchEvent(new CustomEvent('commenting-clicked', {
      detail: {maybeCommentThread, subjectHash: this.hash, subjectType: "TextMessage", subjectName},
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
    //console.log("<chat-message-item>.render()", this.hash);
    if (this.hash == "") {
      return html`
          <div>No message found</div>`;
    }

    const texto = this.threadsPerspective.textMessages[this.hash];
    if (!texto) {
      return html `<div>Loading message...</div>`;
    }



    /** Determine the comment button to display depending on current comments for this message */
    const msg = truncate(texto.message, 60, true);
    const maybeCommentThread = this._dvm.threadsZvm.getCommentThreadForSubject(this.hash);
    const isUnread = maybeCommentThread? this.threadsPerspective.unreadThreads.includes(maybeCommentThread) : false;

    let commentButton = html``;
    if (isUnread) {
      commentButton = html`<ui5-button icon="comment" tooltip="View Thread" design="Negative" style="border:none;" @click="${(e) => this.onClickComment(maybeCommentThread, msg)}"></ui5-button>`;
    } else {
      console.log("threadButton", msg, texto.message);
      if (!maybeCommentThread) {
        commentButton = html`
            <ui5-button icon="sys-add" tooltip="Create new Thread" design="Transparent" style="border:none;"
                        @click="${(e) => this.onClickComment(maybeCommentThread, msg)}"></ui5-button>`;
      } else {
        commentButton = html`
            <ui5-button icon="comment" tooltip="View Thread" design="Transparent" style="border:none;"
                        @click="${(e) => this.onClickComment(maybeCommentThread, msg)}"></ui5-button>`;
      }
    }

    const reactionButton = html`
              <ui5-button id="add-reaction-btn" icon="feedback" tooltip="Add Reaction" design="Transparent" style="border:none;"
                          @click="${(e) => this.onClickAddEmoji()}"></ui5-button>`;

    let sideButtons = [];
    if (this._isHovered) {
      sideButtons.push(reactionButton);
      sideButtons.push(commentButton);
    }

    // /** Determine the unread badge to display depending on current comments for this message */
    // let unreadBadge = html``;
    // if (isUnread) {
    //   unreadBadge = html`
    //           <ui5-badge color-scheme="3" style="margin-left:5px; margin-top:2px;">
    //               <ui5-icon name="email" slot="icon" style="color:brown;"></ui5-icon>
    //           </ui5-badge>`;
    // }

    const date = new Date(texto.creationTime / 1000); // Holochain timestamp is in micro-seconds, Date wants milliseconds
    const date_str = date.toLocaleString('en-US', {hour12: false});

    let agent = {nickname: "unknown", fields: {}} as ProfileMat;
    const maybeAgent = this._dvm.profilesZvm.perspective.profiles[texto.author];
    if (maybeAgent) {
      agent = maybeAgent;
    } else {
      console.log("Profile not found for agent", texto.author, this._dvm.profilesZvm.perspective.profiles)
      this._dvm.profilesZvm.probeProfile(texto.author)
      //.then((profile) => {if (!profile) return; console.log("Found", profile.nickname)})
    }

    const initials = getInitials(agent.nickname);
    const avatarUrl = agent.fields['avatar'];

    const id = "chat-item__" + this.hash;

    const md = markdownit()
    //const md = markdownit().use(emoji/* , options */);
    const result = md.render(texto.message);
    const parsed = unsafeHTML(result);

    /** render all */
    return html`
        <div id=${id} class="chatItem" @mouseenter=${(e) => this._isHovered = true} @mouseleave=${(e) => this._isHovered = false}>
            ${avatarUrl? html`
                      <ui5-avatar class="chatAvatar" style="box-shadow: 1px 1px 1px 1px rgba(130, 122, 122, 0.88)">
                          <img src=${avatarUrl}>
                      </ui5-avatar>                   
                          ` : html`
                        <ui5-avatar class="chatAvatar" shape="Circle" initials=${initials} color-scheme="Accent2"></ui5-avatar>
                  `}
            <div style="display: flex; flex-direction: column">
                <div>
                    <!-- <abbr title=${texto.author}></abbr> -->
                    <span><b>${agent.nickname}</b></span>
                    <span class="chatDate"> ${date_str}</span>
                </div>
                <div class="chatMsg">${parsed}</div>
              <emoji-bar .hash=${this.hash}></emoji-bar>
            </div>
            ${sideButtons}           
        </div>
        <!-- Emoji Picker -->
        <ui5-popover id="emojiPopover" header-text="Add Reaction">
            <emoji-picker id="emoji-picker" class="light" style="display: block"></emoji-picker>
        </ui5-popover>
    `;

  }

  /** */
  static get styles() {
    return [
      css`
        blockquote {
          border-left: 4px solid #c1b2b2;
          margin: 0px;
          padding-left: 20px;
          padding-top: 1px;
          padding-bottom: 1px;
        }
        code {
          border: 1px solid #cac4c4;
          padding: 4px;
          background: #f0f0f0;
        }
        .chatItem {
          display: flex; 
          flex-direction: row;
          min-height: 55px;
          margin: 5px 5px 10px 5px;
        }
        .chatAvatar {
          margin-right: 5px;
          min-width: 48px;
        }
        .chatDate {
          margin: 0px 0px 0px 5px;
          font-size: smaller;
          color: gray;
        }
        .chatMsg {
          margin: 5px 5px 5px 5px;
        }        
      `,];
  }
}
