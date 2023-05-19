import {css, html, PropertyValues} from "lit";
import {property, state} from "lit/decorators.js";
import {ZomeElement} from "@ddd-qc/lit-happ";
import {ActionHashB64} from "@holochain/client";
import {ThreadsPerspective} from "../viewModels/threads.perspective";
import {ThreadsZvm} from "../viewModels/threads.zvm";


/**
 * @element
 */
export class ChatHeader extends ZomeElement<ThreadsPerspective, ThreadsZvm> {

  constructor() {
    super(ThreadsZvm.DEFAULT_ZOME_NAME);
  }


  /** -- Properties -- */

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


    const pp = this._zvm.perspective.threads[this.hash].pp;
    const semTopic = this._zvm.perspective.allSemanticTopics[pp.subjectHash];

    // FIXME: Generate Top icon according to topic type or bead type

    /** render all */
    return html`
        <div id="chat-header">
          <h3>Welcome to #${semTopic} !</h3>
          <div class="subtext">This is the start of thread #${semTopic}: ${pp.purpose}.</div>
          <div class="subtext">Participation rules: ${pp.rules}</div>
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
