import { html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import {sharedStyles} from "../../styles";
import {msg} from "@lit/localize";
import {AgentId, ZomeElement} from "@ddd-qc/lit-happ";
import {ProfilesAltPerspective, ProfilesAltZvm} from "@ddd-qc/profiles-dvm";
import {FileLimits, Limitations, Moderation, TextLimits} from "../../bindings/threads.types";
import {defaultLimitations, defaultModeration} from "../../viewModels/threads.materialize";

@customElement('rules-edit')
export class RulesEdit extends ZomeElement<ProfilesAltPerspective, ProfilesAltZvm> {

  constructor() {
    super(ProfilesAltZvm.DEFAULT_ZOME_NAME);
  }

  @property()
  moderation: Moderation = defaultModeration();

  @property()
  limitations: Limitations = defaultLimitations();

  @state()
  private canRateLimit: boolean = false;

  @state()
  private canModerate: boolean = false;

  @state()
  private textRules: TextLimits = {
    bannedWords: [],
    minTextLength: 0,
    maxTextLength: 1000
  };

  @state()
  private fileRules: FileLimits = {
    allowedFileTypes: [],
    minFileSize: 0,
    maxFileSize: 16777216, // 16MiB default FIXME grab DNA settings
  };


  @state()
  private bannedWordInput: string = '';

  @state()
  private fileTypeInput: string = '';



  /** -- Methods -- */

  private handleCanRateLimitChange(e: CustomEvent) {
    this.canRateLimit = (e.target as any).checked;
    if (this.canRateLimit && !this.limitations.maybeAgentRateLimiting) {
      this.limitations.maybeAgentRateLimiting = [10, 24 * 60 * 60 * 1000 * 1000] // default: 10 per day
    }
  }

  private handleCanModerateChange(e: CustomEvent) {
    this.canModerate = (e.target as any).checked;
  }

  private handleAutoCanWalChange(e: CustomEvent) {
    this.limitations.canWal = (e.target as any).checked;
  }

  private handleAutoCanFileChange(e: CustomEvent) {
    if ((e.target as any).checked) {
      this.limitations.canFile = this.fileRules;
    } else {
      delete this.limitations.canFile;
    }
    this.requestUpdate();
  }

  private handleAutoCanTextChange(e: CustomEvent) {
    if ((e.target as any).checked) {
      this.limitations.canText = this.textRules;
    } else {
      delete this.limitations.canText;
    }
    this.requestUpdate();
  }

  private handleAgentRateCapChange(e: CustomEvent) {
    const value = parseInt((e.target as any).value);
    if (!isNaN(value) && value >= 0) {
      this.limitations.maybeAgentRateLimiting![0] = value;
    }
  }

  private handleAgentRateTsChange(e: CustomEvent) {
    const value = parseInt((e.target as any).value);
    if (!isNaN(value) && value >= 0) {
      this.limitations.maybeAgentRateLimiting![1] = value * 60 * 60 * 1000 * 1000;
    }
  }

  private addBannedWord() {
    if (this.bannedWordInput.trim()) {
      this.textRules.bannedWords.push(this.bannedWordInput.trim());
      this.bannedWordInput = '';
      if (this.limitations.canText) {
        this.limitations.canText = { ...this.textRules };
      }
      this.requestUpdate();
    }
  }

  private removeBannedWord(word: string) {
    this.textRules.bannedWords = this.textRules.bannedWords.filter(w => w !== word);
    if (this.limitations.canText) {
      this.limitations.canText = { ...this.textRules };
    }
    this.requestUpdate();
  }

  private addFileType() {
    if (this.fileTypeInput.trim()) {
      this.fileRules.allowedFileTypes.push(this.fileTypeInput.trim());
      this.fileTypeInput = '';
      if (this.limitations.canFile) {
        this.limitations.canFile = { ...this.fileRules };
      }
      this.requestUpdate();
    }
  }

  private removeFileType(type: string) {
    this.fileRules.allowedFileTypes = this.fileRules.allowedFileTypes.filter(t => t !== type);
    if (this.limitations.canFile) {
      this.limitations.canFile = { ...this.fileRules };
    }
    this.requestUpdate();
  }

  private handleTextMinLengthChange(e: CustomEvent) {
    const value = parseInt((e.target as any).value);
    if (!isNaN(value) && value >= 0) {
      this.textRules.minTextLength = value;
      if (this.limitations.canText) {
        this.limitations.canText = { ...this.textRules };
      }
    }
  }

  private handleTextMaxLengthChange(e: CustomEvent) {
    const value = parseInt((e.target as any).value);
    if (!isNaN(value) && value >= 0) {
      this.textRules.maxTextLength = value;
      if (this.limitations.canText) {
        this.limitations.canText = { ...this.textRules };
      }
    }
  }

  private handleFileMinSizeChange(e: CustomEvent) {
    const value = parseInt((e.target as any).value);
    if (!isNaN(value) && value >= 0) {
      this.fileRules.minFileSize = value;
      if (this.limitations.canFile) {
        this.limitations.canFile = { ...this.fileRules };
      }
    }
  }

  private handleFileMaxSizeChange(e: CustomEvent) {
    const value = parseInt((e.target as any).value);
    if (!isNaN(value) && value >= 0) {
      this.fileRules.maxFileSize = value;
      if (this.limitations.canFile) {
        this.limitations.canFile = { ...this.fileRules };
      }
    }
  }

  private handleInstructionsChange(e: CustomEvent) {
    this.moderation.instructions = (e.target as any).value;
  }

  private handleAllowedFlagsChange(e: CustomEvent) {
    const value = parseInt((e.target as any).value);
    if (!isNaN(value) && value >= 0) {
      this.moderation.allowedFlags = value;
    }
  }

  private handleAgentSelectionChange(e: CustomEvent) {
    const selectedItems = e.detail.items;
    const selectedAgents: Uint8Array[] = [];
    console.log("handleAgentSelectionChange", e, selectedItems);

    for (const item of selectedItems) {
      const agentHashB64 = item.getAttribute('data-id');
      const agentId = new AgentId(agentHashB64);
      selectedAgents.push(agentId.hash);
    }

    this.limitations.allowedAgents = selectedAgents;
  }

  private handleModeratorSelectionChange(e: CustomEvent) {
    const selectedItems = e.detail.items;
    const selectedAgents: Uint8Array[] = [];
    console.log("handleModeratorSelectionChange", e, selectedItems);

    for (const item of selectedItems) {
      const agentHashB64 = item.getAttribute('data-id');
      const agentId = new AgentId(agentHashB64);
      selectedAgents.push(agentId.hash);
    }
    this.moderation.moderators = selectedAgents;
  }


  /** */
  override render() {
    console.log("<ruled-edit>.render()", this.moderation, this.limitations, this._zvm.perspective.profiles.size);

    let peerList = [];
    for (const [agentId, actionId] of this._zvm.perspective.profileByAgent.entries()) {
      const pair = this._zvm.perspective.profiles.get(actionId)!;
      peerList.push(html`
        <ui5-mcb-item data-id=${agentId.b64} .text=${pair[0].nickname}
                      ?selected=${this.moderation.moderators.some(a => a === agentId.hash)}>
        </ui5-mcb-item>
    `)};


    /** */
    return html`
            <div class="form-section">
                <ui5-panel header-text=${msg('Configuration')} fixed style="border: 1px solid #e1e1e1;">
                    
                    <div class="field-row">
                        <ui5-label>${msg('Participants')}:</ui5-label>
                        <ui5-multi-combobox @selection-change=${this.handleAgentSelectionChange} placeholder="everyone">
                            ${peerList}
                        </ui5-multi-combobox>
                    </div>

                    <div class="field-row">
                        <ui5-label>Rate limit:</ui5-label>
                        <ui5-switch ?checked=${!!this.limitations.maybeAgentRateLimiting } @change=${this.handleCanRateLimitChange}></ui5-switch>
                        ${this.canRateLimit? html`
                            <ui5-input type="number" style="max-width: 50px" 
                                       .value=${this.limitations.maybeAgentRateLimiting![0]}
                                       placeholder="n" @change=${this.handleAgentRateCapChange}>
                            </ui5-input>
                            ${msg('messages per')}
                            <ui5-input type="number" style="max-width: 50px"
                                       .value=${this.limitations.maybeAgentRateLimiting![1] / 60 / 60 / 1000 / 1000}
                                       placeholder="x" @change=${this.handleAgentRateTsChange}>
                            </ui5-input>
                            ${msg('hour')}
                        ` : html``}
                    </div>

                    <!-- <div style="margin-top:15px;">${msg('Message Types')}</div> -->
                    
                    <div class="field-row">
                        <ui5-label style="font-size: large">WAL Embeds</ui5-label>
                        <ui5-switch ?checked=${this.limitations.canWal} @change=${this.handleAutoCanWalChange}></ui5-switch>
                        <!-- <ui5-checkbox ?checked=${this.limitations.canWal} @change=${this.handleAutoCanWalChange}></ui5-checkbox> -->
                    </div>
                    
                    <div class="field-row">
                        <ui5-label style="font-size: large">File Messages</ui5-label>
                        <ui5-switch ?checked=${this.limitations.canFile} @change=${this.handleAutoCanFileChange}></ui5-switch>
                            <!--<ui5-checkbox ?checked=${!!this.limitations.canFile} @change=${this.handleAutoCanFileChange}></ui5-checkbox> -->
                    </div>
                    
                    ${this.limitations.canFile? html`
                        <div class="sub-section">
                            <div class="field-row">
                                <ui5-label>Permitted File Types:</ui5-label>
                                <ui5-input value=${this.fileTypeInput} placeholder="all" @change=${(e: CustomEvent) => this.fileTypeInput = (e.target as any).value}></ui5-input>
                                <ui5-button @click=${this.addFileType}>Add</ui5-button> 
                            </div>
                            
                            <div class="token-list">
                                ${this.fileRules.allowedFileTypes.map(type => html`
                                    <ui5-token @click=${() => this.removeFileType(type)} text=${type}></ui5-token>
                                `)}
                            </div>
                            
                            <div class="field-row">
                                <ui5-label>Min File Size (bytes):</ui5-label>
                                <ui5-input type="number" value=${this.fileRules.minFileSize} @change=${this.handleFileMinSizeChange}></ui5-input>
                            </div>
                            
                            <div class="field-row">
                                <ui5-label>Max File Size (bytes):</ui5-label>
                                <ui5-input type="number" value=${this.fileRules.maxFileSize} @change=${this.handleFileMaxSizeChange}></ui5-input>
                            </div>
                        </div>
                    ` : ''}
                    
                    <div class="field-row" style="margin-top:20px">
                        <ui5-label style="font-size: large;">Text Messages</ui5-label>
                        <ui5-switch ?checked=${this.limitations.canText} @change=${this.handleAutoCanTextChange}></ui5-switch>
                        <!-- <ui5-checkbox ?checked=${!!this.limitations.canText} @change=${this.handleAutoCanTextChange}></ui5-checkbox> -->
                    </div>
                    
                    ${this.limitations.canText? html`
                        <div class="sub-section">
                            <div class="field-row">
                                <ui5-label>Banned Words:</ui5-label>
                                <ui5-input value=${this.bannedWordInput} @change=${(e: CustomEvent) => this.bannedWordInput = (e.target as any).value}></ui5-input>
                                <ui5-button @click=${this.addBannedWord}>Add</ui5-button>
                            </div>
                            
                            <div class="token-list">
                                ${this.textRules.bannedWords.map(word => html`
                                    <ui5-token @click=${() => this.removeBannedWord(word)} text=${word}></ui5-token>
                                `)}
                            </div>
                            
                            <div class="field-row">
                                <ui5-label>Min Text Length:</ui5-label>
                                <ui5-input type="number" value=${this.textRules.minTextLength} @change=${this.handleTextMinLengthChange}></ui5-input>
                            </div>
                            
                            <div class="field-row">
                                <ui5-label>Max Text Length:</ui5-label>
                                <ui5-input type="number" value=${this.textRules.maxTextLength} @change=${this.handleTextMaxLengthChange}></ui5-input>
                            </div>
                        </div>
                    ` : ''}
                </ui5-panel>
            </div>
            <div class="form-section" style="min-width: 500px">
                <ui5-panel header-text=${msg('Moderation')} fixed style="border: 1px solid #e1e1e1;">

                    <div class="field-row" >
                        <ui5-label style="font-size: large">${msg('Enable')}</ui5-label>
                        <ui5-switch ?checked=${this.canModerate} @change=${this.handleCanModerateChange}></ui5-switch>
                    </div>
                    
                    ${this.canModerate? html`
                      <div class="field-row">
                          <ui5-label>${msg('Moderators')}:</ui5-label>
                          <ui5-multi-combobox style="flex-grow:1;" @selection-change=${this.handleModeratorSelectionChange}>
                              ${peerList}
                          </ui5-multi-combobox>
                      </div>
                      <div class="field-row">
                          <ui5-label>Instructions:</ui5-label>
                          <ui5-textarea placeholder="Enter instructions here..." 
                              value=${this.moderation.instructions} @change=${this.handleInstructionsChange}>
                          </ui5-textarea>
                      </div>
                      <div class="field-row">
                          <ui5-label>${msg('Infringements permitted per member')}:</ui5-label>
                          <ui5-input type="number" value=${this.moderation.allowedFlags} @change=${this.handleAllowedFlagsChange}></ui5-input>
                      </div>
                    ` : ''}
                    
                </ui5-panel>
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
          gap: 20px;
          font-family: var(--sapFontFamily, "72", "72full", Arial, Helvetica, sans-serif);
          color: var(--sapTextColor, #32363a);
          margin-top: 1em;
          /*padding: 1rem;*/
        }

        .form-section {
          /*margin-bottom: 1.5rem;*/
        }

        .field-row {
          margin-bottom: 1rem;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 1rem;
        }

        .field-row ui5-label {
          min-width: 150px;
        }

        .sub-section {
          margin-left: 1.5rem;
          margin-top: 1rem;
          padding-left: 1rem;
          padding-top: 0.5rem;
          border-left: 3px solid var(--sapInformationBorderColor, #0a6ed1);
          background-color: var(--sapGroup_ContentBackground, #f7f7f7);
        }

        .actions {
          margin-top: 2rem;
          display: flex;
          justify-content: flex-end;
          gap: 0.5rem;
        }

        .token-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }
      `];
  }
}
