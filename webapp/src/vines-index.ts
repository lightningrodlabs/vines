import {html, css, LitElement} from "lit";
import { customElement} from "lit/decorators.js";
import * as APPV from './generated/version.js';

console.log("<vines-index>", APPV.APP_VERSION);

export type HappInfo = {
    name: string,
    port: number,
    token: string,
} | boolean;

/** */
@customElement("vines-index")
export class VinesIndex extends LitElement {

    /** */
    override connectedCallback() {
        super.connectedCallback();
        // @ts-ignore
        this.addEventListener('app-selected', this.onAppSelect);
    }
    override disconnectedCallback() {
        super.disconnectedCallback();
        // @ts-ignore
        this.removeEventListener('app-selected', this.onAppSelect);
    }

    onAppSelect(e: CustomEvent<HappInfo>) {
        console.log("RECEIVED onAppSelect event", e);
        if (typeof e.detail == "boolean") {
            globalThis.TAURI_SHOW_ADMIN = true;
            globalThis.TAURI_CAN_DEFAULT = e.detail;
        } else {
            const numbers = e.detail?.token.split(',').map(n => parseInt(n.trim()));
            globalThis.HAPP_TOKEN = Array.from(new Uint8Array(numbers));
            globalThis.TAURI_SHOW_ADMIN = undefined;
            globalThis.HAPP_ID = e.detail?.name;
            globalThis.HC_APP_PORT = e.detail?.port;
        }
        this.requestUpdate();
    }

      /** */
      override render() {
        console.log("<vines-index>.render()", globalThis.TAURI_SHOW_ADMIN);
        /** Render all */
        if (globalThis.TAURI_SHOW_ADMIN || !globalThis.HAPP_ID) {
            return html`<vines-admin></vines-admin>`;
        }
        return html`<vines-app></vines-app>`;
      }

  /** */
  static override get styles() {
    return [
      css`
          :host {
              background: #e42751;
              display: block;
              height: 100vh;
              width: 100%;
              margin: 0px;
              box-sizing: border-box;
      `,

    ];
  }
}
