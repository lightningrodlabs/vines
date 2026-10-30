import {css, html, PropertyValues} from "lit";
import "@shoelace-style/shoelace/dist/components/icon-button/icon-button.js";
import {customElement, property, state} from "lit/decorators.js";
import {ActionId, delay, DnaElement, EntryId} from "@ddd-qc/lit-happ";
import {ThreadsDvm} from "../../viewModels/threads.dvm";
import {consume} from "@lit/context";
import {filesContext} from "../../contexts";
import {FilesDvm, FileType, kind2mime, kind2Type, prettyFileSize} from "@ddd-qc/files";
import {type2ui5Icon} from "../../utils";
import {DeliveryPerspective, NoticeState, ParcelManifest} from "@ddd-qc/delivery";
import {isParcelReady, lookupParcel, ParcelLookup, retryDmDelivery} from "../../viewModels/dm-files";
import {msg} from "@lit/localize";
import {toasty} from "../../toast";
import {sharedStyles} from "../../styles";
import {EntryBeadMat} from "../../viewModels/threads.materialize";
import {ViewEmbedEvent} from "../../events";
import {ActionHashB64} from "@holochain/client";
import {catchThrottled} from "../../viewModels/threads.zvm";
import {GetStrategy} from "@holochain-open-dev/core-types";


let instanceCount = 0;

/**
 * @element
 */
@customElement("chat-file")
export class ChatFile extends DnaElement<unknown, ThreadsDvm> {

  constructor() {
    super(ThreadsDvm.DEFAULT_BASE_ROLE_NAME);
    instanceCount += 1;
    //console.debug("<chat-file>.ctor()", this.hash);
  }

  /** -- Properties -- */

  /** Hash of File bead to display */
  @property() hash!: ActionHashB64; // BeadAh. For some reason Lit errors if we use ActionId here.

  @consume({context: filesContext, subscribe: true})
  _filesDvm!: FilesDvm;

  @state() private _loading = true;
  @state() private _manifest?: ParcelManifest;
  /** Set by the delivery subscription; a change may mean a DM file finished arriving. */
  @state() deliveryPerspective?: DeliveryPerspective;
  private _file: File | null = null;
  private _maybeBlobUrl: string | undefined = undefined;
  private _canRetry = true;
  private _subscribed = false;
  /** The last render showed the "arriving" placeholder for a private file. */
  private _wasPending = false;


  /** -- Methods -- */

  /** */
  override disconnectedCallback() {
    super.disconnectedCallback();
    if (this._subscribed) {
      this._filesDvm.deliveryZvm.unsubscribe(this);
      this._subscribed = false;
    }
  }


  /** */
  protected override willUpdate(changedProperties: PropertyValues<this>) {
    super.willUpdate(changedProperties);
    /** A DM file arrives after its message; the delivery perspective says when */
    if (this._filesDvm && !this._subscribed) {
      this._subscribed = true;
      this._filesDvm.deliveryZvm.subscribe(this, 'deliveryPerspective');
    }
    if (changedProperties.has("deliveryPerspective") && this._wasPending) {
      const entryBead = this._dvm.threadsZvm.perspective.getBaseBead(new ActionId(this.hash)) as EntryBeadMat;
      const lookup = entryBead ? lookupParcel(this._filesDvm.deliveryZvm.perspective, entryBead.sourceEh) : undefined;
      if (lookup && isParcelReady(lookup)) {
        this._wasPending = false;
        /* await */ this.loadFileData(this._filesDvm.dnaProperties.maxChunkSize);
      }
    }
    /** Load file when hash changed */
    // @ts-ignore: _dvm for first update
    if (changedProperties.has("hash") || changedProperties.has("_dvm") /*|| !this._manifest*/) {
      this._canRetry = true;
      /** Load file from Cache or grab it from DHT if it's small */
      const entryBead = this._dvm.threadsZvm.perspective.getBaseBead(new ActionId(this.hash)) as EntryBeadMat;
      if (!entryBead) {
        console.warn("<chat-file>.loadFile() Bead not found", this.hash);
        return;
      }
      const file = this._filesDvm.perspective.fileCache.get(entryBead.sourceEh);
      const manifest = lookupParcel(this._filesDvm.deliveryZvm.perspective, entryBead.sourceEh)?.manifest;
      if (file && manifest) {
        console.debug!("LOADED FILE FROM CACHE", manifest.description.name, this.hash);
        this._file = file;
        this._manifest = manifest;
        this.loadBlob();
      } else {
          //if (!this._loading) {
              /* await */ this.loadFileData(this._filesDvm.dnaProperties.maxChunkSize);
          //}
      }
    }
  }


