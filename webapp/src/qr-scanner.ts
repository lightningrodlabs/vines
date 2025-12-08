import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { invoke } from '@tauri-apps/api/core';
import {DnaJoiningInfo} from "@ddd-qc/cell-proxy/dist/dnaJoiningInfo";
import {decode} from "@msgpack/msgpack";
import {msg, localized} from '@lit/localize';
import {DnaId} from "@ddd-qc/lit-happ";

/** Decode base64 string */
export function decodeQrCodeString(shareCode: string): any {
    return decode(new Uint8Array(atob(shareCode).split("").map((c) => c.charCodeAt(0))));
}


/** Make sure its a decodeQrCodeString */
export function isJoiningCode(object: any): object is DnaJoiningInfo {
    console.debug("isJoiningCode: " + JSON.stringify(object));
    if (!object || typeof object !== 'object' || object === null) {
        console.debug("isJoiningCode: NOT AN OBJECT");
        return false;
    }
    return (
        'originalDnaHash' in object
        && 'name' in object
        // && typeof object.name === 'string'
        && 'networkSeed' in object
    );
}


/** */
@localized()
@customElement('qr-scanner')
export class QRScanner extends LitElement {

    @state() private isScanning: boolean = false;
    @state() private error: string = '';

    @state() private cameraStream: MediaStream | null = null;

    private videoElement?: HTMLVideoElement;
    private canvasElement?: HTMLCanvasElement;
    private scanInterval?: number;


    /** */
    override disconnectedCallback() {
        super.disconnectedCallback();
        this.stopScanner();
    }

    /** */
    override firstUpdated() {
        /*await*/ this.startScanner();
    }

    /** */
    async startScanner() {
        try {
            this.isScanning = true;
            // Request camera permission and access
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });
            this.cameraStream = stream;
            // Wait for video element to be available
            await this.updateComplete;
            const video = this.shadowRoot?.querySelector('video');
            const canvas = this.shadowRoot?.querySelector('canvas');
            if (!video || !canvas) {
                throw new Error('Video or canvas element not found');
            }
            this.videoElement = video;
            this.canvasElement = canvas;
            video.srcObject = stream;
            await video.play();
            // Start scanning for QR codes
            this.scanInterval = window.setInterval(() => this.scanFrame(), 200);
        } catch (err) {
            this.error = msg(`Failed to start camera: `) + JSON.stringify(err);
            this.isScanning = false;
        }
    }

    /** */
    stopScanner() {
        if (this.scanInterval) {
            clearInterval(this.scanInterval);
            this.scanInterval = undefined;
        }
        if (this.cameraStream) {
            this.cameraStream.getTracks().forEach(track => track.stop());
            this.cameraStream = null;
        }
        if (this.videoElement) {
            this.videoElement.srcObject = null;
        }
        this.isScanning = false;
        console.debug("SCANNER STOPPED");
        this.dispatchEvent(new CustomEvent('quit', { detail: true, bubbles: true, composed: true }));
    }

    /** */
    private async scanFrame() {
        if (!this.videoElement || !this.canvasElement || !this.isScanning) {
            return;
        }
        const video = this.videoElement;
        const canvas = this.canvasElement;
        const ctx = canvas.getContext('2d', {willReadFrequently: true});
        if (!ctx || video.videoWidth === 0) {
            return;
        }
        // Set canvas size to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        // Draw current video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        try {
            // Try to decode QR code using jsQR
            // For now, we'll use a Tauri command as a fallback
            const result = await this.decodeQRCode(imageData);
            if (result) {
                console.debug("QR CODE FOUND: " + result);
                const maybe: any = decodeQrCodeString(result);
                if (isJoiningCode(maybe)) {
                    if (new DnaId(maybe.originalDnaHash).b64 != globalThis.TAURI_ORIGINAL_DNA_HASH) {
                         this.error = msg("DNA HASH MISMATCH");
                    } else {
                        this.stopScanner();
                        this.dispatchEvent(new CustomEvent('scan', { detail: result, bubbles: true, composed: true }));
                    }
                }
            } else {
                 // Not a QR code
                 this.error = "";
            }
        } catch (err) {
            // Continue scanning
        }
    }

    /** */
    private async decodeQRCode(imageData: ImageData): Promise<string | null> {
        // Convert ImageData to base64 for sending to Tauri backend
        const canvas = document.createElement('canvas');
        canvas.width = imageData.width;
        canvas.height = imageData.height;
        const ctx = canvas.getContext('2d');
        ctx?.putImageData(imageData, 0, 0);
        const base64 = canvas.toDataURL('image/png').split(',')[1];
        try {
            // Call Tauri backend command to decode QR code
            const result = await invoke<string>('decode_qr_code', { imageData: base64 });
            return result;
        } catch {
            return null;
        }
    }

    /** */
    override render() {
        return html`
      <div class="container">
        <h1>${msg("Scan QR Code")}</h1>
        <div class="video-container">
          ${this.isScanning
            ? html`
                <video autoplay playsinline></video>
                <canvas></canvas>
                <div class="scanner-overlay"></div>
              `
            : html`
                <div class="placeholder">
                  <p>${msg("Camera not active")}</p>
                </div>
              `
        }
        </div>

        <div class="controls">
          <button
            class="stop-btn"
            @click=${this.stopScanner}
          >
            ${msg("Cancel")}
          </button>
        </div>


        ${this.error
            ? html`<div class="error">${this.error}</div>`
            : ''
        }
      </div>
    `;
    }


    /** */
    static override get styles() {
        return [css`
            :host {
                display: block;
                font-family: system-ui, -apple-system, sans-serif;
                padding: 20px;
            }

            .container {
                max-width: 600px;
                margin: 0 auto;
            }

            h1 {
                color: #333;
                text-align: center;
            }

            .video-container {
                position: relative;
                width: 100%;
                max-width: 500px;
                margin: 20px auto;
                background: #000;
                border-radius: 8px;
                overflow: hidden;
            }

            video {
                width: 100%;
                height: auto;
                display: block;
            }

            canvas {
                display: none;
            }

            .scanner-overlay {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 250px;
                height: 250px;
                border: 3px solid #00ff00;
                border-radius: 8px;
                pointer-events: none;
            }

            .controls {
                display: flex;
                gap: 10px;
                justify-content: center;
                margin: 20px 0;
            }

            button {
                padding: 12px 24px;
                font-size: 16px;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                transition: background-color 0.2s;
            }

            .start-btn {
                background-color: #4CAF50;
                color: white;
            }

            .start-btn:hover {
                background-color: #45a049;
            }

            .start-btn:disabled {
                background-color: #ccc;
                cursor: not-allowed;
            }

            .stop-btn {
                background-color: #f44336;
                color: white;
            }

            .stop-btn:hover {
                background-color: #da190b;
            }

            .result {
                margin: 20px 0;
                padding: 15px;
                background-color: #f0f0f0;
                border-radius: 6px;
                word-break: break-all;
            }

            .result h3 {
                margin-top: 0;
                color: #333;
            }

            .error {
                background-color: #ffebee;
                color: #c62828;
                padding: 15px;
                border-radius: 6px;
                margin: 20px 0;
            }

            .placeholder {
                text-align: center;
                padding: 40px;
                color: #666;
            }
        `,
        ];
    }
}
