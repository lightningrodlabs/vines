import {css, html, LitElement, PropertyValues} from "lit";
import {property, state, customElement} from "lit/decorators.js";
import {sharedStyles} from "../../styles";

import Input from "@ui5/webcomponents/dist/Input";
import {msg} from "@lit/localize";
import {consume} from "@lit/context";
import {weClientContext} from "../../contexts";
import {WeServicesEx} from "@ddd-qc/we-utils";


/**
 * @element
 */
@customElement("create-post-panel")
export class CreatePostPanel extends LitElement {


  @consume({ context: weClientContext, subscribe: true })
  weServices!: WeServicesEx;


  /** */
  onCreate() {
    const content = (this.shadowRoot.getElementById("purposeInput") as Input).value;
    this.dispatchEvent(new CustomEvent('create', {detail: content, bubbles: true, composed: true}))
  }


  /** */
  render() {
    return html`
      <section>
          <div>
            <ui5-label for="purposeInput" required>Content:</ui5-label>
            <ui5-input id="purposeInput" value=${msg('Message')}></ui5-input>
          </div>
      </section>
      <div slot="footer" class="footer">
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
          /*background: darkgray;*/
        }
        
        section {
          padding-left: 10px;
          padding-top: 5px;
        }
        
        .footer {
          display: flex;
          gap: 5px;
          margin-left: 10px;
          margin-top: 10px;
        }
      `
    ];
  }
}
