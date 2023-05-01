import {css, html, PropertyValues} from "lit";
import {property, state} from "lit/decorators.js";
import {DnaElement} from "@ddd-qc/lit-happ";
import {ThreadsDvm} from "../viewModels/threads.dvm";
import {ActionHashB64} from "@holochain/client";
import {ThreadsProfile} from "../viewModels/profiles.proxy";
import {getInitials} from "../utils";

/**
 * @element
 */
export class ChatMessageItem extends DnaElement<unknown, ThreadsDvm> {

  constructor() {
    super(ThreadsDvm.DEFAULT_BASE_ROLE_NAME)
  }

  /** -- Properties -- */

  /** Hash of TextMessage to display */
  @property() hash: ActionHashB64 = ''


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
  render() {
    console.log("<chat-message-item>.render():", this.hash);
    if (this.hash == "") {
      return html`
          <div>No message found</div>`;
    }

    const texto = this._dvm.threadsZvm.perspective.textMessages[this.hash];
    if (!texto) {
      return html `<div>Loading thread...</div>`;
    }

    const date = new Date(texto.create_time_us / 1000); // Holochain timestamp is in micro-seconds, Date wants milliseconds
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

    /** render all */
    return html`
        <div id="chat-item__${this.hash}" class="chatItem">
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
