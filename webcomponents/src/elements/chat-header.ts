import {css, html} from "lit";
import {customElement, property} from "lit/decorators.js";
import {
  ActionId,
  AgentId,
  DnaElement,
  EntryId,
  getHashType,
  intoAnyId,
  intoLinkableId,
  isHashTypeB64
} from "@ddd-qc/lit-happ";
import {determineSubjectPrefix} from "../utils";
import {ThreadsDvm} from "../viewModels/threads.dvm";
import {renderAvatar, renderProfileAvatar} from "../render";
import {beadJumpEvent, SpecialSubjectType} from "../events";
import {msg} from "@lit/localize";
import {sharedStyles} from "../styles";
import {toasty} from "../toast";
import {HoloHashType} from "@ddd-qc/cell-proxy/dist/hash";


/**
 * @element
 */
@customElement("chat-header")
export class ChatHeader extends DnaElement<unknown, ThreadsDvm> {

  constructor() {
    super(ThreadsDvm.DEFAULT_BASE_ROLE_NAME);
  }


  /** Hash of thread to display */
  @property() threadHash?: ActionId;


  /** */
  async getUpdateComplete(): Promise<boolean> {
    //console.log("ChatView.msg.getUpdateComplete()")
    const superOk = await super.getUpdateComplete();
    return superOk;
  }


  /* */
  renderDmThreadHeader(otherAgent: AgentId) {
    console.log("renderDmThreadHeader()", otherAgent, this.cell.address.dnaId.print());
    const profile = this._dvm.profilesZvm.perspective.getProfile(otherAgent);
    const copyBtn = html`
        <ui5-button icon="copy" design="Transparent" tooltip=${msg('Copy thread to clipboard')} @click=${(e) => {
      e.stopPropagation(); this.dispatchEvent(new CustomEvent<ActionId>('copy-thread', {detail: this.threadHash, bubbles: true, composed: true}))
    }}></ui5-button>
    `;
    if (!profile) {
      console.warn("No profile found");
      return html``;
    }
    //<ui5-button icon="number-sign" design="Transparent" tooltip=${this.hash} @click=${(e) => {navigator.clipboard.writeText(this.hash); toasty(("Copied AgentPubKey to clipboard"));}}></ui5-button>
    /** render all */
    return html`
        <div id="chat-header">
          ${renderProfileAvatar(profile, "L")}
          <h2>
              ${profile.nickname}
              ${copyBtn}
              <ui5-button icon="number-sign" design="Transparent" tooltip=${otherAgent.b64} @click=${(e) => {navigator.clipboard.writeText(otherAgent.b64); toasty(("Copied AgentPubKey to clipboard"));}}></ui5-button>
          </h2>
          <div class="subtext">${msg('This is the beginning of your direct message history with')} <b>${profile.nickname}</b></div>
        </div>
    `;
  }


  /** */
  render() {
    console.log("<chat-header>.render():", this.threadHash);
    if (!this.threadHash) {
      return html`
          <div>Thread hash missing</div>`;
    }
    let thread = this._dvm.threadsZvm.perspective.threads.get(this.threadHash);
    if (!thread) {
      return html`<div>No thread found</div>`;
    }
    const maybeDmThread = this._dvm.threadsZvm.isThreadDm(this.threadHash);
    if (maybeDmThread) {
      return this.renderDmThreadHeader(maybeDmThread);
    }

    const subjectAddr = thread.pp.subject.address;
    let maybeSemanticTopicTitle: string | null = null;
    const subjectHashType = getHashType(subjectAddr);
    if (subjectHashType == HoloHashType.Entry) {
      maybeSemanticTopicTitle = this._dvm.threadsZvm.perspective.semanticTopics.get(new EntryId(subjectAddr));
    }
    console.log("subjectHashType", subjectHashType);
    const subjectId = ActionId.from(intoAnyId(subjectAddr));
    let title;
    let subText;
    const copyBtn = html`
        <ui5-button icon="copy" design="Transparent" tooltip=${msg('Copy thread to clipboard')} @click=${(e) => {
            e.stopPropagation(); this.dispatchEvent(new CustomEvent<ActionId>('copy-thread', {detail: this.threadHash, bubbles: true, composed: true}))
        }}></ui5-button>      
    `;
    const subjectPrefix = determineSubjectPrefix(thread.pp.subject.typeName as SpecialSubjectType);
    const subjectName = `${subjectPrefix} ${thread.pp.subject_name}`;
    if (maybeSemanticTopicTitle) {
      title = html`Welcome to ${thread.name} !`;
      subText = msg(`This is the start of a channel about topic`) + " " + subjectName;
    } else {
      console.log("<chat-header>.render(): pp.subjectHash", thread.pp.subject.address);
      const subjectBead = this._dvm.threadsZvm.perspective.getBeadInfo(subjectId);
      if (subjectBead) {
        const avatarElem = renderAvatar(this._dvm.profilesZvm, subjectBead.author, "S");
        title = html`Thread about <span class="subjectName">${subjectName}</span> from ${avatarElem}`;
        subText = html`This is the start of thread about chat message 
                      <span style="color:blue; cursor:pointer" 
                            @click=${(_e) => this.dispatchEvent(beadJumpEvent(subjectId))}>
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
