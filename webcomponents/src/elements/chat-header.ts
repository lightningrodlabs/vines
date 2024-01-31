import {css, html, PropertyValues, TemplateResult} from "lit";
import {property, state, customElement} from "lit/decorators.js";
import {DnaElement} from "@ddd-qc/lit-happ";
import {ActionHashB64, encodeHashToBase64} from "@holochain/client";
import {truncate} from "../utils";
import {ThreadsDvm} from "../viewModels/threads.dvm";
import {renderAvatar} from "../render";
import {ThreadsEntryType} from "../bindings/threads.types";


/**
 * @element
 */
@customElement("chat-header")
export class ChatHeader extends DnaElement<unknown, ThreadsDvm> {

  constructor() {
    super(ThreadsDvm.DEFAULT_BASE_ROLE_NAME);
  }


  /** Hash of TextMessage to display */
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

    const maybeSemanticTopicThread = this._dvm.threadsZvm.perspective.allSemanticTopics[thread.pp.subjectHash];
    let subText;
    let title;
    if (maybeSemanticTopicThread) {
      const [semTopic, _topicHidden] = maybeSemanticTopicThread;
      title = html`<h3>Welcome to #${semTopic} !</h3>`;
      const threadName = this._dvm.threadsZvm.threadName(thread.pp);
      subText = `This is the start of thread ${threadName}`;
    } else {
      console.log("<chat-header>.render(): pp.subjectHash", thread.pp.subjectHash);
      const subjectBead = this._dvm.threadsZvm.getBeadInfo(thread.pp.subjectHash);
      let subjectName = "";
      if (subjectBead.beadType == ThreadsEntryType.TextMessage) {
        subjectName = truncate(this._dvm.threadsZvm.perspective.textMessages[thread.pp.subjectHash].textMessage.value, 60, true);
      }
      if (subjectBead.beadType == "File") {
        subjectName = "File";
      }
      if (subjectBead.beadType == "HRL") {
        subjectName = "HRL";
      }

      const avatarElem = renderAvatar(this._dvm.profilesZvm, subjectBead.author, "S");

          title = html`<h3>Thread about "${subjectName}" from ${avatarElem}</h3>`;
      subText = html`This is the start of thread about chat message 
                      <span style="color:blue; cursor:pointer" @click=${(e) => this.dispatchEvent(new CustomEvent('selected', {detail: encodeHashToBase64(subjectBead.bead.forProtocolAh), bubbles: true, composed: true}))}>
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
        <hr/>
    `;
  }


  /** */
  static get styles() {
    return [
      css`
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
