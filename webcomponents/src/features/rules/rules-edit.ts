import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import {sharedStyles} from "../../styles";
import {AutoRules, FileRules, ManualRules, Rules, RulesType, TextRules} from "../../bindings/threads.types";
import {msg} from "@lit/localize";
import {AgentId, AgentIdMap} from "@ddd-qc/lit-happ";
import {Profile} from "@ddd-qc/profiles-dvm/dist/bindings/profiles.types";
import {Timestamp} from "@holochain/client";

@customElement('rules-edit')
export class RulesEdit extends LitElement {

  @property()
  rules: Rules = { none: null };

  @property()
  availableProfiles: AgentIdMap<[Profile, Timestamp]> = new AgentIdMap();


  @state()
  private rulesType: RulesType = RulesType.None;



  @state()
  private manualRules: ManualRules = {
    instructions: '',
    allowedFlags: 1,
    validators: []
  };

  @state()
  private textRules: TextRules = {
    bannedWords: [],
    minTextLenght: 0,
    maxTextLenght: 1000
  };

  @state()
  private fileRules: FileRules = {
    allowedFileTypes: [],
    minFileSize: 0,
    maxFileSize: 16777216, // 16MiB default FIXME grab DNA settings
  };

  @state()
  private autoRules: AutoRules = {
    allowedAgents: [],
    canWal: true,
    canFile: this.fileRules,
    canText: this.textRules,
  };

  @state()
  private bannedWordInput: string = '';

  @state()
  private fileTypeInput: string = '';



  /** */
  private handleTypeChange(e: CustomEvent) {
    const selectedValue = (e.detail.selectedOption as HTMLInputElement).value as RulesType;
    console.log("<rules-edit> handleTypeChange", selectedValue, e);
    this.rulesType = selectedValue;

    if (selectedValue === RulesType.None) {
      this.rules = { none: null };
    } else if (selectedValue === RulesType.Auto) {
      this.rules = { auto: this.autoRules };
    } else if (selectedValue === RulesType.Manual) {
      this.rules = { manual: this.manualRules };
    }

    this.requestUpdate();
  }


  private handleAutoCanWalChange(e: CustomEvent) {
    this.autoRules.canWal = (e.target as any).checked;
    this.rules = { auto: this.autoRules };
  }

  private handleAutoCanFileChange(e: CustomEvent) {
    if ((e.target as any).checked) {
      this.autoRules.canFile = this.fileRules;
    } else {
      delete this.autoRules.canFile;
    }
    this.rules = { auto: this.autoRules };
  }

  private handleAutoCanTextChange(e: CustomEvent) {
    if ((e.target as any).checked) {
      this.autoRules.canText = this.textRules;
    } else {
      delete this.autoRules.canText;
    }
    this.rules = { auto: this.autoRules };
  }

  private handleAgentCapChange(e: CustomEvent) {
    const value = parseInt((e.target as any).value);
    if (!isNaN(value) && value >= 0) {
      this.autoRules.maybeAgentCapPerDay = value;
    } else {
      delete this.autoRules.maybeAgentCapPerDay;
    }
    this.rules = { auto: this.autoRules };
  }

  private addBannedWord() {
    if (this.bannedWordInput.trim()) {
      this.textRules.bannedWords.push(this.bannedWordInput.trim());
      this.bannedWordInput = '';
      if (this.autoRules.canText) {
        this.autoRules.canText = { ...this.textRules };
        this.rules = { auto: { ...this.autoRules } };
      }
      this.requestUpdate();
    }
  }

  private removeBannedWord(word: string) {
    this.textRules.bannedWords = this.textRules.bannedWords.filter(w => w !== word);
    if (this.autoRules.canText) {
      this.autoRules.canText = { ...this.textRules };
      this.rules = { auto: { ...this.autoRules } };
    }
    this.requestUpdate();
  }

  private addFileType() {
    if (this.fileTypeInput.trim()) {
      this.fileRules.allowedFileTypes.push(this.fileTypeInput.trim());
      this.fileTypeInput = '';
      if (this.autoRules.canFile) {
        this.autoRules.canFile = { ...this.fileRules };
        this.rules = { auto: { ...this.autoRules } };
      }
      this.requestUpdate();
    }
  }

