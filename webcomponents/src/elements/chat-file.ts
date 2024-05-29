import {css, html, PropertyValues} from "lit";
import {customElement, property, state} from "lit/decorators.js";
import {delay, DnaElement} from "@ddd-qc/lit-happ";
import {ThreadsDvm} from "../viewModels/threads.dvm";
import {ActionHashB64, decodeHashFromBase64} from "@holochain/client";
import {consume} from "@lit/context";
import {globaFilesContext} from "../contexts";
import {FileHashB64, FilesDvm, FileType, kind2mime, kind2Type, prettyFileSize} from "@ddd-qc/files";
import {type2ui5Icon} from "../utils";
import {EntryBeadMat} from "../viewModels/threads.perspective";
import {ParcelManifest} from "@ddd-qc/delivery";
import {msg} from "@lit/localize";
import {toasty} from "../toast";
import {sharedStyles} from "../styles";


/**
 * @element
 */
@customElement("chat-file")
export class ChatFile extends DnaElement<unknown, ThreadsDvm> {

  constructor() {
    super(ThreadsDvm.DEFAULT_BASE_ROLE_NAME);
  }

  /** -- Properties -- */

  /** Hash of File bead to display */
  @property() hash: ActionHashB64 = '' // BeadAh
  @state() private _dataHash?: FileHashB64;

  @consume({ context: globaFilesContext, subscribe: true })
  _filesDvm!: FilesDvm;

  @state() private _loading = true;
  @state() private _manifest?: ParcelManifest = undefined;
           private _maybeFile: File | null = null;
           private _maybeBlobUrl?: string = undefined;


  /** -- Methods -- */

  /** Don't update during online loading */
  shouldUpdate(changedProperties: PropertyValues<this>) {
    //console.log("<chat-file>.shouldUpdate()", changedProperties, this.hash);
    const shouldnt = !super.shouldUpdate(changedProperties);
    if (shouldnt) {
      return false;
    }
    /** */
    if (changedProperties.has("hash")) {
      /* await */ this.loadFile();
    }
    return true;
  }


  /** */
  private async loadFile() {
    console.log("<chat-file>.loadFile()", this.hash);
    if (!this.hash || !this._filesDvm) {
      return;
    }
    this._loading = true;
    const entryBead = this._dvm.threadsZvm.getBaseBead(this.hash) as EntryBeadMat;
    if (!entryBead) {
      console.warn("<chat-file> Bead not found", this.hash);
      return;
    }
    try {
      const manifestEh = entryBead.sourceEh;
      console.log("<chat-file>.loadFile() manifestEh", manifestEh, this.hash);
      this._manifest = await this._filesDvm.filesZvm.zomeProxy.getFileInfo(decodeHashFromBase64(manifestEh));
      console.log(`<chat-file>.loadFile() ${this.hash}: ${this._manifest.description.size} < ${this._filesDvm.dnaProperties.maxChunkSize}?`, this._manifest, this._maybeFile);
      if (this._manifest && this._manifest.description.size < this._filesDvm.dnaProperties.maxChunkSize) {
        const mime = kind2mime(this._manifest.description.kind_info);
        const fileType = kind2Type(this._manifest.description.kind_info);
        console.log("<chat-file>.loadFile() fileType", fileType);
        if (fileType == "Binary" || fileType == "Zip" || fileType == "Other") {
            this._loading = false;
            this._maybeFile = null;
            return;
        }
        const data = await this._filesDvm.deliveryZvm.getParcelData(manifestEh);
        console.log("<chat-file>.loadFile() data", data.length);
        this._maybeFile = this._filesDvm.data2File(this._manifest, data);
        const reader = new FileReader();
        if (this._maybeBlobUrl) {
          URL.revokeObjectURL(this._maybeBlobUrl);
          this._maybeBlobUrl = undefined;
        }
        //this._maybeBlobUrl = URL.createObjectURL(this._maybeFile);
        reader.onload = (event) => {
          console.log("FileReader onload", event, mime)
          //this._maybeDataUrl = event.target.result;
          const blob = new Blob([event.target.result], {type: mime});
          this._maybeBlobUrl = URL.createObjectURL(blob);
          console.log("FileReader blob", blob, this._maybeBlobUrl)
          //this.requestUpdate();
          this._loading = false;
        };
        //reader.readAsDataURL(this._maybeFile);
        reader.readAsArrayBuffer(this._maybeFile);
      } else {
        this._loading = false;
        this._maybeFile = null;
      }
    } catch(e) {
      console.warn("Loading file failed:", this.hash, e);
      this._loading = false;
      this._maybeFile = null;
    }
  }


