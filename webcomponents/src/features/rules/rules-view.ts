import {html, css} from 'lit';
import { customElement, property} from 'lit/decorators.js';
import {sharedStyles} from "../../styles";
import {msg} from "@lit/localize";
import {ZomeElement} from "@ddd-qc/lit-happ";
import {formatDuration, formatFileSize} from "../../utils";
import {ProfilesAltPerspective, ProfilesAltZvm} from "@ddd-qc/profiles-dvm";
import {renderAvatars} from "../../render";
import {FileLimits, Limitations, Moderation, TextLimits} from "../../bindings/threads.types";
import {defaultLimitations, defaultModeration} from "../../viewModels/threads.materialize";



@customElement('rules-view')
export class RulesView extends ZomeElement<ProfilesAltPerspective, ProfilesAltZvm> {

  constructor() {
    super(ProfilesAltZvm.DEFAULT_ZOME_NAME);
  }


  @property()
  moderation: Moderation = defaultModeration();

  @property()
  limitations: Limitations = defaultLimitations();


  /** */
  private renderLimitations() {
    const peerList = renderAvatars(this.limitations.allowedAgents, this, this._zvm.perspective);

    console.log("renderLimitations()", this.limitations);


    /** */
    return html`
            <div class="section">
                    <div class="field-row">
                        <div class="field-label">Message Limit:</div>
                        <div class="field-value">
                            ${!!this.limitations.maybeAgentRateLimiting
      ? html`<span>${this.limitations.maybeAgentRateLimiting[0]} ${msg('per')} ${formatDuration(this.limitations.maybeAgentRateLimiting[1])}</span>`
      : html`<ui5-icon name="accept" class="icon-true"></ui5-icon>No limit`}
                        </div>
                    </div>

                    <div class="field-row">
                        <div class="field-label">Participants:</div>
                        <div class="field-value">
                            ${this.limitations.allowedAgents.length > 0
                              ? html`<div class="peers">${peerList}</div>`
                              : html`<ui5-icon name="accept" class="icon-true"></ui5-icon>Everyone`
                            }
                        </div>
                    </div>

                    <div class="field-row">
                        <div class="field-label">WAL Embeds:</div>
                        <div class="field-value">
                            ${this.limitations.canWal
                                    ? html`<ui5-icon name="accept" class="icon-true"></ui5-icon> Enabled`
                                    : html`<ui5-icon name="decline" class="icon-false"></ui5-icon> Disabled`}
                        </div>
                    </div>
                
                    ${this.limitations.canFile ? this.renderFileRules(this.limitations.canFile) : html`
                        <div class="field-row">
                            <div class="field-label">File Messages:</div>
                            <div class="field-value">
                                <ui5-icon name="decline" class="icon-false"></ui5-icon> 
                                Disabled
                            </div>
                        </div>
                    `}

                    ${this.limitations.canText ? this.renderTextRules(this.limitations.canText) : html`
                        <div class="field-row">
                            <div class="field-label">Text Messages:</div>
                            <div class="field-value">
                                <ui5-icon name="decline" class="icon-false"></ui5-icon>
                                Disabled
                            </div>
                        </div>
                    `}
            </div>
        `;
  }


  /** */
  private renderFileRules(fileRules: FileLimits) {
    console.log("renderFileRules()", fileRules);
    return html`
            <div class="field-row">
                <div class="field-label">${msg('File Messages:')}</div>
                <div class="field-value">
                    <ui5-icon name="accept" class="icon-true"></ui5-icon> 
                    ${msg('Enabled')}
                </div>
            </div>
            
            <div class="field-group">
                <div class="field-row">
                    <div class="field-label">Allowed Types:</div>
                    <div class="field-value badge-container">
                        ${fileRules.allowedFileTypes.length > 0
      ? fileRules.allowedFileTypes.map(fileType => html`<ui5-badge color-scheme="info" style="background: rgb(57 57 57);">${fileType}</ui5-badge>`)
      : html`<ui5-icon name="accept" class="icon-true"></ui5-icon>All file types allowed`}
                    </div>
                </div>
                
                <div class="field-row">
                    <div class="field-label">Size Limits:</div>
                    <div class="field-value">
                        Min: ${formatFileSize(fileRules.minFileSize)} | 
                        Max: ${formatFileSize(fileRules.maxFileSize)}
                    </div>
                </div>
            </div>
        `;
  }


