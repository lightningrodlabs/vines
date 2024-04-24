import {css, html} from "lit";
import {customElement, property} from "lit/decorators.js";
import {DnaElement} from "@ddd-qc/lit-happ";
import {ThreadsDvm} from "../viewModels/threads.dvm";
import {msg} from "@lit/localize";
import {sharedStyles} from "../styles";
import {renderAvatar} from "../render";

import TextArea from "@ui5/webcomponents/dist/TextArea.js";
import {MAIN_SUBJECT_HASH, parseMentions} from "../utils";
import {ThreadsEntryType} from "../bindings/threads.types";
import {THIS_APPLET_ID, weClientContext} from "../contexts";
import {consume} from "@lit/context";
import {WeServicesEx} from "@ddd-qc/we-utils";

/**
 * @element
 */
@customElement("post-header")
export class PostHeader extends DnaElement<unknown, ThreadsDvm> {

  constructor() {
    super(ThreadsDvm.DEFAULT_BASE_ROLE_NAME);
  }


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
    console.log(`Commit input value "${this.inputElem.value}"`);
    //this.dispatchEvent(new CustomEvent('input', {detail: this.inputElem.value, bubbles: true, composed: true}));

    const inputText = this.inputElem.value;
    const mentionedAgents = parseMentions(inputText, this._dvm.profilesZvm);
    const appletId = this.weServices? this.weServices.appletId : THIS_APPLET_ID;
    let tuple = await this._dvm.publishThreadFromSemanticTopic(appletId, MAIN_SUBJECT_HASH, "none");
    let res = await this._dvm.publishTypedBead(ThreadsEntryType.TextBead, inputText, tuple[1], this.cell.agentPubKey, mentionedAgents);
    console.log("onCreateTextMessage() res:", res);

    this.inputElem.value = "";
    //this._cacheInputValue = "";
  }


  /** */
  render() {
    console.log("<post-header>.render()");

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
          min-height: 55px;
          margin: 5px 5px 10px 10px;
          box-shadow: rgba(0, 0, 0, 0.2) 0px 8px 30px 0px;
        }
      `,];
  }
}