  /** */
  protected /*async*/ firstUpdated(_changedProperties: PropertyValues) {
    super.firstUpdated(_changedProperties);
    /*await*/ this.loadFile();
  }


  /** */
  render() {
    console.log("<chat-file>.render()", this.hash, this._loading, this._manifest, this._maybeFile /*this._dataHash*/);
    if (this.hash == "") {
      return html`<div style="color:#c10a0a">${msg("No file selected")}</div>`;
    }
    if (this._loading) {
      return html`<ui5-busy-indicator delay="0" size="Medium" active></ui5-busy-indicator>`;
    }
    if (!this._loading && !this._manifest) {
      return html`
          <ui5-list id="fileList">
              <ui5-li id="fileLi" class="fail" icon="synchronize" description=${this.hash}
                      @click=${async (e) => this.loadFile()}>
                  Missing File
              </ui5-li>
          </ui5-list>`;
    }
    const entryBead = this._dvm.threadsZvm.getBaseBead(this.hash) as EntryBeadMat;
    //console.log("<chat-file>.render() entryBead", entryBead);
    if (!entryBead) {
      return html`<ui5-busy-indicator delay="0" size="Medium" active style="margin:auto; width:50%; height:50%;"></ui5-busy-indicator>`;
    }
    const manifestEh = entryBead.sourceEh;
    const filePprm = this._filesDvm.deliveryZvm.perspective.publicParcels[manifestEh];
    if (!filePprm) {
      //return html`<ui5-busy-indicator size="Large" active style="margin:auto; width:50%; height:50%;"></ui5-busy-indicator>`;
      return html`
        <ui5-list id="fileList">
          <ui5-li id="fileLi" class="fail" icon="synchronize" description=${manifestEh}
                  @click=${async (e) => {
                      await this._filesDvm.deliveryZvm.probeDht();
                      const fileTuple = this._filesDvm.deliveryZvm.perspective.publicParcels[manifestEh];
                      if (fileTuple) {
                          this.requestUpdate();
                      }
                  }}>
            Missing File
          </ui5-li>
        </ui5-list>`;
    }
    const fileDesc = filePprm.description;


    const fileType = kind2Type(fileDesc.kind_info);

    let item = html`
        <ui5-list id="fileList">
          <ui5-li id="fileLi" icon=${type2ui5Icon(fileType)} description=${prettyFileSize(fileDesc.size)}
                  @click=${(e) => {this._filesDvm.downloadFile(entryBead.sourceEh); toasty("File downloaded: " + fileDesc.name);}}>
            ${fileDesc.name}
          </ui5-li>
        </ui5-list>`;

    // if (fileType == FileType.Image) {
    // let maybeCachedData = undefined;
    //   maybeCachedData = null;
    //   if (!this._dataHash) {
    //     console.log("File is image, dataHash not known");
    //     this._filesDvm.getFile(manifestEh).then(([manifest, data]) => {
    //       console.log("File is image, manifest", manifest.description.name, manifest.data_hash);
    //       const file = this._filesDvm.data2File(manifest, data);
    //       this._filesDvm.cacheFile(file);
    //       this._dataHash = manifest.data_hash;
    //       //this.requestUpdate();
    //     });
    //   } else {
    //     maybeCachedData = this._filesDvm.getFileFromCache(this._dataHash);
    //     if (!maybeCachedData) {
    //       console.warn("File cache not found", this._dataHash);
    //     }
    //   }
    //   if (maybeCachedData) {
    //     item = html`<img class="thumb" src=${"data:image/png;base64," + maybeCachedData}
    //                      @click=${(e) => this._filesDvm.downloadFile(entryBead.sourceEh)}>
    //     `;
    //   }
    // }


    const mime = kind2mime(this._manifest.description.kind_info);
    //const fileType = kind2Type(this._manifest.description.kind_info);

    if (this._maybeFile != null) {
      switch (fileType) {
        // case FileType.Text:
        //     // const tt = atob((this._maybeBlobUrl as string).split(',')[1]);
        //     // //const text = decodeURIComponent(escape(tt)));
        //     // console.log("FileType.Text", this._maybeDataUrl)
        //     // preview = html`<div id="preview" class="text">${tt}</div>`;
        //     preview = html`<embed id="preview" src=${this._maybeBlobUrl} type=${mime} width="440px" height="300px" />`;
        //     break;
        // case FileType.Pdf:
        //     preview = html`<embed id="preview" src=${this._maybeBlobUrl} type=${mime} width="440px" height="300px" />`;
        //     //preview = html`<embed id="preview" src=${this._maybeBlobUrl} type="application/pdf" width="100%" height="600px" />`;
        //     break;
        // case FileType.Image:
        //     preview = html`<img id="preview" src=${this._maybeBlobUrl} alt="Preview Image" />`;
        //     break;
        case FileType.Audio:
          item = html`
                        <audio class="preview Audio" controls>
                            <source src=${this._maybeBlobUrl} type=${mime}>
                            Your browser does not support the audio element.
                        </audio>
                    `;
          break;
        case FileType.Video:
          //  width="440" height="320"
          item = html`
                        <video class="preview Video" controls>
                            <source src=${this._maybeBlobUrl} type=${mime}>
                            Your browser does not support the video element.
                        </video>
                    `;
          break;
        default:
          //preview = html`<div class="preview">Preview not available for this type</div>`;
          item = html`<embed class="preview ${fileType}" src=${this._maybeBlobUrl} type=${mime} />`;
          break;
      }
    }


    /** render all */
    return html`
        <sl-tooltip content=${fileDesc.name} style="--show-delay:1000">
            ${item}
        </sl-tooltip>
    `;
  }


