import {css, html, LitElement, PropertyValues} from "lit";
import {property, state, customElement} from "lit/decorators.js";
import {sharedStyles} from "../styles";

import Input from "@ui5/webcomponents/dist/Input";
import {msg} from "@lit/localize";


/** */
export interface CreateThreadRequest {
  purpose: string,
  rules: string,
  wurl: string,
}


/**
 * @element
 */
@customElement("create-thread-panel")
export class CreateThreadPanel extends LitElement {


  /** */
  onCreate() {
    /** */
    const input: CreateThreadRequest = {
      purpose: (this.shadowRoot.getElementById("purposeInput") as Input).value,
      wurl: (this.shadowRoot.getElementById("wurlInput") as Input).value,
      rules: "N/A",
    }
    this.dispatchEvent(new CustomEvent<CreateThreadRequest>('create', {detail: input, bubbles: true, composed: true}))
  }


  /** */
  render() {
    return html`
      <section>
          <div>
            <ui5-label for="purposeInput" required>Purpose:</ui5-label>
            <ui5-input id="purposeInput" value=${msg('comment')}></ui5-input>
          </div>
          <div>
              <ui5-label for="wurlInput" required>Subject weaveURL:</ui5-label>
              <ui5-input id="wurlInput"></ui5-input>
          </div>          
      </section>
      <div slot="footer" style:"display:flex;">
        <ui5-button style="margin-top:5px" design="Emphasized" @click=${(e) => this.onCreate()}>
            Create
        </ui5-button>
        <ui5-button style="margin-top:5px" @click=${(e) => this.dispatchEvent(new CustomEvent('cancel', {detail: null, bubbles: true, composed: true}))}>
            Cancel
        </ui5-button>
      </div>
    `;
  }


  /** */
  static get styles() {
    return [
      sharedStyles,
      css`
      :host {
        background: darkgray;
      }`
    ];
  }
}