  /** */
  protected override async updated(_changedProperties: PropertyValues) {
    /** click file for preview */
    const maybeImg = this.shadowRoot!.getElementById("img-bead") as HTMLElement;
    /** Once per element: this runs on every update, and adding a listener each
     *  time stacked them, so one click dispatched the event once per update. */
    if (maybeImg && !maybeImg.dataset["viewEmbedBound"]) {
      maybeImg.dataset["viewEmbedBound"] = "1";
      maybeImg.addEventListener('click', (e: any) => {
        e.stopPropagation();
        e.preventDefault();
        const mime = kind2mime(this._manifest!.description.kind_info);
        this.dispatchEvent(new CustomEvent<ViewEmbedEvent>('view-embed', {
          detail: {blobUrl: this._maybeBlobUrl!, mime, name: this._manifest!.description.name},
          bubbles: true,
          composed: true
        }));
      });
    }
  }


  /** */
  private async loadFileData(maxSize: number) {
    console.log("<chat-file>.loadFile()", this._loading, !!this._filesDvm, this.hash);
    this._loading = true;
    const entryBead = this._dvm.threadsZvm.perspective.getBaseBead(new ActionId(this.hash)) as EntryBeadMat;
    if (!entryBead) {
      console.warn("<chat-file>.loadFile() Bead not found", this.hash);
      return;
    }
    try {
      const manifestEh = entryBead.sourceEh;
      /** A private file still arriving has nothing to load yet; render() shows where it stands */
      const lookup = lookupParcel(this._filesDvm.deliveryZvm.perspective, manifestEh);
      if (lookup && !isParcelReady(lookup)) {
        this._loading = false;
        this._file = null;
        this._manifest = undefined;
        return;
      }
      this._manifest = await this._filesDvm.filesZvm.zomeProxy.getFileInfoFromLocal(manifestEh.hash); // TODO: GetStrategy
      console.debug("<chat-file>.loadFile() manifestEh", manifestEh, this.hash, !!this._manifest);
      if (!this._manifest || this._manifest.description.size > maxSize) {
        console.debug("<chat-file>.loadFile() stopped", this._manifest);
        this._loading = false;
        this._file = null;
        return;
      }
      const fileType = kind2Type(this._manifest.description.kind_info);
      console.debug("<chat-file>.loadFile() fileType", fileType);
      if (fileType == "Binary" || fileType == "Zip" || fileType == "Other") {
        this._loading = false;
        this._file = null;
        return;
      }
      this._file = (await this._filesDvm.fetchFile(manifestEh))[1];
      this.loadBlob();
    } catch (e) {
      this._loading = false;
      this._file = null;
    }
  }


  loadBlob() {
    try {
      /** Set _maybeBlobUrl */
      const reader = new FileReader();
      if (this._maybeBlobUrl) {
        URL.revokeObjectURL(this._maybeBlobUrl);
        this._maybeBlobUrl = undefined;
      }
      //this._maybeBlobUrl = URL.createObjectURL(this._maybeFile);
      const mime = kind2mime(this._manifest!.description.kind_info);
      reader.onload = (event) => {
        console.debug("<chat-file>.loadFile() FileReader onload", event, mime);
        if (event.target == null || event.target.result == null) {
          console.warn("FileReader event is null", event);
          this._loading = false;
          return;
        }
        const blob = new Blob([event.target.result], {type: mime});
        this._maybeBlobUrl = URL.createObjectURL(blob);
        console.debug("<chat-file>.loadFile() FileReader blob", blob, this._maybeBlobUrl)
        //this.requestUpdate();
        this._loading = false;
      };
      //reader.readAsDataURL(this._maybeFile);
      reader.readAsArrayBuffer(this._file!);
    } catch (e: any) {
      console.warn("<chat-file>.loadFile() Loading file failed:", this.hash, e);
      this._loading = false;
      this._file = null;
    }
  }


