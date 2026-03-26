import {css, html, LitElement} from "lit";
import {customElement, state} from "lit/decorators.js";
import {msg} from "@lit/localize";
import Dialog from "@ui5/webcomponents/dist/Dialog";
import {sharedStyles} from "../../styles";
import {ImportData} from "./import-utils";


/**
 * @element
 */
@customElement("import-summary")
export class ImportSummary extends LitElement {

  @state() private _data: ImportData | undefined;

  open(data: ImportData) {
    console.log("<import-summary>.open()", data);
    this._data = data;
    const dialog = this.shadowRoot!.getElementById("import-dialog") as Dialog;
    dialog.open = true;
  }

  /** */
  override render() {
    return html`
        <ui5-dialog id="import-dialog" header-text=${msg("Import Summary")}>
            ${!this._data? html `Loading...` : html`${JSON.stringify(this._data)}`}
            <div class="footer">
                <ui5-button style="margin-top:5px" design="Emphasized"
                            @click=${(_e: any) => {
                                this.dispatchEvent(new CustomEvent<boolean>('confirmed-import', {detail: true, bubbles: true, composed: true}));
                                const dialog = this.shadowRoot!.getElementById("import-dialog") as Dialog;
                                dialog.close(false);
                            }}>
                    ${msg('Confirm')}
                </ui5-button>
                <ui5-button style="margin-top:5px" @click=${() => {
                    const dialog = this.shadowRoot!.getElementById("import-dialog") as Dialog;
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
              display: flex;
              flex-direction: column;
              gap: 5px;
          }
          
    `]}
}
