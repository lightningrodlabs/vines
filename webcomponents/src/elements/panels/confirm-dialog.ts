import {css, html, LitElement, PropertyValues} from "lit";
import {property, state, customElement} from "lit/decorators.js";
import {sharedStyles} from "../../styles";

import Dialog from "@ui5/webcomponents/dist/Dialog";
import {msg} from "@lit/localize";


/**
 * @element
 */
@customElement("confirm-dialog")
export class ConfirmDialog extends LitElement {

  @property() title: string;

  open() {
    const dialog = this.shadowRoot.getElementById("confirm-dialog") as Dialog;
    dialog.open = true;
  }

  /** */
  render() {
    return html`
        <ui5-dialog id="confirm-dialog" header-text=${this.title}>
            <div class="footer">
                <ui5-button style="margin-top:5px" design="Emphasized" 
                            @click=${(e) => {
                                this.dispatchEvent(new CustomEvent('confirmed', {detail: true, bubbles: true, composed: true}));
                                const dialog = this.shadowRoot.getElementById("confirm-dialog") as Dialog;
                                dialog.close(false);
                            }}>
                    ${msg('Confirm')}
                </ui5-button>
                <ui5-button style="margin-top:5px" @click=${() => {
                      const dialog = this.shadowRoot.getElementById("confirm-dialog") as Dialog;
                      dialog.close(false);
                    }}>
                  ${msg('Cancel')}
                </ui5-button>
            </div>
        </ui5-dialog>
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
        
        .footer {
          display: flex;
          gap: 10px;
          justify-content: center;
        }
      `
    ];
  }
}
