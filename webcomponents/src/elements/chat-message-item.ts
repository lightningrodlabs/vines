import {css, html, PropertyValues} from "lit";
import {property, state, customElement} from "lit/decorators.js";
import {DnaElement} from "@ddd-qc/lit-happ";
import {ThreadsDvm} from "../viewModels/threads.dvm";
import {ActionHashB64} from "@holochain/client";
import {ThreadsProfile} from "../viewModels/profiles.proxy";
import {getInitials} from "../utils";
//import {ChatThreadView} from "./chat-thread-view";


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


  /**
   * In dvmUpdated() this._dvm is not already set!
   * Subscribe to ThreadsZvm
   */
  protected async dvmUpdated(newDvm: ThreadsDvm, oldDvm?: ThreadsDvm): Promise<void> {
    console.log("<chat-message-item>.dvmUpdated()");
    if (oldDvm) {
      console.log("\t Unsubscribed to threadsZvm's roleName = ", oldDvm.threadsZvm.cell.name)
      oldDvm.threadsZvm.unsubscribe(this);
    }
    newDvm.threadsZvm.subscribe(this, 'threadsPerspective');
    console.log("\t Subscribed threadsZvm's roleName = ", newDvm.threadsZvm.cell.name)
  }


  /** */
  protected async updated(_changedProperties: PropertyValues) {
    // try {
    //   const childElements = this.shadowRoot.querySelectorAll('*');
    //   console.log({childElements}); // This will log all child elements of the shadowRoot
    //   childElements.forEach(async(childElement) => {
    //     const chatItem = childElement as ChatMessageItem;
    //     await chatItem.updateComplete;
    //   });
    //   console.log("ChatView.updated2() ", this.chatElem.scrollTop, this.chatElem.scrollHeight, this.chatElem.clientHeight)
    // } catch(e) {
    //   // element not present
    //   //this.requestUpdate();
    // }
  }


  /** */
  async getUpdateComplete(): Promise<boolean> {
    //console.log("ChatView.msg.getUpdateComplete()")
    const superOk = await super.getUpdateComplete();
    //const childOk = await this.chatElem.updateComplete;
    // const childElements = this.shadowRoot.querySelectorAll('*');
    // console.log("ChatView.msg children", childElements); // This will log all child elements of the shadowRoot
    // childElements.forEach(async(childElement) => {
    //   const chatItem = childElement// as ChatMessageItem;
    //   //await chatItem.updateComplete;
    //   console.log("ChatView.msg child height", /*chatItem.offsetHeight,*/ chatItem.scrollHeight, chatItem.clientHeight, chatItem);
    // });
    return superOk /*&& childOk*/;
  }


  /** */
  onClickComment(maybeCommentThread: ActionHashB64 | null) {
    this.dispatchEvent(new CustomEvent('commenting-clicked', {
      detail: {maybeCommentThread, subjectHash: this.hash, subjectType: "TextMessage"},
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

    const texto = this._dvm.threadsZvm.perspective.textMessages[this.hash];
    if (!texto) {
      return html `<div>Loading message...</div>`;
    }

    let threadButton = html``;
    if (this._isHovered) {
      const maybeCommentThread = this._dvm.threadsZvm.getCommentThreadForSubject(this.hash);
      threadButton = maybeCommentThread != null
        ? html`<ui5-button icon="comment" tooltip="Create Comment Thread" design="Transparent" @click="${(e) => this.onClickComment(maybeCommentThread)}"></ui5-button>`
        : html`<ui5-button icon="sys-add" tooltip="Create Comment Thread" design="Transparent" @click="${(e) => this.onClickComment(maybeCommentThread)}"></ui5-button>`;
    }

    const date = new Date(texto.creationTime / 1000); // Holochain timestamp is in micro-seconds, Date wants milliseconds
    const date_str = date.toLocaleString('en-US', {hour12: false});

    let agent = {nickname: "unknown", fields: {}} as ThreadsProfile;
    let maybeAgent = this._dvm.profilesZvm.perspective.profiles[texto.author];
    if (maybeAgent) {
      agent = maybeAgent;
    } else {
      //console.log("Profile not found for", texto.author, this._dvm.profilesZvm.perspective.profiles)
      this._dvm.profilesZvm.probeProfile(texto.author)
        //.then((profile) => {if (!profile) return; console.log("Found", profile.nickname)})
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
                <div><span><b>${agent.nickname}</b></span><span class="chatDate"> ${date_str}</span></div>
                <div class="chatMsg">${texto.message}</div>
            </div>
            ${threadButton}
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
