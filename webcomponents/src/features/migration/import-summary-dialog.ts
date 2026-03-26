import {css, html, LitElement} from "lit";
import {customElement, state} from "lit/decorators.js";
import {msg} from "@lit/localize";
import Dialog from "@ui5/webcomponents/dist/Dialog";
import {sharedStyles} from "../../styles";
import {ImportData} from "./import-utils";
import {ImportConfirmed} from "./import-summary";


/**
 * @element
 */
@customElement("import-summary-dialog")
export class ImportSummaryDialog extends LitElement {

  @state() private _data: ImportData | undefined;

  open(data: ImportData) {
    this._data = data;
    const dialog = this.shadowRoot!.getElementById("import-dialog") as Dialog;
    console.log("<import-summary>.open()", data, dialog);
    dialog.open = true;
  }

  /** */
  override render() {
    return html`
        <ui5-dialog id="import-dialog" header-text=${msg("Import Summary")}>
            <import-summary .data=${this._data}
                            @import-confirmed=${(_e: CustomEvent<ImportConfirmed>) => {
                                const dialog = this.shadowRoot!.getElementById("import-dialog") as Dialog;
                                dialog.close(false);
                            }}
                            @import-canceled=${(_e: CustomEvent<boolean>) => {
                              this._data = undefined;
                              const dialog = this.shadowRoot!.getElementById("import-dialog") as Dialog;
                              dialog.close(false);
                            }}
            ></import-summary>             
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
