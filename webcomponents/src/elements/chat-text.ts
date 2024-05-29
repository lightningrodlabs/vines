import {css, html, PropertyValues} from "lit";
import {property, state, customElement} from "lit/decorators.js";
import {ZomeElement} from "@ddd-qc/lit-happ";
import {ActionHashB64} from "@holochain/client";
import {TextBeadMat, ThreadsPerspective} from "../viewModels/threads.perspective";
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import {ThreadsZvm} from "../viewModels/threads.zvm";
import {sharedStyles} from "../styles";
import {md} from "../markdown/md";
import {codeStyles} from "../markdown/code-css";


/**
 * @element
 */
@customElement("chat-text")
export class ChatText extends ZomeElement<ThreadsPerspective, ThreadsZvm> {

  constructor() {
    super(ThreadsZvm.DEFAULT_ZOME_NAME);
  }


  /** Hash of TextBead to display */
  @property() hash: ActionHashB64 = ''


  // /** */
  // updated() {
  //   /** Add target="_blank" to all links */
  //   const parentElement = this.shadowRoot.getElementById('chat-text');
  //   //console.log("<chat-text>.updated()", parentElement);
  //   const anchorTags = parentElement.querySelectorAll('a');
  //   //console.log("<chat-text>.updated() anchorTags ", anchorTags);
  //   anchorTags.forEach(function(anchorTag) {
  //     /** Add mention class if it's a mention */
  //     const url = new URL(anchorTag.href);
  //     const scheme = url.protocol;
  //     if (scheme == "agent:") {
  //       anchorTag.classList.add("mention")
  //     }
  //     console.log("anchorTag", anchorTag, scheme);
  //     anchorTag.setAttribute('target', '_blank');
  //   });
  // }


  /** */
  render() {
    //console.log("<chat-text>.render()", this.hash);
    if (this.hash == "") {
      return html`<div style="color:red">No message found</div>`;
    }

    const tm = this._zvm.getBaseBead(this.hash) as TextBeadMat;
    if (!tm) {
      return html`<ui5-busy-indicator delay="0" size="Medium" active style="margin:auto; width:50%; height:50%;"></ui5-busy-indicator>`;
    }
    //md.use(emoji/* , options */);
    const result = md.render(tm.value);
    const parsed = unsafeHTML(result);
    //const parsed = result; // FOR DEBUGGING

    /** render all */
    return html`<div id="chat-text" class="chatMsg">${parsed}</div>`;
  }


  /** */
  static get styles() {
    return [
      codeStyles,
      sharedStyles,
      css`
        .chatMsg {
          margin: 0px;
        }        
      `,];
  }
}
