import {css, html, PropertyValues, TemplateResult} from "lit";
import {property, state, customElement} from "lit/decorators.js";
import {DnaElement} from "@ddd-qc/lit-happ";
import {ActionHashB64, encodeHashToBase64} from "@holochain/client";
import {truncate} from "../utils";
import {ThreadsDvm} from "../viewModels/threads.dvm";
import {renderAvatar} from "../render";
import {TextBead, ThreadsEntryType} from "../bindings/threads.types";


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
    let title;
    if (maybeSemanticTopicThread) {
      const [semTopic, _topicHidden] = maybeSemanticTopicThread;
      title = html`<h3>Welcome to #${semTopic} !</h3>`;
      subText = `This is the start of thread ${thread.name}`;
    } else {
      console.log("<chat-header>.render(): pp.subjectHash", thread.pp.subject.hash);
      const subjectBead = this._dvm.threadsZvm.getBeadInfo(thread.pp.subject.hash);
      let subjectName = "";
      if (subjectBead.beadType == ThreadsEntryType.TextBead) {
        subjectName = truncate((this._dvm.threadsZvm.perspective.beads[thread.pp.subject.hash][1] as TextBead).value, 60, true);
      }
      if (subjectBead.beadType == ThreadsEntryType.EntryBead) {
        subjectName = "File";
      }
      if (subjectBead.beadType == ThreadsEntryType.AnyBead) {
        subjectName = "HRL";
      }

      const avatarElem = renderAvatar(this._dvm.profilesZvm, subjectBead.author, "S");

          title = html`<h3>Thread about "${subjectName}" from ${avatarElem}</h3>`;
      subText = html`This is the start of thread about chat message 
                      <span style="color:blue; cursor:pointer" @click=${(e) => this.dispatchEvent(new CustomEvent('selected', {detail: encodeHashToBase64(subjectBead.bead.ppAh), bubbles: true, composed: true}))}>
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
