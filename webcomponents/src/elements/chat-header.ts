import {css, html} from "lit";
import {customElement, property} from "lit/decorators.js";
import {DnaElement} from "@ddd-qc/lit-happ";
import {ActionHashB64} from "@holochain/client";
import {truncate} from "../utils";
import {ThreadsDvm} from "../viewModels/threads.dvm";
import {renderAvatar} from "../render";
import {TextBead, ThreadsEntryType} from "../bindings/threads.types";
import {beadJumpEvent} from "../jump";
import {TextBeadMat} from "../viewModels/threads.perspective";
import {msg} from "@lit/localize";


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


  /** */
  render() {
    //console.log("<chat-header>.render():", this.hash);
    if (this.threadHash == "") {
      return html`
          <div>Thread hash missing</div>`;
    }
    const thread = this._dvm.threadsZvm.perspective.threads.get(this.threadHash);
    if (!thread) {
      return html`<div>No thread found</div>`;
    }

    const maybeSemanticTopicThread = this._dvm.threadsZvm.perspective.allSemanticTopics[thread.pp.subject.hash];
    let subText;
    const copyBtn = html`
        <ui5-button icon="copy" design="Transparent" tooltip=${msg('Copy thread to clipboard')} @click=${(e) => {
            e.stopPropagation(); this.dispatchEvent(new CustomEvent('copy-thread', {detail: this.threadHash, bubbles: true, composed: true}))
        }}></ui5-button>      
    `;
    let title;
    if (maybeSemanticTopicThread) {
      const [semTopic, _topicHidden] = maybeSemanticTopicThread;
      title = html`<h3>Welcome to #${semTopic} ! ${copyBtn}</h3>`;
      subText = `This is the start of thread ${thread.name}`;
    } else {
      console.log("<chat-header>.render(): pp.subjectHash", thread.pp.subject.hash);
      let subjectName = "";
      const subjectBead = this._dvm.threadsZvm.getBeadInfo(thread.pp.subject.hash);
      if (!subjectBead) {
        subjectName = "Unknown"
      } else {
        if (subjectBead.beadType == ThreadsEntryType.TextBead) {
          subjectName = truncate((this._dvm.threadsZvm.perspective.beads[thread.pp.subject.hash][1] as TextBeadMat).value, 60, true);
        }
        if (subjectBead.beadType == ThreadsEntryType.EntryBead) {
          subjectName = "File";
        }
        if (subjectBead.beadType == ThreadsEntryType.AnyBead) {
          subjectName = "HRL";
        }
      }

      const avatarElem = renderAvatar(this._dvm.profilesZvm, subjectBead.author, "S");

      title = html`<h3>Thread about "${subjectName}" from ${avatarElem} ${copyBtn}</h3>`;
      subText = html`This is the start of thread about chat message 
                      <span style="color:blue; cursor:pointer" 
                            @click=${(_e) => this.dispatchEvent(beadJumpEvent(thread.pp.subject.hash))}>
                        ${subjectName}
                      </span>`;
    }

    // FIXME: Generate Top icon according to topic type or bead type

    /** render all */
    return html`
        <div id="chat-header">
          ${title}
          <div class="subtext">${subText}</div>
          <!--<div class="subtext">Participation rules: ${thread.pp.rules}</div>-->
        </div>
        <!-- <hr style="margin-bottom:0px"/> -->
    `;
  }


  /** */
  static get styles() {
    return [
      css`
        
        h3 {
          line-height: 40px;
        }
        h3 > ui5-button {
          display: none;
        }
        h3:hover > ui5-button {
          display: inline-block;
        }
        
        #chat-header {
          display: flex; 
          flex-direction: column;
          min-height: 55px;
          margin: 5px 5px 10px 10px;
        }
        .subtext {
          color: #505459;
          margin-left:10px;
          margin-bottom:5px;
        }        
      `,];
  }
}
