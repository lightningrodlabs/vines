import {css, html, PropertyValues} from "lit";
import {property, state, customElement} from "lit/decorators.js";
import {DnaElement} from "@ddd-qc/lit-happ";
import {ActionHashB64, encodeHashToBase64} from "@holochain/client";
import {truncate} from "../utils";
import {Profile as ProfileMat} from "@ddd-qc/profiles-dvm/dist/bindings/profiles.types";
import {getInitials} from "@ddd-qc/profiles-dvm";
import {ThreadsDvm} from "../viewModels/threads.dvm";


/**
 * @element
 */
@customElement("chat-header")
export class ChatHeader extends DnaElement<unknown, ThreadsDvm> {

  constructor() {
    super(ThreadsDvm.DEFAULT_BASE_ROLE_NAME);
  }


  /** Hash of TextMessage to display */
  @property() hash: ActionHashB64 = ''


  /** */
  async getUpdateComplete(): Promise<boolean> {
    //console.log("ChatView.msg.getUpdateComplete()")
    const superOk = await super.getUpdateComplete();
    return superOk;
  }


  /** */
  render() {
    //console.log("<chat-header>.render():", this.hash);
    if (this.hash == "") {
      return html`
          <div>No thread found</div>`;
    }


    const pp = this._dvm.threadsZvm.perspective.threads[this.hash].pp;
    const maybeSemanticTopicThread = this._dvm.threadsZvm.perspective.allSemanticTopics[pp.subjectHash];
    let subText;
    let title;
    if (maybeSemanticTopicThread) {
      const [semTopic, _topicHidden] = maybeSemanticTopicThread;
      title = html`<h3>Welcome to #${semTopic} !</h3>`;
      subText = `This is the start of thread ${semTopic}: ${pp.purpose}.`;
    } else {
      console.log("<chat-header>.render(): pp.subjectHash", pp.subjectHash);
      const subjectBead = this._dvm.threadsZvm.getBeadInfo(pp.subjectHash);
      let subjectName = "";
      if (subjectBead.beadType == "TextMessage") {
        subjectName = truncate(this._dvm.threadsZvm.perspective.textMessages[pp.subjectHash].textMessage.value, 60, true);
      }
      if (subjectBead.beadType == "File") {
        subjectName = "File";
      }
      if (subjectBead.beadType == "HRL") {
        subjectName = "HRL";
      }
      let agent = {nickname: "unknown", fields: {}} as ProfileMat;
      const maybeAgent = this._dvm.profilesZvm.perspective.profiles[subjectBead.author];
      if (maybeAgent) {
        agent = maybeAgent;
      } else {
        console.log("Profile not found for agent", subjectBead.author, this._dvm.profilesZvm.perspective.profiles)
        this._dvm.profilesZvm.probeProfile(subjectBead.author)
        //.then((profile) => {if (!profile) return; console.log("Found", profile.nickname)})
      }

      const initials = getInitials(agent.nickname);
      const avatarUrl = agent.fields['avatar'];
      const avatarElem = avatarUrl? html`
              <ui5-avatar class="chatAvatar" style="box-shadow: 1px 1px 1px 1px rgba(130, 122, 122, 0.88)">
                  <img src=${avatarUrl}>
              </ui5-avatar>`: html`
              <ui5-avatar class="chatAvatar" shape="Circle" initials=${initials} color-scheme="Accent2"></ui5-avatar>
    `;

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
          <!--<div class="subtext">Participation rules: ${pp.rules}</div>-->
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
