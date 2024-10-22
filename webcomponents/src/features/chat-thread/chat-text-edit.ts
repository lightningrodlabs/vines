import {css, html} from "lit";
import {property, customElement} from "lit/decorators.js";
import {ActionId, ZomeElement} from "@ddd-qc/lit-happ";
import {ThreadsPerspective} from "../../viewModels/threads.perspective";
import {ThreadsZvm} from "../../viewModels/threads.zvm";
import {sharedStyles} from "../../styles";
import {codeStyles} from "../../markdown/code-css";
import {TextBeadMat} from "../../viewModels/threads.materialize";

import TextArea from "@ui5/webcomponents/dist/TextArea";


/**
 * @element
 */
@customElement("chat-text-edit")
export class ChatTextEdit extends ZomeElement<ThreadsPerspective, ThreadsZvm> {

  constructor() {
    super(ThreadsZvm.DEFAULT_ZOME_NAME);
  }

  /** Hash of TextBead to display */
  @property() hash!: ActionId;


  get value(): string {
    const elem = this.shadowRoot!.getElementById("chat-text-edit") as unknown as TextArea;
    return elem.value;
  }

  /** */
  handleKeydown(e:any) {
    //console.log("keydown", e);
    /** Enter: commit message */
    if (e.keyCode === 13) {
      if (e.shiftKey) {
        /* add newline to input.value?? */
      } else {
        const elem = this.shadowRoot!.getElementById("chat-text-edit") as unknown as TextArea;
        console.log("<chat-text-edit> keydown keyCode ENTER", elem.value);
        e.preventDefault(); e.stopPropagation();
        this.dispatchEvent(new CustomEvent<string>('edit-bead', {detail: elem.value, bubbles: true, composed: true}));
      }
    }
  }


  /** */
  override render() {
    //console.debug("<chat-text>.render()", this.hash);
    if (!this.hash) {
      return html`<div style="color:red">No message found</div>`;
    }

    const tm = this._zvm.perspective.getBaseBead(this.hash) as TextBeadMat;
    if (!tm) {
      return html`<ui5-busy-indicator delay="0" size="Medium" active style="margin:auto; width:50%; height:50%;"></ui5-busy-indicator>`;
    }
    const value = this._zvm.perspective.getLatestEdit(this.hash);
    /** render all */
    //                               @input=${(_e:any) => this.requestUpdate()}
    return html`<ui5-textarea id="chat-text-edit" 
                              .value=${value}
                              growing
                              @keydown=${this.handleKeydown}
    ></ui5-textarea>`;
  }


  /** */
  static override get styles() {
    return [
      codeStyles,
      sharedStyles,
      css`
        ui5-textarea {
          margin: 0px;
        }        
      `,];
  }
}