  private removeFileType(type: string) {
    this.fileRules.allowedFileTypes = this.fileRules.allowedFileTypes.filter(t => t !== type);
    if (this.autoRules.canFile) {
      this.autoRules.canFile = { ...this.fileRules };
      this.rules = { auto: { ...this.autoRules } };
    }
    this.requestUpdate();
  }

  private handleTextMinLengthChange(e: CustomEvent) {
    const value = parseInt((e.target as any).value);
    if (!isNaN(value) && value >= 0) {
      this.textRules.minTextLenght = value;
      if (this.autoRules.canText) {
        this.autoRules.canText = { ...this.textRules };
        this.rules = { auto: { ...this.autoRules } };
      }
    }
  }

  private handleTextMaxLengthChange(e: CustomEvent) {
    const value = parseInt((e.target as any).value);
    if (!isNaN(value) && value >= 0) {
      this.textRules.maxTextLenght = value;
      if (this.autoRules.canText) {
        this.autoRules.canText = { ...this.textRules };
        this.rules = { auto: { ...this.autoRules } };
      }
    }
  }

  private handleFileMinSizeChange(e: CustomEvent) {
    const value = parseInt((e.target as any).value);
    if (!isNaN(value) && value >= 0) {
      this.fileRules.minFileSize = value;
      if (this.autoRules.canFile) {
        this.autoRules.canFile = { ...this.fileRules };
        this.rules = { auto: { ...this.autoRules } };
      }
    }
  }

  private handleFileMaxSizeChange(e: CustomEvent) {
    const value = parseInt((e.target as any).value);
    if (!isNaN(value) && value >= 0) {
      this.fileRules.maxFileSize = value;
      if (this.autoRules.canFile) {
        this.autoRules.canFile = { ...this.fileRules };
        this.rules = { auto: { ...this.autoRules } };
      }
    }
  }

  private handleInstructionsChange(e: CustomEvent) {
    this.manualRules.instructions = (e.target as any).value;
    this.rules = { manual: this.manualRules };
  }

  private handleAllowedFlagsChange(e: CustomEvent) {
    const value = parseInt((e.target as any).value);
    if (!isNaN(value) && value >= 0) {
      this.manualRules.allowedFlags = value;
      this.rules = { manual: this.manualRules };
    }
  }

  private handleAgentSelectionChange(e: CustomEvent) {
    const selectedItems = (e.target as any).selectedItems;
    const selectedAgents: Uint8Array[] = [];

    for (const item of selectedItems) {
      const agentHashB64 = item.getAttribute('data-id');
      const agentId = new AgentId(agentHashB64);
      const agent = this.availableProfiles.get(agentId);
      if (agent) {
        selectedAgents.push(agentId.hash);
      }
    }

    if (this.rulesType === RulesType.Auto) {
      this.autoRules.allowedAgents = selectedAgents;
      this.rules = { auto: this.autoRules };
    } else if (this.rulesType === RulesType.Manual) {
      this.manualRules.validators = selectedAgents;
      this.rules = { manual: this.manualRules };
    }
  }

  private dispatchRulesSavedEvent() {
    this.dispatchEvent(new CustomEvent('rules-saved', {
      detail: {
        rules: this.rules
      },
      bubbles: true,
      composed: true
    }));
  }