  /** */
  protected async probeForFileManifest(manifestEh: EntryId, delayMs?: number) {
    console.log("probeForFileManifest()", manifestEh.short)
    if (delayMs) {
      await delay(delayMs);
    }
    const lookup = lookupParcel(this._filesDvm.deliveryZvm.perspective, manifestEh);
    if (lookup && !isParcelReady(lookup)) {
      await retryDmDelivery(this._filesDvm, lookup);
    } else if (lookup) {
      await this.loadFileData(this._filesDvm.dnaProperties.maxChunkSize);
    } else {
      await catchThrottled(this._filesDvm.deliveryZvm.probeDht(GetStrategy.Local)); // FIXME figure out best GetStrategy to use here
    }
    this.requestUpdate();
  }


  /** What the recipient of a private file sees while it is not here yet */
  private renderPending(lookup: ParcelLookup) {
    let stateLabel = msg("Not received");
    switch (lookup.noticeState) {
      case NoticeState.Unreplied: stateLabel = msg("Waiting to accept"); break;
      case NoticeState.Accepted: stateLabel = msg("Waiting for sender"); break;
      case NoticeState.PartiallyReceived: stateLabel = msg("Receiving…"); break;
      default: break;
    }
    return html`
        <ui5-list id="fileList" style="max-width: 300px;">
          <ui5-li id="fileLi" icon="download" description=${prettyFileSize(lookup.description.size) + " · " + stateLabel}
                  @click=${async (e: any) => {
                    e.stopPropagation(); e.preventDefault();
                    await retryDmDelivery(this._filesDvm, lookup);
                  }}>
              ${lookup.description.name}
          </ui5-li>
        </ui5-list>`;
  }