  /** */
  private renderTextRules(textRules: TextLimits) {
    return html`
            <div class="field-row">
                <div class="field-label">Text Messages:</div>
                <div class="field-value">
                    <ui5-icon name="accept" class="icon-true"></ui5-icon> Enabled
                </div>
            </div>
            
            <div class="field-group">
                <div class="field-row">
                    <div class="field-label">Banned Words:</div>
                    <div class="field-value badge-container">
                        ${textRules.bannedWords.length > 0
      ? textRules.bannedWords.map(word => html`<ui5-badge color-scheme="negative">${word}</ui5-badge>`)
      : html`<ui5-icon name="accept" class="icon-true"></ui5-icon>No banned words`}
                    </div>
                </div>
                
                <div class="field-row">
                    <div class="field-label">Text Length Limits:</div>
                    <div class="field-value">
                        Min: ${textRules.minTextLength} | 
                        Max: ${textRules.maxTextLength} ${msg('characters')}
                    </div>
                </div>
            </div>
        `;
  }


  /** */
  private renderModeration() {
    const peerList = renderAvatars(this.moderation.moderators, this, this._zvm.perspective);
    /** */
    return html`
            <div class="section">
                    <div class="field-row">
                        <div class="field-label">Instructions:</div>
                        <div class="field-value">
                            ${this.moderation.instructions ? html`
                                <pre>${this.moderation.instructions}</pre>
                            ` : html`
                                <ui5-text>No instructions provided</ui5-text>
                            `}
                        </div>
                    </div>
                                     
                    <div class="field-row">
                        <div class="field-label">${msg('Moderators')}:</div>
                        <div class="field-value">
                            ${this.moderation.moderators.length > 0
      ? html`<div class="peers">${peerList}</div>`
      : html`<ui5-text style="color:red">${msg('No moderators set for this channel')}</ui5-text>`}
                        </div>
                    </div>

                <div class="field-row">
                    <div class="field-label">Infringements allowed:</div>
                    <div class="field-value">${this.moderation.allowedFlags}</div>
                </div>
                
            </div>
        `;
  }


  /** */
  override render() {
    console.log("<ruled-view>.render()", this.moderation, this.limitations);

    /** */
    return html`
      <div slot="header" style="display: flex">
          <ui5-title level="H3">${msg('Rules')}</ui5-title>
          <div style="flex-grow: 1"></div>
      </div>
      
      <div class="section"></div>
      <div style="display:flex; flex-direction: row">
          ${this.renderLimitations()}
          ${this.moderation.moderators.length > 0? this.renderModeration() : html``}
      </div>
    `;
  }



  /** */
  static override get styles() {
    return [
      sharedStyles,
      css`
        :host {
          /*max-width: 700px;*/
        }
        
        .peers {
          display: flex;
          flex-direction: row;
          gap: 5px;
        }
        .section {
          margin-bottom: 1.5rem;
        }
        .field-row {
          display: flex;
          flex-wrap: wrap;
          align-items: baseline;
          margin-bottom: 0.75rem;
          gap: 0.5rem;
        }
        .field-label {
          font-weight: bold;
          min-width: 180px;
          color: var(--sapContent_LabelColor, #6a6d70);
        }
        .field-value {
          flex: 1;
        }
        .field-group {
          margin-left: 1.5rem;
          padding-left: 1rem;
          border-left: 3px solid var(--sapInformationBorderColor, #0a6ed1);
          margin-bottom: 1rem;
        }
        .badge-container {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .icon-true {
          color: var(--sapPositiveColor, #107e3e);
        }
        .icon-false {
          color: var(--sapNegativeColor, #bb0000);
        }
        pre {
          background-color: var(--sapGroup_ContentBackground, #f7f7f7);
          /*padding: 0.5rem;*/
          /*border-radius: 0.25rem;*/
          white-space: pre-wrap;
          word-break: break-word;
          margin: 0;
        }
      `
    ]
  }
}
