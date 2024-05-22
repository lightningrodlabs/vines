import {css, html} from "lit";
import {customElement, property} from "lit/decorators.js";
import {DnaElement} from "@ddd-qc/lit-happ";
import {ActionHashB64, AgentPubKeyB64} from "@holochain/client";
import {determineSubjectPrefix} from "../utils";
import {ThreadsDvm} from "../viewModels/threads.dvm";
import {renderAvatar, renderProfileAvatar} from "../render";
import {beadJumpEvent} from "../jump";
import {msg} from "@lit/localize";
import {sharedStyles} from "../styles";
import {Thread} from "../viewModels/thread";
import {toasty} from "../toast";


/**
 * @element
 */
@customElement("chat-header")
export class ChatHeader extends DnaElement<unknown, ThreadsDvm> {

  constructor() {
    super(ThreadsDvm.DEFAULT_BASE_ROLE_NAME);
  }


  /** Hash of thread to display */
  @property() threadHash: ActionHashB64 = ''


  /** */
  async getUpdateComplete(): Promise<boolean> {
    //console.log("ChatView.msg.getUpdateComplete()")
    const superOk = await super.getUpdateComplete();
    return superOk;
  }



  /* */
  renderDmThreadHeader(otherAgent: AgentPubKeyB64) {
    const profile = this._dvm.profilesZvm.getProfile(otherAgent);
    const copyBtn = html`
        <ui5-button icon="copy" design="Transparent" tooltip=${msg('Copy thread to clipboard')} @click=${(e) => {
      e.stopPropagation(); this.dispatchEvent(new CustomEvent('copy-thread', {detail: this.threadHash, bubbles: true, composed: true}))
    }}></ui5-button>
    `;
    //<ui5-button icon="number-sign" design="Transparent" tooltip=${this.hash} @click=${(e) => {navigator.clipboard.writeText(this.hash); toasty(("Copied AgentPubKey to clipboard"));}}></ui5-button>
    /** render all */
    return html`
        <div id="chat-header">
          ${renderProfileAvatar(profile, "L")}
          <h2>
              ${profile.nickname}
              ${copyBtn}
              <ui5-button icon="number-sign" design="Transparent" tooltip=${otherAgent} @click=${(e) => {navigator.clipboard.writeText(otherAgent); toasty(("Copied AgentPubKey to clipboard"));}}></ui5-button>
          </h2>
          <div class="subtext">${msg('This is the beginning of your direct message history with')} <b>${profile.nickname}</b></div>
        </div>
    `;
  }


  /** */
  render() {
    console.log("<chat-header>.render():", this.threadHash);
    if (this.threadHash == "") {
      return html`
          <div>Thread hash missing</div>`;
    }
    let thread = this._dvm.threadsZvm.perspective.threads.get(this.threadHash);
    if (!thread) {
      return html`<div>No thread found</div>`;
    }
    const maybeDmThread = this._dvm.threadsZvm.perspective.dmThreads.get(this.threadHash);
    if (maybeDmThread) {
      return this.renderDmThreadHeader(maybeDmThread[0]);
    }

    const maybeSemanticTopicThread = this._dvm.threadsZvm.perspective.allSemanticTopics[thread.pp.subject.hash];
    let title;
    let subText;
    const copyBtn = html`
        <ui5-button icon="copy" design="Transparent" tooltip=${msg('Copy thread to clipboard')} @click=${(e) => {
            e.stopPropagation(); this.dispatchEvent(new CustomEvent('copy-thread', {detail: this.threadHash, bubbles: true, composed: true}))
        }}></ui5-button>      
    `;
    const subjectPrefix = determineSubjectPrefix(thread.pp.subject.typeName);
    const subjectName = `${subjectPrefix} ${thread.pp.subject_name}`;
    if (maybeSemanticTopicThread) {
      const [semTopic, _topicHidden] = maybeSemanticTopicThread;
      title = html`Welcome to ${thread.name} !`;
      subText = msg(`This is the start of a channel about topic`) + " " + subjectName;
    } else {
      console.log("<chat-header>.render(): pp.subjectHash", thread.pp.subject.hash);
      const subjectBead = this._dvm.threadsZvm.getBeadInfo(thread.pp.subject.hash);
      if (subjectBead) {
        const avatarElem = renderAvatar(this._dvm.profilesZvm, subjectBead.author, "S");
        title = html`Thread about <span class="subjectName">${subjectName}</span> from ${avatarElem}`;
        subText = html`This is the start of thread about chat message 
                      <span style="color:blue; cursor:pointer" 
                            @click=${(_e) => this.dispatchEvent(beadJumpEvent(thread.pp.subject.hash))}>
                        ${subjectName}
                      </span>`;
      } else {
        title = html`Thread about <span class="subjectName">${subjectName}</span>`;
        subText = msg(`This is the start of a thread about a`) + ` "${thread.pp.subject.typeName}": ${thread.pp.purpose}`;
      }
    }

    /** render all */
    return html`
        <div id="chat-header">
          <div class="rounded-emoji">${subjectPrefix}</div>
          <h2>${title} ${copyBtn}</h2>
          <div class="subtext">${subText}</div>
          <!-- <div class="subtext">Purpose: ${thread.pp.purpose}</div> -->
          <div class="subtext">Rules: ${thread.pp.rules}</div>
        </div>
        <!-- <hr style="margin-bottom:0px"/> -->
    `;
  }


  /** */
  static get styles() {
    return [
      sharedStyles,
      css`
        .rounded-emoji {
          width: 80px;
          height: 80px;
          font-size: 36px;
          background: #9f9d9dbf;
          border-radius: 50%;
          display: flex;
          justify-content: center;
          align-items: center;
          font-weight: bold;
        }
        
        h2 {
          line-height: 44px;
          margin: 3px 0px 3px 0px;
        }
        h2 > ui5-button {
          display: none;
        }
        h2:hover > ui5-button {
          display: inline-block;
        }
        
        .chatAvatar {
          /*cursor:pointer;*/  
        }
        
        #chat-header {
          display: flex; 
          flex-direction: column;
          min-height: 55px;
          margin: 5px 5px 10px 10px;
        }
        .subtext {
          color: #505459;
          /*margin-left:10px;*/
          margin-bottom:5px;
        }        
      `,];
  }
}