  /** */
  override render() {
    console.log("<ruled-edit>.render()", this.rules, this.rulesType);

    let peerList = [];
    for (const [id, [profile, _ts]] of this.availableProfiles.entries()) {
      console.log("<ruled-edit>.render() profile", profile.nickname);
      peerList.push(html`
        <ui5-mcb-item data-id=${id.b64} .text=${profile.nickname}
                      ?selected=${this.manualRules.validators.some(a => a === id.hash)}>
        </ui5-mcb-item>
    `)};

    return html`
        <ui5-title level="H3">${msg('Rules')}</ui5-title>        
            <div class="form-section">
                
                <div class="field-row">
                    <ui5-label>Type:</ui5-label>
                    <ui5-select @change=${this.handleTypeChange}>
                        <ui5-option value=${RulesType.None} ?selected=${this.rulesType === RulesType.None}>None</ui5-option>
                        <ui5-option value=${RulesType.Auto} ?selected=${this.rulesType === RulesType.Auto}>Auto</ui5-option>
                        <ui5-option value=${RulesType.Manual} ?selected=${this.rulesType === RulesType.Manual}>Manual</ui5-option>
                    </ui5-select>
                </div>
            
            ${this.rulesType === RulesType.Auto ? html`
                <ui5-panel header="Auto Rules Configuration" style="border: 1px solid #e1e1e1;">
                    
                    <div class="field-row">
                        <ui5-label>${msg('Allow list:')}</ui5-label>
                        <ui5-multi-combobox @selection-change=${this.handleAgentSelectionChange} placeholder="everyone">
                            ${peerList}
                        </ui5-multi-combobox>
                    </div>

                    <div class="field-row">
                        <ui5-label>Message cap per day:</ui5-label>
                        <ui5-input type="number" value=${this.autoRules.maybeAgentCapPerDay || ''}
                                   placeholder="No limit" @change=${this.handleAgentCapChange}>
                        </ui5-input>
                    </div>

                    <div style="margin-top:15px;">${msg('Message Types')}</div>
                    
                    <div class="field-row">
                        <ui5-label style="font-size: large">WAL</ui5-label>
                        <ui5-switch ?checked=${this.autoRules.canWal} @change=${this.handleAutoCanWalChange}></ui5-switch>
                        <!-- <ui5-checkbox ?checked=${this.autoRules.canWal} @change=${this.handleAutoCanWalChange}></ui5-checkbox> -->
                    </div>
                    
                    <div class="field-row">
                        <ui5-label style="font-size: large">File</ui5-label>
                        <ui5-switch ?checked=${this.autoRules.canFile} @change=${this.handleAutoCanFileChange}></ui5-switch>
                            <!--<ui5-checkbox ?checked=${!!this.autoRules.canFile} @change=${this.handleAutoCanFileChange}></ui5-checkbox> -->
                    </div>
                    
                    ${this.autoRules.canFile ? html`
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
                        <ui5-label style="font-size: large;">Text</ui5-label>
                        <ui5-switch ?checked=${this.autoRules.canText} @change=${this.handleAutoCanTextChange}></ui5-switch>
                        <!-- <ui5-checkbox ?checked=${!!this.autoRules.canText} @change=${this.handleAutoCanTextChange}></ui5-checkbox> -->
                    </div>
                    
                    ${this.autoRules.canText? html`
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
                                <ui5-input type="number" value=${this.textRules.minTextLenght} @change=${this.handleTextMinLengthChange}></ui5-input>
                            </div>
                            
                            <div class="field-row">
                                <ui5-label>Max Text Length:</ui5-label>
                                <ui5-input type="number" value=${this.textRules.maxTextLenght} @change=${this.handleTextMaxLengthChange}></ui5-input>
                            </div>
                        </div>
                    ` : ''}
                </ui5-panel>
            ` : ''}

            
            ${this.rulesType === RulesType.Manual ? html`
                <ui5-panel header="Manual Rules Configuration" style="border: 1px solid #e1e1e1;">
                    <div class="field-row">
                        <ui5-label>Instructions:</ui5-label>
                        <ui5-textarea placeholder="Enter instructions here..." 
                            value=${this.manualRules.instructions} @change=${this.handleInstructionsChange}>
                        </ui5-textarea>
                    </div>
                    
                    <div class="field-row">
                        <ui5-label>${msg('Infringements permitted per user')}:</ui5-label>
                        <ui5-input type="number" value=${this.manualRules.allowedFlags} @change=${this.handleAllowedFlagsChange}></ui5-input>
                    </div>
                    
                    <div class="field-row">
                        <ui5-label>Admins:</ui5-label>
                        <ui5-multi-combobox style="flex-grow:1;" @selection-change=${this.handleAgentSelectionChange}>
                            ${peerList}
                        </ui5-multi-combobox>
                    </div>
                </ui5-panel>
            ` : ''}

            <!--
            <div class="actions">
                <ui5-button design="Emphasized" @click=${() => this.dispatchRulesSavedEvent()}>${msg('Save')}</ui5-button>
                <ui5-button design="Transparent">${msg('Cancel')}</ui5-button>
            </div>
            -->
            </div>                
        `;
  }


  /** */
  static override get styles() {
    return [
      sharedStyles,
      css`
        :host {
          display: block;
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
