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


  /** Opens the dialog and resolves with true on Confirm, false when it closes any other way
   *  (Cancel, Escape, or the close button). */
  confirm(): Promise<boolean> {
    const dialog = this.shadowRoot!.getElementById("confirm-dialog") as Dialog;
    return new Promise((resolve) => {
      let confirmed = false;
      const onConfirmed = () => { confirmed = true; };
      this.addEventListener('confirmed', onConfirmed);
      dialog.addEventListener('close', () => {
        this.removeEventListener('confirmed', onConfirmed);
        resolve(confirmed);
      }, {once: true});
      dialog.open = true;
    });
  }


  /** */
  override render() {
    return html`
        <ui5-dialog id="confirm-dialog" header-text=${this.title}>
            <slot></slot>
            <div class="dialog-footer">
                <ui5-button style="margin-top:5px" @click=${() => {
      const dialog = this.shadowRoot!.getElementById("confirm-dialog") as Dialog;
      dialog.open = false;
    }}>
                  ${msg('Cancel')}
                </ui5-button>
                <ui5-button style="margin-top:5px" design="Emphasized" 
                            @click=${(_e: any) => {
      this.dispatchEvent(new CustomEvent<boolean>('confirmed', {detail: true, bubbles: true, composed: true}));
      const dialog = this.shadowRoot!.getElementById("confirm-dialog") as Dialog;
      dialog.open = false;
    }}>
                    ${msg('Confirm')}
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
        }
        
      `
    ];
  }
}