  /** */
  static get styles() {
    return [
      sharedStyles,
      css`
        #fileList {
          min-width: 350px;
          max-width: 600px;
          border-radius: 10px;
          /*margin: 10px 5px 10px 5px;*/
          box-shadow: rgba(0, 0, 0, 0.25) 0px 14px 28px, rgba(0, 0, 0, 0.22) 0px 10px 10px;
        }

        #fileLi {
          border-radius: 10px;
        }

        .thumb {
          max-width: 50%;
          cursor: pointer;
          margin: 10px;
        }


        .preview {
          background: #ffffff;
          min-height: 40px;
          min-width: 40px;
          max-height: 400px;
          max-width: 100%;
          /*width:100%;*/
          /*max-width: 440px;*/
          /*overflow: auto;*/
          /*outline: rgb(172, 172, 172) solid 1px;*/
          box-shadow: rgba(0, 0, 0, 0.25) 0px 14px 28px, rgba(0, 0, 0, 0.22) 0px 10px 10px;

        }

        .Audio {
          max-height: 50px !important;
          max-width: 350px !important;
        }

        .Image,
        .Video {
          /*height: 300px;*/
          /*width: 440px;*/
          min-height: 120px !important;
        }

        .PDF,
        .Document,
        .Text {
          width: 100%;
          max-width: 600px !important;
          min-height: 250px !important;
          max-height: 100vh !important;
          white-space: pre;
          box-shadow: rgba(0, 0, 0, 0.15) 0px 3px 3px 0px inset;
        }

      `,];
  }
}
