import {html, css, LitElement} from "lit";
import { customElement/*, state*/} from "lit/decorators.js";
import * as APPV from './generated/version.js';

console.log("<vines-index>", APPV.APP_VERSION);

export type HappConnectInfo = {
    happId: string,
    port: number,
    token: string,
    customName: string | undefined,
} | boolean;

/** */
@customElement("vines-index")
export class VinesIndex extends LitElement {

    /** */
    override connectedCallback() {
        super.connectedCallback();
        // @ts-ignore
        this.addEventListener('app-selected', this.onAppSelect);
        // @ts-ignore
        this.addEventListener('vines-ready', this.onReady);
    }
    override disconnectedCallback() {
        super.disconnectedCallback();
        // @ts-ignore
        this.removeEventListener('app-selected', this.onAppSelect);
        // @ts-ignore
        this.removeEventListener('vines-ready', this.onReady);
    }

    /** */
    onReady(_e: any) {
        const busy = this.shadowRoot!.getElementById("busy") as HTMLElement;
        busy?.remove();
    }


    onAppSelect(e: CustomEvent<HappConnectInfo>) {
        console.log("RECEIVED onAppSelect event", e);
        if (typeof e.detail == "boolean") {
            globalThis.TAURI_SHOW_ADMIN = true;
            globalThis.TAURI_CAN_DEFAULT = e.detail;
        } else {
            const numbers = e.detail?.token.split(',').map(n => parseInt(n.trim()));
            globalThis.HAPP_TOKEN = Array.from(new Uint8Array(numbers));
            globalThis.TAURI_SHOW_ADMIN = undefined;
            globalThis.HAPP_ID = e.detail?.happId;
            globalThis.HC_APP_PORT = e.detail?.port;
            globalThis.HAPP_CUSTOM_NAME = e.detail?.customName;
        }
        this.requestUpdate();
    }

      /** */
      override render() {
        console.log("<vines-index>.render()", globalThis.TAURI_SHOW_ADMIN);
        if (globalThis.TAURI_SHOW_ADMIN || !globalThis.HAPP_ID) {
            return html`<vines-admin></vines-admin>`;
        }
        return html`
            <ui5-busy-indicator id="busy" delay="0" size="Large" active 
                                style=" top: 50%; margin-left:-50px;
                                        left: 50%; position: fixed;
                                        color:#05b92f; "
            ></ui5-busy-indicator>
            <vines-app></vines-app>
        `;
      }

  /** */
  static override get styles() {
    return [
      css`
          :host {
              background: #fdfdfd;
              display: block;
              height: 100vh;
              width: 100%;
              margin: 0px;
              box-sizing: border-box;
      `,

    ];
  }
}
