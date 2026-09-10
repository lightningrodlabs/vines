import {css, html, LitElement} from "lit";
import {/*property,*/ customElement} from "lit/decorators.js";
import {sharedStyles} from "../../styles";
import {msg} from "@lit/localize";

//import Dialog from "@ui5/webcomponents/dist/Dialog";
import "@shoelace-style/shoelace/dist/components/dialog/dialog.js";
import "@shoelace-style/shoelace/dist/components/icon-button/icon-button.js";
import {SlDialog} from "@shoelace-style/shoelace";


/**
 * @element
 */
@customElement("view-embed-dialog")
export class ViewEmbedDialog extends LitElement {

  private _blobUrl: string = "";
  private _mime: string = "";
  private _name: string = "";


  /** -- Methods -- */

  /** */
  open(blobUrl: string, mime: string, name?: string) {
    if (!blobUrl) {
      console.warn("BlobUrl is empty");
      return;
    }
    this._blobUrl = blobUrl;
    this._mime = mime;
    this._name = name ?? "";
    const dialog = this.shadowRoot!.getElementById("view-embed-dialog") as SlDialog;
    //dialog.open = true;
    dialog.show();
    this.requestUpdate();
  }


  /** */
  close() {
    const dialog = this.shadowRoot!.getElementById("view-embed-dialog") as SlDialog;
    dialog.hide();
  }


  /** Same technique FilesDvm.downloadFile() ends with, which is what already
   *  works in Moss for other attachments -- but the image is already in memory
   *  as this blob, so there is nothing to fetch again. */
  private download() {
    if (!this._blobUrl) {
      return;
    }
    const a = document.createElement("a");
    a.href = this._blobUrl;
    a.download = this._name || "download";
    a.click();
  }


  /** Runs however the dialog was closed -- the x, Escape, or a click outside.
   *  Clears state only. The blob URL is NOT revoked here: it belongs to the
   *  chat-file that passed it in, which keeps using the same URL for the inline
   *  preview and passes it again on every click. Revoking it here broke every
   *  view after the first (net::ERR_FILE_NOT_FOUND). */
  private onAfterHide(e: Event) {
    /** sl-after-hide bubbles from anything inside that hides, e.g. tooltips. */
    if (e.target !== e.currentTarget) {
      return;
    }
    this._blobUrl = "";
    this._mime = "";
    this._name = "";
  }


  /** */
  override render() {
    /** A header -- the file name and a close button -- rather than no-header:
     *  with no header and no body padding the image filled the panel edge to
     *  edge, so nothing said it was a dialog or how to leave it. */
    return html`
        <sl-dialog id="view-embed-dialog" label=${this._name || msg("Preview")}
                   style="--width: 90vw; --body-spacing: 8px"
                   @sl-after-hide=${(e: Event) => this.onAfterHide(e)}>
            <sl-icon-button slot="header-actions" name="download" label=${msg("Download")}
                            @click=${() => this.download()}></sl-icon-button>
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
          display: block;
          width: 100%;
          /* Leaves room for the header inside the viewport. */
          max-height: calc(90vh - 80px);
          object-fit: contain;
        }
      `
    ];
  }
}
