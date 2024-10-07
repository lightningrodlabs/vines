import {css, html} from "lit";
import {customElement} from "lit/decorators.js";
import {DnaElement} from "@ddd-qc/lit-happ";
import {ThreadsDvm} from "../viewModels/threads.dvm";
import {msg} from "@lit/localize";
import {sharedStyles} from "../styles";
import {renderAvatar} from "../render";

import TextArea from "@ui5/webcomponents/dist/TextArea.js";
import {ThreadsEntryType} from "../bindings/threads.types";
import {weClientContext} from "../contexts";
import {consume} from "@lit/context";
import {WeServicesEx} from "@ddd-qc/we-utils";
import {getMainThread, MAIN_TOPIC_ID} from "../utils_feed";


/**
 * @element
 */
@customElement("post-header")
export class PostHeader extends DnaElement<unknown, ThreadsDvm> {

  @consume({ context: weClientContext, subscribe: true })
  weServices!: WeServicesEx;


  get inputElem(): TextArea {
    return this.shadowRoot!.getElementById("textMessageInput") as unknown as TextArea;
  }


  /** */
  handleKeydown(e:any) {
    // //console.log("keydown", e);
    // const isSuggesting = this.popoverElem && this.popoverElem.isOpen();
    // //console.log("Input keydown keyCode", e.keyCode, isSuggesting, this.inputElem.value);
    // if (isSuggesting) {
    //   this.handleSuggestingKeydown(e:any);
    //   return;
    // }
    /** Enter: commit message */
    if (e.keyCode === 13) {
      if (e.shiftKey) {
        /* Add newline to input.value? */
      } else {
        console.log("keydown keyCode ENTER", this.inputElem.value);
        e.preventDefault();
        this.commitInput();
      }
    }
  }


  /** */
  private async commitInput() {
    if (!this.inputElem.value || this.inputElem.value.length == 0) {
      return;
    }
    const mainThreadAh = getMainThread(this._dvm);
    console.log(`commitInput() value "${this.inputElem.value}"`, mainThreadAh);
    const inputText = this.inputElem.value;
    let res = await this._dvm.publishTypedBead(ThreadsEntryType.TextBead, inputText, mainThreadAh!, this.cell.address.agentId);
    console.log("commitInput() res:", res);
    this.inputElem.value = "";
  }


  /** */
  override render() {
    console.log("<post-header>.render() mainThreadContext", this._dvm.threadsZvm.perspective.threadsPerOrigSubject.get(MAIN_TOPIC_ID.b64));
    const avatar = renderAvatar(this._dvm.profilesZvm, this.cell.address.agentId, "S");
    /** render all */
    return html`
        <div id="post-header">
          ${avatar}
          <!-- <ui5-input placeholder=${msg('Whats up?')} @click=${(_e:any) => {}}></ui5-input> -->
          <ui5-textarea id="textMessageInput" mode="SingleSelect"
                        placeholder=${msg('Whats up?')}
                        growing
                        growing-max-lines="3"
                        rows="1"
                        maxlength="1000"
                        @keydown=${this.handleKeydown}
                        @input=${(_e:any) => this.requestUpdate()}
          ></ui5-textarea>
        </div>
    `;
  }


  /** */
  static override get styles() {
    return [
      sharedStyles,
      css`
        #post-header {
          display: flex; 
          flex-direction: row;
          gap:10px;
          min-height: 55px;
          margin: 5px 5px 10px 10px;
          box-shadow: rgba(0, 0, 0, 0.2) 0px 8px 30px 0px;
          border-radius: 6px;
          padding:10px;
          background: #cdd2c9;
        }
      `,];
  }
}