  /** */
  override render() {
    //console.log("<chat-file>.render()", this.hash, this._loading, !!this._manifest, !!this._file, this._renderCount);
    this._renderCount += 1;

    if (!this.hash) {
      return html`<div style="color: var(--vines-negative)">${msg("No File address provided")}</div>`;
    }
    if (this._loading) {
      return html`<ui5-busy-indicator delay="0" size="L" active style="min-height: 100px;"></ui5-busy-indicator>`;
    }
    const entryBead = this._dvm.threadsZvm.perspective.getBaseBead(new ActionId(this.hash)) as EntryBeadMat;
    const lookup = entryBead ? lookupParcel(this._filesDvm.deliveryZvm.perspective, entryBead.sourceEh) : undefined;
    if (lookup && !isParcelReady(lookup)) {
      this._wasPending = true;
      return this.renderPending(lookup);
    }
    this._wasPending = false;
    if (!this._manifest) {
      return html`
          <ui5-list id="fileList" style="max-width: 300px;">
              <ui5-li id="fileLi" class="fail" icon="synchronize"
                      @click=${async (e: any) => {
                        e.stopPropagation(); e.preventDefault();
                        const entryBead = this._dvm.threadsZvm.perspective.getBaseBead(new ActionId(this.hash)) as EntryBeadMat;
                        if (entryBead) {
                          await this.probeForFileManifest(entryBead.sourceEh);
                        }
                      }}>
                  <abbr title=${msg('File hash: ') + this.hash} style="text-decoration: none;">${msg('Missing File')}</abbr>
              </ui5-li>
          </ui5-list>`;
    }
    if (!entryBead) {
      return html`<ui5-busy-indicator delay="0" size="M" active style="color: var(--vines-warning)"></ui5-busy-indicator>`;
    }
    const manifestEh = entryBead.sourceEh;
    if (!lookup) {
      /** Retry once */
      if (this._canRetry) {
        this._canRetry = false;
        /*await*/ this.probeForFileManifest(manifestEh, 1000);
        return html`<ui5-busy-indicator delay="0" size="M" active style="color: var(--vines-negative)"></ui5-busy-indicator>`;
      }
      return html`
        <ui5-list id="fileList" style="max-width: 300px;">
          <ui5-li id="fileLi" class="fail" icon="synchronize"
                  @click=${async (e: any) => {
                    e.stopPropagation(); e.preventDefault();
                    await this.probeForFileManifest(manifestEh);
                  }}>
              <abbr title=${msg('File manifest hash: ') + manifestEh.b64} style="text-decoration: none;">${msg('File data not found')}</abbr>
          </ui5-li>
        </ui5-list>`;
    }

    const MAX_VIEWABLE_SIZE = 100 * 1024 * 1024;
    const fileDesc = lookup.description;
    const fileType = kind2Type(fileDesc.kind_info);
    const isViewableType = fileType == FileType.Image || fileType == FileType.Audio || fileType == FileType.Video || fileType == FileType.Text || fileType == FileType.Pdf;
    const isViewable = isViewableType && fileDesc.size < MAX_VIEWABLE_SIZE;

    /** Default file render (any big file) */
    let item = html`
        <ui5-list id="fileList">
          <ui5-li id="fileLi" icon=${type2ui5Icon(fileType)} description=${prettyFileSize(fileDesc.size)}
                  @click=${(_e: any) => {
                      this._filesDvm.downloadFile(entryBead.sourceEh);
                      toasty(msg("File downloaded") + ": " + fileDesc.name);
                    }}>
            ${fileDesc.name}
          </ui5-li>
        </ui5-list>
        ${isViewable? html`<div class="linky" style="font-size: small; margin-top:-3px; margin-bottom:10px;margin-left:5px;"
             @click=${async (e: any) => {
                      e.preventDefault(); e.stopPropagation();
                      await this.loadFileData(MAX_VIEWABLE_SIZE);
                    }}>
            ${msg('View')}
        </div>` : html``}        
    `;

    const mime = kind2mime(this._manifest.description.kind_info);
    //const fileType = kind2Type(this._manifest.description.kind_info);

    //console.log("<chat-file>.render() type:", this._manifest.description.name, fileType, mime, !!this._file);

    /** Specific render depending on file type */
    /** this._file is set only for small files */
    if (this._file != null && this._maybeBlobUrl) {
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
        case FileType.Image:
          item = html`<img id="img-bead" class="preview Image" src=${this._maybeBlobUrl} />`;
          break;
        case FileType.Audio:
          item = html`
              <audio class="preview Audio" style="z-index: 51" controls>
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
          //item = html`<div class="preview">Preview not available for this type</div>`;
          /** Text and anything else shown inline: the preview gets a bar with the
           *  name -- previously only in a hover tooltip -- and a way to download
           *  it, which the preview alone did not offer. */
          item = html`
              <div class="embedded-file">
                  <!-- Download on the left: the message's hover toolbar sits over the
                       top-right of the message and covered it at the right end. -->
                  <div class="embedded-file-bar">
                      <sl-icon-button name="download" label=${msg("Download")}
                                      @click=${(e: any) => {
                                          e.stopPropagation();
                                          this.downloadBlob(fileDesc.name);
                                      }}></sl-icon-button>
                      <span class="embedded-file-name">${fileDesc.name}</span>
                  </div>
                  <embed class="preview ${fileType}" src=${this._maybeBlobUrl} type=${mime} />
              </div>`;
          break;
      }
    }

    /** render item */
    return html`
        <sl-tooltip content=${fileDesc.name} hoist style="--show-delay:1000">
            ${item}
        </sl-tooltip>
    `;
  }

  private _renderCount = 0;


  /** Same technique FilesDvm.downloadFile() ends with, which already works in
   *  Moss for other attachments; the data is already here as this blob. */
  private downloadBlob(name: string) {
    if (!this._maybeBlobUrl) {
      return;
    }
    const a = document.createElement("a");
    a.href = this._maybeBlobUrl;
    a.download = name || "download";
    a.click();
  }


  /** */
  static override get styles() {
    return [
      sharedStyles,
      css`
        #fileList {
          min-width: 350px;
          max-width: 600px;
          border-radius: 10px;
          box-shadow: var(--vines-shadow-pop);
          /*margin: 10px 5px 10px 5px;*/
          margin-bottom: 10px;
        }

        #fileLi {
          border-radius: 10px;
        }

        .thumb {
          max-width: 50%;
          cursor: pointer;
          margin: 10px;
        }


        .embedded-file {
          display: flex;
          flex-direction: column;
          max-width: 600px;
        }
        .embedded-file-bar {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: small;
          color: var(--vines-ink-muted);
        }
        .embedded-file-name {
          flex: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .preview {
          background: var(--vines-surface);
          min-height: 40px;
          min-width: 40px;
          max-height: 400px;
          max-width: 100%;
          /*width:100%;*/
          /*max-width: 440px;*/
          /*overflow: auto;*/
          box-shadow: var(--vines-shadow-card);

        }

        .Audio {
          max-height: 50px !important;
          max-width: 350px !important;
        }

        .Image {
          cursor:pointer;
        }
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
          box-shadow: inset 0 3px 3px 0 color-mix(in srgb, var(--vines-ink) 15%, transparent);
        }

      `,];
  }
}
