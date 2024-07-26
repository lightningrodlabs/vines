import {css, html, PropertyValues} from "lit";
import {customElement, property, state} from "lit/decorators.js";
import {ActionId, delay, DnaElement, EntryId} from "@ddd-qc/lit-happ";
import {ThreadsDvm} from "../viewModels/threads.dvm";
import {consume} from "@lit/context";
import {globaFilesContext} from "../contexts";
import {FileHashB64, FilesDvm, FileType, kind2mime, kind2Type, prettyFileSize} from "@ddd-qc/files";
import {type2ui5Icon} from "../utils";
import {ParcelManifest} from "@ddd-qc/delivery";
import {msg} from "@lit/localize";
import {toasty} from "../toast";
import {sharedStyles} from "../styles";
import {EntryBeadMat} from "../viewModels/threads.materialize";


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
  @property() hash: ActionId; // BeadAh
  //@state() private _dataHash?: FileHashB64;

  @consume({ context: globaFilesContext, subscribe: true })
  _filesDvm!: FilesDvm;

  @state() private _loading = true;
  @state() private _manifest: ParcelManifest = undefined;
           private _file: File | null = null;
           private _maybeBlobUrl: string = undefined;
           private _canRetry = true;


  /** -- Methods -- */

  /** */
  shouldUpdate(changedProperties: PropertyValues<this>) {
    //console.log("<chat-file>.shouldUpdate()", changedProperties, this.hash);
    const shouldnt = !super.shouldUpdate(changedProperties);
    if (shouldnt) {
      return false;
    }
    /** Load file when hash changed */
    if (changedProperties.has("hash") || !this._manifest) {
      this._canRetry = true;
      /* await */ this.loadFileData();
    }
    return true;
  }


  /** */
  private async loadFileData() {
    console.log("<chat-file>.loadFile()", !!this._filesDvm, this.hash);
    this._loading = true;
    const entryBead = this._dvm.threadsZvm.perspective.getBaseBead(this.hash) as EntryBeadMat;
    if (!entryBead) {
      console.warn("<chat-file> Bead not found", this.hash);
      return;
    }
    try {
      const manifestEh = entryBead.sourceEh;
      console.log("<chat-file>.loadFile() manifestEh", manifestEh, this.hash.short);
      this._manifest = await this._filesDvm.filesZvm.zomeProxy.getFileInfo(manifestEh.hash);
      if (!this._manifest || this._manifest.description.size > this._filesDvm.dnaProperties.maxChunkSize) {
        this._loading = false;
        this._file = null;
        return;
      }
      const fileType = kind2Type(this._manifest.description.kind_info);
      console.log("<chat-file>.loadFile() fileType", fileType);
      if (fileType == "Binary" || fileType == "Zip" || fileType == "Other") {
          this._loading = false;
          this._file = null;
          return;
      }
      this._file = (await this._filesDvm.fetchFile(manifestEh))[1];
      /** Set _maybeBlobUrl */
      const reader = new FileReader();
      if (this._maybeBlobUrl) {
        URL.revokeObjectURL(this._maybeBlobUrl);
        this._maybeBlobUrl = undefined;
      }
      //this._maybeBlobUrl = URL.createObjectURL(this._maybeFile);
      const mime = kind2mime(this._manifest.description.kind_info);
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
      reader.readAsArrayBuffer(this._file);
    } catch(e) {
      console.warn("Loading file failed:", this.hash.b64, e);
      this._loading = false;
      this._file = null;
    }
  }


  // /** */
  // protected /*async*/ firstUpdated(_changedProperties: PropertyValues) {
  //   super.firstUpdated(_changedProperties);
  //   /*await*/ this.loadFileData();
  // }


  /** */
  protected async probeForFileManifest(manifestEh: EntryId, delayMs?: number) {
    console.log("probeForFile()", manifestEh.short)
    if (delayMs) {
      await delay(delayMs);
    }
    await this._filesDvm.deliveryZvm.probeDht();
    const fileTuple = this._filesDvm.deliveryZvm.perspective.publicParcels.get(manifestEh);
    if (fileTuple) {
      await this.loadFileData();
    }
    this.requestUpdate();
  }


  /** */
  render() {
    console.log("<chat-file>.render()", this.hash, this._loading, !!this._manifest, !!this._file /*this._dataHash*/);
    if (!this.hash) {
      return html`<div style="color:#c10a0a">${msg("No File address provided")}</div>`;
    }
    if (this._loading) {
      return html`<ui5-busy-indicator delay="0" size="Medium" active></ui5-busy-indicator>`;
    }
    if (!this._manifest) {
      return html`
          <ui5-list id="fileList">
              <ui5-li id="fileLi" class="fail" icon="synchronize" description=${this.hash}
                      @click=${async (e) => {
                          e.stopPropagation(); e.preventDefault();
                          await this.probeForFileManifest(manifestEh);
                      }}>
                  ${msg('Unknown File')}
              </ui5-li>
          </ui5-list>`;
    }
    const entryBead = this._dvm.threadsZvm.perspective.getBaseBead(this.hash) as EntryBeadMat;
    //console.log("<chat-file>.render() entryBead", entryBead);
    if (!entryBead) {
      return html`<ui5-busy-indicator delay="0" size="Medium" active style="color:#f3bb2c"></ui5-busy-indicator>`;
    }
    const manifestEh = entryBead.sourceEh;
    const filePprm = this._filesDvm.deliveryZvm.perspective.publicParcels.get(manifestEh);
    if (!filePprm) {
      /** Retry once */
      if (this._canRetry) {
        this._canRetry = false;
        this.probeForFileManifest(manifestEh, 1000);
        return html`
            <ui5-busy-indicator delay="0" size="Medium" active style="color:#f61933"></ui5-busy-indicator>`;
      }
      return html`
        <ui5-list id="fileList">
          <ui5-li id="fileLi" class="fail" icon="synchronize" description=${manifestEh.b64}
                  @click=${async (e) => {
                      e.stopPropagation(); e.preventDefault();
                      await this.probeForFileManifest(manifestEh);
                  }}>
              ${msg('File data not found')}
          </ui5-li>
        </ui5-list>`;
    }
    const fileDesc = filePprm.description;
    const fileType = kind2Type(fileDesc.kind_info);

    let item = html`
        <ui5-list id="fileList">
          <ui5-li id="fileLi" icon=${type2ui5Icon(fileType)} description=${prettyFileSize(fileDesc.size)}
                  @click=${(_e) => {this._filesDvm.downloadFile(entryBead.sourceEh); toasty(msg("File downloaded") + ": " + fileDesc.name);}}>
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

    console.log("<chat-file>.render() type:", this._manifest.description.name, fileType, mime, !!this._file);

    /** this._file is set only for small files */
    if (this._file != null) {
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
                            ${msg("Your browser does not support the audio element.")}
                        </audio>
                    `;
          break;
        case FileType.Video:
          //  width="440" height="320"
          item = html`
                        <video class="preview Video" controls>
                            <source src=${this._maybeBlobUrl} type=${mime}>
                            ${msg("Your browser does not support the video element.")}
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
