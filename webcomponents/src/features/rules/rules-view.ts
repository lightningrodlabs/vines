import {html, css} from 'lit';
import { customElement, property} from 'lit/decorators.js';
import {sharedStyles} from "../../styles";
import { FileRules, Rules, RulesType, TextRules} from "../../bindings/threads.types";
import {msg} from "@lit/localize";
import {ZomeElement} from "@ddd-qc/lit-happ";
import {formatFileSize} from "../../utils";
import {ProfilesAltPerspective, ProfilesAltZvm} from "@ddd-qc/profiles-dvm";
import {renderAvatars} from "../../render";



export function getRuleType(rules: Rules): RulesType {
  if ('none' in rules) return RulesType.None;
  if ('auto' in rules) return RulesType.Auto;
  if ('manual' in rules) return RulesType.Manual;
  return RulesType.None;
}


@customElement('rules-view')
export class RulesView extends ZomeElement<ProfilesAltPerspective, ProfilesAltZvm> {

  constructor() {
    super(ProfilesAltZvm.DEFAULT_ZOME_NAME);
  }


  @property()
  rules: Rules = {none: true};

  /** */
  private renderNoneRules() {
    return html`
            <div class="section">
                  <ui5-text>${msg('No specific rules have been set for this channel.')}</ui5-text>
            </div>
        `;
  }


  /** */
  private renderAutoRules() {
    const autoRules = 'auto' in this.rules ? this.rules.auto : null;
    if (!autoRules) return html``;
    const peerList = renderAvatars(autoRules.allowedAgents, this, this._zvm.perspective);

    console.log("renderAutoRules", autoRules);
    /** */
    return html`
            <div class="section">
                    <div class="field-row">
                        <div class="field-label">Limit per Day:</div>
                        <div class="field-value">
                            ${!!autoRules.maybeAgentCapPerDay
      ? html`<span>${autoRules.maybeAgentCapPerDay}</span>`
      : html`<ui5-icon name="accept" class="icon-true"></ui5-icon>No limit`}
                        </div>
                    </div>

                    <div class="field-row">
                        <div class="field-label">Allowed Members:</div>
                        <div class="field-value">
                            ${autoRules.allowedAgents.length > 0
                              ? html`<div class="peers">${peerList}</div>`
                              : html`<ui5-icon name="accept" class="icon-true"></ui5-icon>Everyone`
                            }
                        </div>
                    </div>

                    <div class="field-row">
                        <div class="field-label">WAL Embeds:</div>
                        <div class="field-value">
                            ${autoRules.canWal
                                    ? html`<ui5-icon name="accept" class="icon-true"></ui5-icon> Enabled`
                                    : html`<ui5-icon name="decline" class="icon-false"></ui5-icon> Disabled`}
                        </div>
                    </div>
                
                    ${autoRules.canFile ? this.renderFileRules(autoRules.canFile) : html`
                        <div class="field-row">
                            <div class="field-label">File Messages:</div>
                            <div class="field-value">
                                <ui5-icon name="decline" class="icon-false"></ui5-icon> 
                                Disabled
                            </div>
                        </div>
                    `}

                    ${autoRules.canText ? this.renderTextRules(autoRules.canText) : html`
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
  private renderFileRules(fileRules: FileRules) {
    return html`
            <div class="field-row">
                <div class="field-label">File Messages:</div>
                <div class="field-value">
                    <ui5-icon name="accept" class="icon-true"></ui5-icon> Enabled
                </div>
            </div>
            
            <div class="field-group">
                <div class="field-row">
                    <div class="field-label">Allowed File Types:</div>
                    <div class="field-value badge-container">
                        ${fileRules.allowedFileTypes.length > 0
      ? fileRules.allowedFileTypes.map(type => html`<ui5-badge color-scheme="info">${type}</ui5-badge>`)
      : html`<ui5-icon name="accept" class="icon-true"></ui5-icon>All file types allowed`}
                    </div>
                </div>
                
                <div class="field-row">
                    <div class="field-label">File Size Limits:</div>
                    <div class="field-value">
                        Min: ${formatFileSize(fileRules.minFileSize)} | 
                        Max: ${formatFileSize(fileRules.maxFileSize)}
                    </div>
                </div>
            </div>
        `;
  }


  /** */
  private renderTextRules(textRules: TextRules) {
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
  private renderManualRules() {
    const manualRules = 'manual' in this.rules ? this.rules.manual : null;
    if (!manualRules) return html``;
    const peerList = renderAvatars(manualRules.moderators, this, this._zvm.perspective);
    /** */
    return html`
            <div class="section">
                    <div class="field-row">
                        <div class="field-label">Instructions:</div>
                        <div class="field-value">
                            ${manualRules.instructions ? html`
                                <pre>${manualRules.instructions}</pre>
                            ` : html`
                                <ui5-text>No instructions provided</ui5-text>
                            `}
                        </div>
                    </div>
                                     
                    <div class="field-row">
                        <div class="field-label">${msg('Moderators')}:</div>
                        <div class="field-value">
                            ${manualRules.moderators.length > 0
      ? html`<div class="peers">${peerList}</div>`
      : html`<ui5-text style="color:red">${msg('No moderators set for this channel')}</ui5-text>`}
                        </div>
                    </div>

                <div class="field-row">
                    <div class="field-label">Infringements allowed:</div>
                    <div class="field-value">${manualRules.allowedFlags}</div>
                </div>
                
            </div>
        `;
  }


  /** */
  override render() {
    console.log("<ruled-edit>.render()", this.rules);
    const ruleType = getRuleType(this.rules);

    const style = ruleType === RulesType.None
      ? 'color: #ab9776; background: rgb(235 234 159)'
      : ruleType === RulesType.Auto
        ? 'color: purple; background: rgb(229 201 249)'
        : 'color: #4d4de7; background: rgb(208 237 255)';
    const scheme = ruleType === RulesType.None ? '1' : ruleType === RulesType.Auto ? '4' : '6';

    /** */
    return html`
      <div slot="header" style="display: flex">
          <ui5-title level="H3">${msg('Rules')}</ui5-title>
          <div style="flex-grow: 1"></div>
          <ui5-badge color-scheme=${scheme} style=${style}>${ruleType}</ui5-badge>
      </div>
      
      <div class="section"></div>
      
      ${ruleType === RulesType.Auto ? this.renderAutoRules() : ''}
      ${ruleType === RulesType.Manual ? this.renderManualRules() : ''}
      ${ruleType === RulesType.None ? this.renderNoneRules() : ''}
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
