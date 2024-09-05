import {css, html, LitElement} from "lit";
import {/*property,*/ customElement} from "lit/decorators.js";
import {sharedStyles} from "../../styles";

//import Dialog from "@ui5/webcomponents/dist/Dialog";
import "@shoelace-style/shoelace/dist/components/dialog/dialog.js";
import {SlDialog} from "@shoelace-style/shoelace";


/**
 * @element
 */
@customElement("view-embed-dialog")
export class ViewEmbedDialog extends LitElement {

  private _blobUrl: string  = "";
  private _mime: string = "";


  /** -- Methods -- */

  /** */
  open(blobUrl: string, mime: string) {
    if (!blobUrl) {
      console.warn("BlobUrl is empty");
      return;
    }
    this._blobUrl = blobUrl;
    this._mime = mime;
    const dialog = this.shadowRoot!.getElementById("view-embed-dialog") as SlDialog;
    //dialog.open = true;
    dialog.show();
    this.requestUpdate();
  }


  /** */
  close() {
    const dialog = this.shadowRoot!.getElementById("view-embed-dialog") as SlDialog;
    dialog.hide();
    if (this._blobUrl) {
      URL.revokeObjectURL(this._blobUrl);
      this._blobUrl = "";
      this._mime = "";
    }
  }


  /** */
  override render() {
    console.log("<view-embed-dialog>.render()", this._mime, this._blobUrl?.length);
    return html`
        <sl-dialog id="view-embed-dialog" no-header style="--width: 90vw; --body-spacing: 0px">
            <embed class="${this._mime}" .src=${this._blobUrl} .type=${this._mime} />
        </sl-dialog>
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
        
        embed {
          width: 100%;
          max-height: 90vh;
          object-fit: contain;
        }
      `
    ];
  }
}
