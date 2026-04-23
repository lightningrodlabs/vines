import {css, html} from "lit";
import {property, customElement} from "lit/decorators.js";
import {ActionId, ZomeElement} from "@ddd-qc/lit-happ";
import {ThreadsPerspective} from "../../viewModels/threads.perspective";
import {unsafeHTML} from 'lit/directives/unsafe-html.js';
import {ThreadsZvm} from "../../viewModels/threads.zvm";
import {sharedStyles} from "../../styles";
import {md} from "../../markdown/md";
import {codeStyles} from "../../markdown/code-css";
import {TextBeadMat} from "../../viewModels/threads.materialize";
import {ThreadsEntryType} from "../../bindings/threads.types";
import {msg} from "@lit/localize";
import {threadJumpEvent} from "../../events";


/**
 * @element
 */
@customElement("chat-text")
export class ChatText extends ZomeElement<ThreadsPerspective, ThreadsZvm> {

  constructor() {
    super(ThreadsZvm.DEFAULT_ZOME_NAME);
  }

  /** Hash of TextBead to display */
  @property() hash!: ActionId;


  /** */
  override render() {
    //console.debug("<chat-text>.render()", this.hash);
    if (!this.hash) {
      return html`<div style="color:red">${msg("No message found")}</div>`;
    }

    const tm = this._zvm.perspective.getBaseBead(this.hash) as TextBeadMat;
    if (!tm) {
      return html`<ui5-busy-indicator delay="0" size="Medium" active style="margin:auto; width:50%; height:50%;"></ui5-busy-indicator>`;
    }
    const beadInfo = this._zvm.perspective.getBeadInfo(this.hash)!;
    const maybe = this._zvm.perspective.getEditThread(this.hash);
    const isEdited = maybe? maybe[1].beadLinksTree.length > 0 : false;
    let editedHtml = html``;
    if (isEdited) {
      editedHtml = html`<span class="edited" @click=${() => {
        this.dispatchEvent(threadJumpEvent(maybe![0]));
      }}>${msg("(edited)")}</span>`;
    }
    let value = this._zvm.perspective.getLatestEdit(this.hash)!;
    if (beadInfo.beadType == ThreadsEntryType.EncryptedBead) {
      value = tm.value;
    }

    /** Check for __URL__ */
    if (value.startsWith("__URL__")) {
      const attachmentJson = value.substring("__URL__".length);
      //return html`<a href=${attachment.url} target="_blank">${attachment.fileName}</a>`;
        return html`<chat-attachment .attachment=${attachmentJson}></chat-attachment>`;
    }

    //md.use(emoji/* , options */);
    const result = md.render(value);
    const parsed = unsafeHTML(result);
    //const parsed = result; // FOR DEBUGGING

    /** render all */
    return html`<div id="chat-text" class="chatMsg">${parsed}${editedHtml}</div>`;
  }


  /** */
  static override get styles() {
    return [
      codeStyles,
      sharedStyles,
      css`
        .chatMsg {
          margin: 0px;
        } 
        .edited { 
          color:grey;
          font-size:10px;
        }
        .edited:hover {
          text-decoration: underline;
          cursor: pointer;
        }
      `,];
  }
}
