import {css, html, PropertyValues} from "lit";
import {property, state, customElement} from "lit/decorators.js";
import {ZomeElement} from "@ddd-qc/lit-happ";
import {ActionHashB64} from "@holochain/client";
import {ThreadsPerspective} from "../viewModels/threads.perspective";
//import {ChatThreadView} from "./chat-thread-view";
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import markdownit from 'markdown-it'
import {ThreadsZvm} from "../viewModels/threads.zvm";


/**
 * @element
 */
@customElement("chat-message")
export class ChatMessage extends ZomeElement<ThreadsPerspective, ThreadsZvm> {

  constructor() {
    super(ThreadsZvm.DEFAULT_ZOME_NAME);
  }


  /** Hash of TextMessage to display */
  @property() hash: ActionHashB64 = ''


  /** */
  render() {
    //console.log("<chat-message-item>.render()", this.hash);
    if (this.hash == "") {
      return html`
          <div style="color:red">No message found</div>`;
    }

    const texto = this.perspective.textMessages[this.hash];
    if (!texto) {
      return html`<ui5-busy-indicator size="Medium" active style="margin:auto; width:50%; height:50%;"></ui5-busy-indicator>`;
    }

    const md = markdownit();
    //const md = markdownit().use(emoji/* , options */);
    const result = md.render(texto.message);
    const parsed = unsafeHTML(result);

    /** render all */
    return html`<div class="chatMsg">${parsed}</div>`;
  }


  /** */
  static get styles() {
    return [
      css`
        .chatMsg {
          margin: 5px 5px 5px 5px;
        }        
      `,];
  }
}
