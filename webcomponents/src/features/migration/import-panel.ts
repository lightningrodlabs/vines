import {customElement, state} from "lit/decorators.js";
import {css, html, LitElement} from "lit";
import {msg} from "@lit/localize";
import {sharedStyles} from "../../styles";

/**
 * @element
 */
@customElement("import-panel")
export class ImportPanel extends LitElement {

    /** The import options are the answer to the question, not the first thing
     *  shown: this panel greets whoever installed the tool, and most of them are
     *  here to start a channel rather than to migrate a Discord export. */
    @state() private _answer: "asking" | "import" | "channel" = "asking";


    /** */
    private renderQuestion() {
        return html`
            <h3>${msg('Do you want to bring your data from another app?')}</h3>
            <div style="display:flex; gap:15px; flex-wrap:wrap;">
                <ui5-button design="Emphasized"
                            @click=${(e:any) => {
                                e.stopPropagation(); e.preventDefault();
                                this._answer = "import";
                            }}>
                    ${msg('Yes, import data')}
                </ui5-button>
                <ui5-button @click=${(e:any) => {
                                e.stopPropagation(); e.preventDefault();
                                this._answer = "channel";
                                this.dispatchEvent(new CustomEvent('create-channel-requested', {bubbles: true, composed: true}));
                            }}>
                    ${msg('No, create a channel')}
                </ui5-button>
            </div>
        `;
    }


    /** Shown once the question has been answered with "no": the panel is the
     *  only thing on screen at this point, so it has to say where to go next. */
    private renderChannelPrompt() {
        return html`
            <h3>${msg('Create your first channel')}</h3>
            <div>${msg('Channels live inside a category. Create one, then add a channel to it — or use the + in the channel list on the left at any time.')}</div>
            <div style="display:flex; gap:15px; margin-top:10px; flex-wrap:wrap;">
                <ui5-button design="Emphasized"
                            @click=${(e:any) => {
                                e.stopPropagation(); e.preventDefault();
                                this.dispatchEvent(new CustomEvent('create-channel-requested', {bubbles: true, composed: true}));
                            }}>
                    ${msg('Create a channel')}
                </ui5-button>
                <ui5-button @click=${(e:any) => {
                                e.stopPropagation(); e.preventDefault();
                                this._answer = "import";
                            }}>
                    ${msg('Import data instead')}
                </ui5-button>
            </div>
        `;
    }


    override render() {
        console.log("<import-panel>.render()", this._answer);
        if (this._answer == "asking") {
            return this.renderQuestion();
        }
        if (this._answer == "channel") {
            return this.renderChannelPrompt();
        }
        return html`
            <!-- <h1>${msg('Import Data')}</h1> -->
            <h3>${msg('Bring your data from other apps')}</h3>
            <div class="direction" style="display: flex; gap:15px">
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
            <div style="margin-top:10px">
                <ui5-button @click=${(e:any) => {
                                e.stopPropagation(); e.preventDefault();
                                this._answer = "channel";
                            }}>
                    ${msg('Back')}
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
              display: flex;
              flex-direction: column;
              gap: 5px;
              /*width: 650px;*/
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

          .direction {
              flex-direction: row;
          }
                
          /* Mobile */
          @media (max-width: 500px) {
              .direction {
                  flex-direction: column;
              }
          }
    `]}
}
