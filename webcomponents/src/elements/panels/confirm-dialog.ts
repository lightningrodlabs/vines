import {css, html, LitElement} from "lit";
import {property, customElement} from "lit/decorators.js";
import {sharedStyles} from "../../styles";

import Dialog from "@ui5/webcomponents/dist/Dialog";
import {msg} from "@lit/localize";


/**
 * @element
 */
@customElement("confirm-dialog")
export class ConfirmDialog extends LitElement {

  @property() override title: string = "";

  open() {
    const dialog = this.shadowRoot!.getElementById("confirm-dialog") as Dialog;
    dialog.open = true;
  }

  /** */
  override render() {
    return html`
        <ui5-dialog id="confirm-dialog" header-text=${this.title}>
            <div class="footer">
                <ui5-button style="margin-top:5px" design="Emphasized" 
                            @click=${(_e:any) => {
                                this.dispatchEvent(new CustomEvent<boolean>('confirmed', {detail: true, bubbles: true, composed: true}));
                                const dialog = this.shadowRoot!.getElementById("confirm-dialog") as Dialog;
                                dialog.close(false);
                            }}>
                    ${msg('Confirm')}
                </ui5-button>
                <ui5-button style="margin-top:5px" @click=${() => {
                      const dialog = this.shadowRoot!.getElementById("confirm-dialog") as Dialog;
                      dialog.close(false);
                    }}>
                  ${msg('Cancel')}
                </ui5-button>
            </div>
        </ui5-dialog>
    `;
  }


  /** */
  static override get styles() {
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
