import {css, html, LitElement} from "lit";
import {customElement} from "lit/decorators.js";
import {sharedStyles} from "../../styles";
import {AudioRecorder, MIC_MIME_TYPE} from "./audio-recorder";
import {msg} from "@lit/localize";
import {formatFileSize} from "../../utils";
import {MicEvent} from "../../events";


/**
 * @element
 */
@customElement("audio-panel")
export class AudioPanel extends LitElement {

  private _recorder = new AudioRecorder();

  private _maybeBlob: Blob | undefined = undefined;
  private _maybeBlobUrl: string | undefined = undefined;


  get isRecording(): boolean {return this._recorder.isRecording}


  /** */
  async startRec() {
    if (!this._recorder.initialized) {
      await this._recorder.initialize();
    }
    this._recorder.startRecording();
    this.startTimer();
    this.dispatchEvent(new CustomEvent<boolean>('rec', {detail: true, bubbles: true, composed: true}));
  }


  async stopRec() {
    this._maybeBlob = await this._recorder.stopRecording();
    if (this._maybeBlobUrl) {
      URL.revokeObjectURL(this._maybeBlobUrl);
      this._maybeBlobUrl = undefined;
    }
    this._maybeBlobUrl = URL.createObjectURL(this._maybeBlob);
    this.stopTimer();
    this.dispatchEvent(new CustomEvent<boolean>('rec', {detail: false, bubbles: true, composed: true}));

    //this._recorder.save(this._maybeBlob);
  }

  private _startTime: number = 0;
  private _elapsed: string = '00:00';
  private _intervalId: number | undefined = undefined;

  startTimer() {
    this._startTime = Date.now();
    this.updateElapsedTime();
    this._intervalId = window.setInterval(() => {
      this.updateElapsedTime();
    }, 1000);
  }

  stopTimer() {
    if (this._intervalId) {
      clearInterval(this._intervalId);
      this._intervalId = undefined;
    }
  }


  updateElapsedTime() {
    const elapsed = Math.floor((Date.now() - this._startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;

    this._elapsed = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    this.requestUpdate();
  }


  /** */
  override render() {
    console.debug("<audio-panel>.render()", this._recorder.isRecording, !!this._maybeBlob);

    /** Default state */
    let recordBtn = html`
        <ui5-button icon="microphone" design="Emphasized"
                    style="border-radius: 50%; width: 60px; height: 60px"
                    @click=${async () => {
      await this.startRec();
      this.requestUpdate()
    }}
        ></ui5-button>
    `;
    let preview = html`
        <div class="preview">${msg("(Press record button to start recording)")}</div>`;


    /** preview */
    if (this._maybeBlobUrl) {
      preview = html`
          <audio class="preview Audio" controls>
              <source .src=${this._maybeBlobUrl} type=${MIC_MIME_TYPE}>
              ${msg("Your browser does not support the audio element.")}
          </audio>
          <span style="color:grey;font-size: small;">(${formatFileSize(this._maybeBlob!.size)})</span>
      `;
    }


    /** isRecording state */
    if (this._recorder.isRecording) {
      preview = html`
          <div class="preview">${msg("Recording in progess...")}</div>
          <div id="timer" class="timer">${this._elapsed}</div>
      `;
      recordBtn = html`
          <ui5-button icon="stop" design="Negative"
                      style="border-radius: 50%; width: 60px; height: 60px"
                      @click=${async () => {
        await this.stopRec();
        this.requestUpdate();
      }}></ui5-button>`;
    }


    /** render all */
    return html`
        ${preview}
        ${recordBtn}
        <div style="display: flex; flex-direction:row-reverse; gap: 10px; margin-top: 10px;">
            <ui5-button style="margin-top:5px" @click=${async (_e: any) => {
      console.log("CANCELED", this._recorder.isRecording);
      if (this._recorder.isRecording) {
        await this.stopRec();
      }
      this._recorder.releaseMedia();
      this._maybeBlob = undefined;
      this._maybeBlobUrl = undefined;
      this.dispatchEvent(new CustomEvent('close', {detail: null, bubbles: true, composed: true}));
      this.requestUpdate();
    }}>
                ${msg("Cancel")}
            </ui5-button>
            <ui5-button style="margin-top:5px"
                        ?disabled=${!this._maybeBlob}
                        @click=${async (_e: any) => {
      if (this._recorder.isRecording) {
        await this.stopRec();
      }
      this._recorder.releaseMedia();
      this.dispatchEvent(new CustomEvent<MicEvent>('mic', {
        detail: {
          blob: this._maybeBlob,
          canSend: false,
        },
        bubbles: true,
        composed: true
      }));
      this.requestUpdate();
    }}>
                ${msg("Attach")}
            </ui5-button>
            <ui5-button style="margin-top:5px" design="Emphasized"
                        ?disabled=${!this._maybeBlob}
                        @click=${async (_e: any) => {
      if (this._recorder.isRecording) {
        await this.stopRec();
      }
      this._recorder.releaseMedia();
      this.dispatchEvent(new CustomEvent<MicEvent>('mic', {
        detail: {
          blob: this._maybeBlob,
          canSend: true,
        },
        bubbles: true,
        composed: true
      }));
      this.requestUpdate();
    }}>
                ${msg("Send")}
            </ui5-button>
        </div>
    `;
  }


  /** */
  static override get styles() {
    return [
      sharedStyles,
      css`
          :host {
              min-width: 300px;
              display: flex;
              flex-direction: column;
              gap: 10px;
              align-items: center;
          }

          .preview {
              height: 54px;
              line-height: 54px;
              text-align: center;
          }
      `,];
  }
}
