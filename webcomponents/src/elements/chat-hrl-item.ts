import {css, html, PropertyValues} from "lit";
import {customElement, property, state} from "lit/decorators.js";
import {delay, DnaElement} from "@ddd-qc/lit-happ";
import {ThreadsDvm} from "../viewModels/threads.dvm";
import {ActionHashB64, decodeHashFromBase64} from "@holochain/client";
import {ThreadsPerspective} from "../viewModels/threads.perspective";
import {getInitials, Profile as ProfileMat} from "@ddd-qc/profiles-dvm";
import {consume} from "@lit/context";
import {weClientContext} from "../contexts";
import {Hrl, WeServices} from "@lightningrodlabs/we-applet";
import {EntryLocationAndInfo} from "@lightningrodlabs/we-applet/dist/types";


/**
 * @element
 */
@customElement("chat-hrl-item")
export class ChatHrlItem extends DnaElement<unknown, ThreadsDvm> {

  constructor() {
    super(ThreadsDvm.DEFAULT_BASE_ROLE_NAME)
  }

  /** -- Properties -- */

  /** Hash of File bead to display */
  @property() hash: ActionHashB64 = '' // BeadAh

  @consume({ context: weClientContext, subscribe: true })
  weServices!: WeServices;

  /** Observed perspective from zvm */
  @property({type: Object, attribute: false, hasChanged: (_v, _old) => true})
  threadsPerspective!: ThreadsPerspective;

  @state() private _isHovered = false;

  @state() private _entryInfo?: EntryLocationAndInfo;

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


  /** */
  onClickComment(maybeCommentThread: ActionHashB64 | null, subjectName?: string) {
    this.dispatchEvent(new CustomEvent('commenting-clicked', {
      detail: {maybeCommentThread, subjectHash: this.hash, subjectType: "AnyBead::Hrl", subjectName},
      bubbles: true,
      composed: true,
    }));
  }


  /** */
  render() {
    console.log("<chat-hrl-item>.render()", this.hash);
    if (!this.weServices) {
      return html`<div style="color: red">WeServices not available</div>`;
    }
    if (this.hash == "") {
      return html`<ui5-busy-indicator size="Medium" active style="margin:auto; width:50%; height:50%;"></ui5-busy-indicator>`;
    }
    const anyBeadInfo = this.threadsPerspective.anyBeads[this.hash];
    if (!anyBeadInfo) {
      return html`<ui5-busy-indicator size="Medium" active style="margin:auto; width:50%; height:50%;"></ui5-busy-indicator>`;
    }
    if (anyBeadInfo.anyBead.typeInfo != "hrl") {
      return html`<div style="color: red">Bead not an HRL</div>`;
    }

    const obj: [string, string] = JSON.parse(anyBeadInfo.anyBead.value);
    const hrl: Hrl = [decodeHashFromBase64(obj[0]), decodeHashFromBase64(obj[1])];
    if (!this._entryInfo) {
      this.weServices.entryInfo(hrl).then((entryInfo) => this._entryInfo = entryInfo);
      return html`<ui5-busy-indicator size="Medium" active style="margin:auto; width:50%; height:50%;"></ui5-busy-indicator>`;
    }

    /** Determine the comment button to display depending on current comments for this message */
    const maybeCommentThread = this._dvm.threadsZvm.getCommentThreadForSubject(this.hash);
    const isUnread = maybeCommentThread? this.threadsPerspective.unreadThreads.includes(maybeCommentThread) : false;

    let commentButton = html``;
    if (isUnread) {
      commentButton = html`<ui5-button icon="comment" tooltip="View Comment Thread" design="Negative" style="border:none;" @click="${(e) => this.onClickComment(maybeCommentThread, this._entryInfo.entryInfo.name)}"></ui5-button>`;
    } else {
      if (this._isHovered) {
        console.log("threadButton", this._entryInfo.entryInfo.name);
        if (!maybeCommentThread) {
          commentButton = html`
              <ui5-button icon="sys-add" tooltip="Create Comment Thread" design="Transparent" style="border:none;"
                          @click="${(e) => this.onClickComment(maybeCommentThread, this._entryInfo.entryInfo.name)}"></ui5-button>`;
        } else {
          commentButton = html`
              <ui5-button icon="comment" tooltip="View Comment Thread" design="Transparent" style="border:none;"
                          @click="${(e) => this.onClickComment(maybeCommentThread, this._entryInfo.entryInfo.name)}"></ui5-button>`;
        }
      }
    }

    // /** Determine the unread badge to display depending on current comments for this message */
    // let unreadBadge = html``;
    // if (isUnread) {
    //   unreadBadge = html`
    //           <ui5-badge color-scheme="3" style="margin-left:5px; margin-top:2px;">
    //               <ui5-icon name="email" slot="icon" style="color:brown;"></ui5-icon>
    //           </ui5-badge>`;
    // }

    const date = new Date(anyBeadInfo.creationTime / 1000); // Holochain timestamp is in micro-seconds, Date wants milliseconds
    const date_str = date.toLocaleString('en-US', {hour12: false});

    let agent = {nickname: "unknown", fields: {}} as ProfileMat;

      const maybeAgent = this._dvm.profilesZvm.perspective.profiles[anyBeadInfo.author];
      if (maybeAgent) {
        agent = maybeAgent;
      } else {
        console.log("Profile not found for agent", anyBeadInfo.author, this._dvm.profilesZvm.perspective.profiles)
        this._dvm.profilesZvm.probeProfile(anyBeadInfo.author)
        //.then((profile) => {if (!profile) return; console.log("Found", profile.nickname)})
      }

    const initials = getInitials(agent.nickname);
    const avatarUrl = agent.fields['avatar'];

    const id = "chat-item__" + this.hash;

    //let item =html`<ui5-busy-indicator size="Medium" active style="margin:10px; /*width:50%; height:50%;*/"></ui5-busy-indicator>`;
    let item = html`
        <ui5-list id="fileList">
          <ui5-li id="fileLi" icon="chain-link" description="HRL"
                  @click=${(e) => this.weServices.openHrl(hrl, null)}>
            ${this._entryInfo.entryInfo.name}
          </ui5-li>
        </ui5-list>`;

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
                    <span><b>${agent.nickname}</b></span>
                    <span class="chatDate"> ${date_str}</span>
                </div>
              ${item}
            </div>
            ${commentButton}
        </div>
    `;

  }

  /** */
  static get styles() {
    return [
      css`
        #fileList {
          min-width: 350px;
          border: 1px solid #282727;
          border-radius: 3px;
          margin: 10px 5px 10px 5px;
        }

        #fileLi {
          background: rgb(230, 237, 249);
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
        
        .thumb {
          max-width: 50%;
          cursor: pointer;
          margin: 10px; 
        }
      `,];
  }
}
