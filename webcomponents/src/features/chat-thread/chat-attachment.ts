import {css, html, LitElement, PropertyValues} from "lit";
import {customElement, property, state} from "lit/decorators.js";
import {msg} from "@lit/localize";
import {toasty} from "../../toast";
import {sharedStyles} from "../../styles";
import {type2ui5Icon} from "../../utils";
import {FileType, prettyFileSize} from "@ddd-qc/files";


/** */
export function mime2Type(mime: string): FileType {
    const fields = mime.split('/');
    if (fields.length < 2) {
        return FileType.Other;
    }
    if (fields[0] == "image") {
        return FileType.Image;
    };
    if (fields[0] == "video") {
        return FileType.Video;
    };
    if (fields[0] == "audio") {
        return FileType.Audio;
    };
    if (fields[0] == "text") {
        return FileType.Text;
    }
    if (fields[0] == "font") {
        return FileType.Font;
    }
    if (fields[0] == "application") {
        if (fields[1] == "pdf") {
            return FileType.Pdf;
        }
        if (fields[1] == "json") {
            return FileType.Text;
        }
        if (fields[1] == "x-zip-compressed") {
            return FileType.Zip;
        }
        return FileType.Binary
    }
    return FileType.Other;
}


function getMimeTypeFromUrl(url: string): string {
    const ext = url.split('.').pop()?.split('?')[0]!.toLowerCase();
    const mimeTypes: Record<string, string> = {
        // Images
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'svg': 'image/svg+xml',
        'ico': 'image/x-icon',
        // Video
        'mp4': 'video/mp4',
        'webm': 'video/webm',
        'mov': 'video/quicktime',
        // Audio
        'mp3': 'audio/mpeg',
        'wav': 'audio/wav',
        'ogg': 'audio/ogg',
        // Documents
        'pdf': 'application/pdf',
        'json': 'application/json',
        // Text
        'html': 'text/html',
        'css': 'text/css',
        'js': 'text/javascript',
        'txt': 'text/plain',
    };
    return (ext && mimeTypes[ext]) ? mimeTypes[ext] : 'application/octet-stream';
}


/**
 * @element
 */
@customElement("chat-attachment")
export class ChatAttachment extends LitElement {

  /** -- Properties -- */

  /** Hash of File bead to display */
  @property() attachment!: string; // Discord attachment as JSON

  static  MAX_VIEWABLE_SIZE = 100 * 1024 * 1024;

  //@state() private _loading = true;

  //private _file: File | null = null;
  //private _maybeBlobUrl: string | undefined = undefined;

  private _att: any = {}

  @state() private _canOverrideView = false;

  /** -- Methods -- */

  /** */
  protected override willUpdate(changedProperties: PropertyValues<this>) {
    super.willUpdate(changedProperties);
    if (changedProperties.has("attachment")) {
        this._att = JSON.parse(this.attachment);
        this._att.mime = getMimeTypeFromUrl(this._att.url);
        this._att.fileType = mime2Type(this._att.mime);
        console.debug("<chat-attachment> att = ", this._att);
    }
  }

  /** */
  isTypeViewable(): boolean {
     return this._att.fileType == FileType.Image
         || this._att.fileType == FileType.Audio
         || this._att.fileType == FileType.Video
         || this._att.fileType == FileType.Text
         || this._att.fileType == FileType.Pdf;
  }


  /** */
  override render() {
    console.log("<chat-attachment>.render()", this._att);

    if (!this.attachment) {
      return html`<div style="color:#c10a0a">${msg("No Attachment provided")}</div>`;
    }

    /** Default file type render (or any big file) */
    let item = html`
        <ui5-list id="fileList">
          <ui5-li id="fileLi" icon=${type2ui5Icon(this._att.fileType)} description=${prettyFileSize(this._att.fileSizeBytes)}
                  @click=${(_e: any) => {
                      const a = document.createElement('a');
                      a.href = this._att.url;
                      a.download = this._att.fileName;
                      a.click();
                      toasty(msg("File downloaded") + ": " + this._att.fileName);
                    }}>
            ${this._att.fileName}
          </ui5-li>
        </ui5-list>
        ${!this.isTypeViewable()? html`<div class="linky" style="font-size: small; margin-top:-3px; margin-bottom:10px;margin-left:5px;"
             @click=${(e: any) => {
              e.preventDefault();
              e.stopPropagation();
               this._canOverrideView = true;
            }}>
            ${msg('View')}
        </div>` : html``}
    `;

    /** Specific render depending on file type */
    /** this._file is set only for small files */
    if (this.isTypeViewable() && (this._canOverrideView || this._att.fileSizeBytes < ChatAttachment.MAX_VIEWABLE_SIZE)) {
      switch (this._att.fileType) {
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
          item = html`<img id="img-bead" class="preview Image" src=${this._att.url} @click=${() => {
              const a = document.createElement('a');
              a.href = this._att.url;
              a.download = this._att.fileName;
              a.click();
          }}/>`;
          break;
        case FileType.Audio:
          item = html`
              <audio class="preview Audio" style="z-index: 51" controls>
                  <source src=${this._att.url} type=${this._att.mime}>
                  ${msg("Your browser does not support the audio element.")}
              </audio>
          `;
          break;
        case FileType.Video:
          //  width="440" height="320"
          item = html`
              <video class="preview Video" controls>
                  <source src=${this._att.url} type=${this._att.mime}>
                  ${msg("Your browser does not support the video element.")}
              </video>
          `;
          break;
        default:
          //item = html`<div class="preview">Preview not available for this type</div>`;
          item = html`<embed class="preview ${this._att.fileType}" src=${this._att.url} type=${this._att.mime} />`;
          break;
      }
    }

    /** render item */
    return html`
        <sl-tooltip content=${this._att.fileName} hoist style="--show-delay:1000">
            ${item}
        </sl-tooltip>
    `;
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
          box-shadow: rgba(0, 0, 0, 0.25) 0px 4px 8px, rgba(0, 0, 0, 0.22) 0px 8px 5px;
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
          box-shadow: rgba(0, 0, 0, 0.25) 0px 4px 3px, rgba(0, 0, 0, 0.22) 0px 4px 6px;

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
          box-shadow: rgba(0, 0, 0, 0.15) 0px 3px 3px 0px inset;
        }

      `,];
  }
}
