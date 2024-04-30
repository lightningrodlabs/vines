import {css, html} from "lit";
import {customElement, property} from "lit/decorators.js";
import {DnaElement} from "@ddd-qc/lit-happ";
import {ThreadsDvm} from "../viewModels/threads.dvm";
import {msg} from "@lit/localize";
import {sharedStyles} from "../styles";
import {renderAvatar} from "../render";

import TextArea from "@ui5/webcomponents/dist/TextArea.js";
import {MAIN_TOPIC_HASH, parseMentions} from "../utils";
import {ThreadsEntryType} from "../bindings/threads.types";
import {weClientContext} from "../contexts";
import {consume} from "@lit/context";
import {WeServicesEx} from "@ddd-qc/we-utils";
import {getMainThread} from "../utils_feed";


/**
 * @element
 */
@customElement("post-header")
export class PostHeader extends DnaElement<unknown, ThreadsDvm> {

  @consume({ context: weClientContext, subscribe: true })
  weServices!: WeServicesEx;


  get inputElem(): TextArea {
    return this.shadowRoot.getElementById("textMessageInput") as unknown as TextArea;
  }


  /** */
  handleKeydown(e) {
    // //console.log("keydown", e);
    // const isSuggesting = this.popoverElem && this.popoverElem.isOpen();
    // //console.log("Input keydown keyCode", e.keyCode, isSuggesting, this.inputElem.value);
    // if (isSuggesting) {
    //   this.handleSuggestingKeydown(e);
    //   return;
    // }
    /** Enter: commit message */
    if (e.keyCode === 13) {
      if (e.shiftKey) {
        /* FIXME add newline to input.value */
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
    // const threads = this._dvm.threadsZvm.perspective.threadsPerSubject[MAIN_TOPIC_HASH];
    // if (!threads || threads.length == 0) {
    //   return;
    // }
    // const mainThreadAh = threads[0];
    const mainThreadAh = getMainThread(this._dvm);

    console.log(`commitInput() value "${this.inputElem.value}"`, mainThreadAh);
    //this.dispatchEvent(new CustomEvent('input', {detail: this.inputElem.value, bubbles: true, composed: true}));

    const inputText = this.inputElem.value;
    const mentionedAgents = parseMentions(inputText, this._dvm.profilesZvm);
    let res = await this._dvm.publishTypedBead(ThreadsEntryType.TextBead, inputText, mainThreadAh, this.cell.agentPubKey, mentionedAgents);
    console.log("commitInput() res:", res);

    this.inputElem.value = "";
    //this._cacheInputValue = "";
  }


  /** */
  render() {
    console.log("<post-header>.render() mainThreadContext", this._dvm.threadsZvm.perspective.threadsPerSubject[MAIN_TOPIC_HASH]);

    const avatar = renderAvatar(this._dvm.profilesZvm, this.cell.agentPubKey, "S");

    /** render all */
    return html`
        <div id="post-header">
          ${avatar}
          <!-- <ui5-input placeholder=${msg('Whats up?')} @click=${(e) => {}}></ui5-input> -->
          <ui5-textarea id="textMessageInput" mode="SingleSelect"
                        placeholder=${msg('Whats up?')}
                        growing
                        growing-max-lines="3"
                        rows="1"
                        maxlength="1000"
                        @keydown=${this.handleKeydown}
                        @input=${(_e) => this.requestUpdate()}
          ></ui5-textarea>
        </div>
    `;
  }


  /** */
  static get styles() {
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
