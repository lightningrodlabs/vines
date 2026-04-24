import {customElement} from "lit/decorators.js";
import {css, html, LitElement} from "lit";
import {msg} from "@lit/localize";
import {sharedStyles} from "../../styles";

/**
 * @element
 */
@customElement("import-panel")
export class ImportPanel extends LitElement {

    override render() {
        console.log("<import-panel>.render()");
        return html`
            <!-- <h1>${msg('Import Data')}</h1> -->
            <h3>${msg('Bring your data from other apps')}</h3>
            <div style="display: flex; flex-direction: row; gap:15px">
                <div class="card">
                    <h3>🎮 Discord</h3>
                    <div>${msg('Import a Discord Channel exported from')} <a href="https://github.com/Tyrrrz/DiscordChatExporter">Discord Chat Exporter</a> ${msg('as JSON')}</div>
                    <div style="flex-grow: 1"></div>
                    <ui5-button design="Emphasized" 
                                @click=${(e:any) => {
                                    e.stopPropagation();e.preventDefault();
                                    this.dispatchEvent(new CustomEvent<boolean>('import-requested', {detail: true, bubbles: true, composed: true}));
                                }}>
                        ${msg('Import')}
                    </ui5-button>
                </div>

                <div class="card">
                    <h3>🌱 Vines</h3>
                    <div>${msg('Import data from a different Vines instance')}</div>
                    <div style="flex-grow: 1"></div>
                    <div style="display: flex; flex-direction: row; gap:15px">
                        <ui5-button design="Emphasized"  
                                    style="flex-grow:1;"
                                    @click=${(e:any) => {
                                        e.stopPropagation();e.preventDefault();
                                        this.dispatchEvent(new CustomEvent<boolean>('import-requested', {detail: true, bubbles: true, composed: true}));
                                    }}>
                            ${msg('Import Data')}
                        </ui5-button>
                        <ui5-button design="Emphasized"
                                    style="flex-grow:1;"
                                    @click=${(e:any) => {
                                        e.stopPropagation();e.preventDefault();
                                        this.dispatchEvent(new CustomEvent<boolean>('import-requested', {detail: false, bubbles: true, composed: true}));
                                    }}>
                            ${msg('Import Files')}
                        </ui5-button>
                    </div>
                </div>
            </div>
        `;
    }


    /** */
    static override get styles() {
        return [
            sharedStyles,
            css`
          :host {
              display: flex;
              flex-direction: column;
              gap: 5px;
              width: 650px;
              padding-right: 5px;
              margin-bottom: 10px;
          }
                
          .card {
            display: flex;
            flex-direction: column;
            gap:15px;
            border-radius: 10px;
            background: #e7e7e7;
            padding:10px;
            flex:1;
            line-height: 24px;
          }
    `]}
}
