import {customElement, property, state} from "lit/decorators.js";
import {FileTableItem, prettyFileSize} from "@ddd-qc/files";
import {css, html, LitElement} from "lit";
import {sharedStyles} from "../../styles";
import {msg} from "@lit/localize";
import Dialog from "@ui5/webcomponents/dist/Dialog";
import JSZip from "jszip";

/** */
export async function downloadFilesAsZip(files: File[], zipName = "download.zip"): Promise<void> {
  const zip = new JSZip();

  // Add each file to the zip
  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer();
    zip.file(file.name, arrayBuffer);
  }

  // Generate the zip blob
  const blob = await zip.generateAsync({ type: "blob" });

  // Trigger download
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = zipName;
  anchor.click();

  // Cleanup
  URL.revokeObjectURL(url);
}


/**
 * @element
 */
@customElement("export-files-dialog")
export class ExportFilesDialog extends LitElement {

  @state() private _selectedFiles: Set<string> = new Set();

  @property() items: FileTableItem[] = [];

  private _selectedSize: number = 0;

  /** */
  open() {
    const dialog = this.shadowRoot!.getElementById("export-dialog") as Dialog;
    dialog.open = true;
    this.requestUpdate();
  }



  /** */
  private toggleChannel(key: string) {
    const selection = new Set(this._selectedFiles);
    const item = this.items.find((item) => item.ppEh == key)!;
    if (selection.has(key)) {
      selection.delete(key);
      this._selectedSize -= item.description.size;
    } else {
      selection.add(key);
      this._selectedSize += item.description.size;
    }
    this._selectedFiles = selection;
  }


  /** */
  private toggleAll() {
    const allKeys = this.items.map((item) => item.ppEh);
    this._selectedSize = 0;
    if (this._selectedFiles.size === allKeys.length) {
      this._selectedFiles = new Set();
    } else {
      this._selectedFiles = new Set(allKeys);
      this.items.map((item) => this._selectedSize += item.description.size)
    }
  }


  /** */
  override render() {
    console.log("<export-files-dialog>.render()", this.items.length);

    const allSelected = this._selectedFiles.size === this.items.length;




    /** render all */
    return html`
        <ui5-dialog id="export-dialog" header-text=${msg("Export Files")}>
          <div id="content">
              <div class="select-all-row">
                  <ui5-button @click=${this.toggleAll}>${allSelected? msg('Deselect All'): msg('Select All')}</ui5-button>
              </div>
              <div class="channel-section">
               <div class="channel-list">
              ${this.items.map((item) => {
                const selected = this._selectedFiles.has(item.ppEh);                 
                return html`
                    <div class="channel-item ${selected ? "selected" : ""}"
                         @click=${() => this.toggleChannel(item.ppEh)}
                         role="checkbox"
                         .aria-checked=${selected}
                         tabindex="0"
                         @keydown=${(e: KeyboardEvent) => {
                             if (e.key === "Enter") {
                                 e.preventDefault();
                                 this.toggleChannel(item.ppEh);
                             }
                         }}>
                        <ui5-checkbox ?checked=${selected}></ui5-checkbox>
                        <span class="channel-name">${item.description.name}</span>
                        <span class="channel-meta">${prettyFileSize(item.description.size)}</span>
                    </div>                    
               `})}
               </div>
            </div>
              <div style="margin-top:15px; display: flex; flex-direction: row; gap:3px; padding: 0px 15px 0px 5px;">
                  <div>${msg("Total")}: ${this._selectedFiles.size}</div>
                  <div style="flex-grow: 1"></div>
                  <div>${prettyFileSize(this._selectedSize)}</div>
              </div>              
          </div>
            <!-- Footer -->
            <div slot="footer" class="footer">
                <div style="flex-grow: 1"></div>
                <ui5-button style="margin-top:5px" design="Emphasized"
                            ?disabled=${this._selectedFiles.size === 0}
                            @click=${(_e: any) => {                               
                                this.dispatchEvent(new CustomEvent<any>('export-confirmed', {
                                    detail: this._selectedFiles,
                                    bubbles: true, composed: true}));
                                const dialog = this.shadowRoot!.getElementById("export-dialog") as Dialog;
                                dialog.close(false);
                            }}>
                    ${msg('Export')}
                </ui5-button>
                <ui5-button style="margin-top:5px"
                            @click=${() => {
                                this.dispatchEvent(new CustomEvent<any>('export-confirmed', {
                                    detail: new Set(),
                                    bubbles: true, composed: true}));
                                const dialog = this.shadowRoot!.getElementById("export-dialog") as Dialog;
                                dialog.close(false);
                            }}>
                    ${msg('Export Manifests')}
                </ui5-button>
                <ui5-button style="margin-top:5px"
                            @click=${() => {
                                const dialog = this.shadowRoot!.getElementById("export-dialog") as Dialog;
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
          }

          ui5-dialog {
              width: 540px;
          }

          #content {
              display: flex;
              flex-direction: column;
              width: 500px;
              max-height: 80vh;
              padding: 0;
              margin: 0;
          }
          
          .channel-list {
              background: #ebebeb9e;
              border-radius: 10px;
              display: flex;
              flex-direction: column;
              gap: 0.35rem;
              margin-right: 10px;
          }

          .channel-item {
              display: flex;
              align-items: center;
              gap: 0.6rem;
              /*padding: 0.5rem 0.75rem;*/
              border-radius: 0.375rem;
              cursor: pointer;
              transition: background 0.15s ease;
              border: 1px solid transparent;
              user-select: none;
          }

          .channel-item:hover {
              background: var(--sapList_Hover_Background, #f5f5f5);
          }

          .channel-item.selected {
              background: var(--sapList_SelectionBackgroundColor, #e8f3ff);
              border-color: var(--sapSelectedColor, #0070f2);
          }

          .channel-icon {
              font-size: 1rem;
              width: 1.25rem;
              text-align: center;
              flex-shrink: 0;
          }

          .channel-name {
              flex: 1;
              font-size: var(--sapFontSize, 1.0rem);
              color: var(--sapTextColor, #32363a);
              overflow: hidden;
              text-overflow: ellipsis;
              text-wrap: nowrap;
          }

          .channel-meta {
              font-size: 0.875rem;
              padding-right: 0.75rem;
              color: var(--sapContent_LabelColor, #6a6d70);
          }

          .select-all-row {
              display: flex;
              align-items: center;
              gap: 0.75rem;
              margin-bottom: 0.75rem;
              padding: 0 0.25rem;
          }

          .channel-section {
              /*margin-bottom: 1.5rem;*/
              flex: 1;
              overflow-y: auto;
              min-height: 0;
          }

          .footer {
              display: flex;
              flex-shrink: 0;
              gap: 10px;
              justify-content: flex-end;
              padding: 4px;
          }
      `];
  }
}
