import {css, html, PropertyValues} from "lit";
import {property, state, customElement} from "lit/decorators.js";
import {DnaElement} from "@ddd-qc/lit-happ";
import {ActionHashB64, EntryHashB64} from "@holochain/client";
import {getInitials, Profile as ProfileMat} from "@ddd-qc/profiles-dvm";
import {FilesDvm} from "@ddd-qc/files";
//import {ChatThreadView} from "./chat-thread-view";


/**
 * @element
 */
@customElement("image-message-item")
export class ImageMessageItem extends DnaElement<unknown, FilesDvm> {

  constructor() {
    super(FilesDvm.DEFAULT_BASE_ROLE_NAME)
  }

  /** -- Properties -- */

  /** Hash of TextMessage to display */
  @property() hash: EntryHashB64 = '';

  @property() profile?: ProfileMat;

  @state() private _isHovered = false;


  /** */
  onClickComment(maybeCommentThread: ActionHashB64 | null, subjectName?: string) {
    this.dispatchEvent(new CustomEvent('commenting-clicked', {
      detail: {maybeCommentThread, subjectHash: this.hash, subjectType: "TextMessage", subjectName},
      bubbles: true,
      composed: true,
    }));
  }


  /** */
  render() {
    //console.log("<chat-message-item>.render()", this.hash);
    if (this.hash == "") {
      return html`
          <div>No message found</div>`;
    }

    const parcel = this._dvm.deliveryZvm.perspective.publicParcels[this.hash];
    if (!parcel) {
      return html `<div>Loading message...</div>`;
    }
    const [description, ts, author] = parcel;

    /** Determine the comment button to display depending on current comments for this message */
    //const msg = truncate(description.name, 60, true);
    //const maybeCommentThread = this._dvm.threadsZvm.getCommentThreadForSubject(this.hash);
    //const isUnread = maybeCommentThread? this.threadsPerspective.unreadThreads.includes(maybeCommentThread) : false;

    let commentButton = html``;
    // if (isUnread) {
    //   commentButton = html`<ui5-button icon="comment" tooltip="View Comment Thread" design="Negative" style="border:none;" @click="${(e) => this.onClickComment(maybeCommentThread, msg)}"></ui5-button>`;
    // } else {
    //   if (this._isHovered) {
    //     console.log("threadButton", msg, texto.message);
    //     if (!maybeCommentThread) {
    //       commentButton = html`
    //           <ui5-button icon="sys-add" tooltip="Create Comment Thread" design="Transparent" style="border:none;"
    //                       @click="${(e) => this.onClickComment(maybeCommentThread, msg)}"></ui5-button>`;
    //     } else {
    //       commentButton = html`
    //           <ui5-button icon="comment" tooltip="View Comment Thread" design="Transparent" style="border:none;"
    //                       @click="${(e) => this.onClickComment(maybeCommentThread, msg)}"></ui5-button>`;
    //     }
    //   }
    // }


    const date = new Date(ts / 1000); // Holochain timestamp is in micro-seconds, Date wants milliseconds
    const date_str = date.toLocaleString('en-US', {hour12: false});

    let agent = {nickname: "unknown", fields: {}} as ProfileMat;
    const maybeAgent = this.profile;
    if (maybeAgent) {
      agent = maybeAgent;
    }

    const initials = getInitials(agent.nickname);
    const avatarUrl = agent.fields['avatar'];

    const id = "chat-item__" + this.hash;

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
                    <abbr title=${author}><span><b>${agent.nickname}</b></span></abbr>
                    <span class="chatDate"> ${date_str}</span>
                </div>
                <div class="chatMsg">${description.name}</div>
            </div>
            ${commentButton}
        </div>
    `;

  }

  /** */
  static get styles() {
    return [
      css`
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
