import {css, html} from "lit";
import {customElement, state} from "lit/decorators.js";
import {msg} from "@lit/localize";
import Dialog from "@ui5/webcomponents/dist/Dialog";
import {sharedStyles} from "../../styles";
import {ActionId, AgentId, DnaElement} from "@ddd-qc/lit-happ";
import {ThreadsDvm} from "../../viewModels/threads.dvm";
import {Thread} from "../../viewModels/thread";
import {GetStrategy} from "@holochain-open-dev/core-types";
import {SpecialSubjectType} from "../../events";


/**
 * @element
 */
@customElement("export-summary-dialog")
export class ExportSummaryDialog extends DnaElement<unknown, ThreadsDvm> {

  /** */
  constructor() {
    super(ThreadsDvm.DEFAULT_BASE_ROLE_NAME);
  }


  @state() private _selectedChannels: Set<string> = new Set();

  @state() private _fetchingAll: boolean = false;



  /** */
  open() {
    //this._data = data;
    const dialog = this.shadowRoot!.getElementById("export-dialog") as Dialog;
    //console.log("<export-summary>.open()", data, dialog);
    dialog.open = true;
  }


  /** */
  downloadTextFile(filename: string, content: string): void {
    console.debug("downloadTextFile()", filename, content.length);
    const blob = new Blob([content], {type: 'text/plain'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }


  /** Pull all beads from the thread on toggle */
  private toggleChannel(key: ActionId) {
    const selection = new Set(this._selectedChannels);
    if (selection.has(key.b64)) {
      selection.delete(key.b64);
    } else {
      selection.add(key.b64);
      this._dvm.threadsZvm.pullAllBeads(key, GetStrategy.Local).then(() => this.requestUpdate());
    }
    this._selectedChannels = selection;
  }


  /** */
  private toggleAll() {
    // if (!this.data) return;
     const allKeys = Array.from(this._dvm.threadsZvm.perspective.threads.keys()).map((k) => k.b64);
    if (this._selectedChannels.size === allKeys.length) {
      this._selectedChannels = new Set();
    } else {
      this._selectedChannels = new Set(allKeys);
    }
  }


  /** */
  private async fetchAll() {
    await this._dvm.threadsZvm.probeAllInnerAsync(GetStrategy.Local);
    /* Probe all threads */
    let probes = []
    for (const [ppAh, _thread] of this._dvm.threadsZvm.perspective.threads) {
      probes.push(this._dvm.threadsZvm.pullAllBeads(ppAh, GetStrategy.Local));
    }
    await Promise.all(probes);
  }


  /** */
  determineCategory(typeName: string, catName: string): string {
    switch (typeName) {
      case SpecialSubjectType.Asset: return msg("Comments about Assets"); break;
      case SpecialSubjectType.Applet: return msg("Comments about Tools"); break;
      case SpecialSubjectType.AgentPubKey: return msg("Messages"); break;
      case SpecialSubjectType.ParticipationProtocol: return msg("Comments about Threads"); break;
      case SpecialSubjectType.SubjectType: return msg("Comments about SubjectTypes"); break;
      //case SpecialSubjectType.SemanticTopic: return msg("Comments about Categories"); break;
      case SpecialSubjectType.AnyBead: return msg("Comments about Assets (2)"); break;
      case SpecialSubjectType.EntryBead: return msg("Comments about Files"); break;
      case SpecialSubjectType.EncryptedBead:
      case SpecialSubjectType.TextBead: return msg("Comments about Messages"); break;
      default:
        break;
    }
    return catName;
  }

  /** */
  determineThreadTitle(thread: Thread): string {
    let title = thread.title; //thread.pp.purpose;
    switch (thread.pp.subject.typeName) {
      case SpecialSubjectType.AgentPubKey:
        const profile = this._dvm.profilesZvm.perspective.getProfile(new AgentId(thread.pp.subject.address));
        title = profile? profile.nickname : msg("Unknown");
      break;
      case SpecialSubjectType.Asset:
      case SpecialSubjectType.Applet:
      case SpecialSubjectType.SubjectType:
      case SpecialSubjectType.ParticipationProtocol:
      case SpecialSubjectType.AnyBead:
      case SpecialSubjectType.EntryBead:
        title = thread.pp.subject.name;
        break;
      case SpecialSubjectType.TextBead:
        let latest = this._dvm.threadsZvm.perspective.getLatestEdit(new ActionId(thread.pp.subject.address)) ?? thread.pp.subject.name;
        title = '"' + latest + '"';
        break;
      default:
        break;
    }
    return title;
  }


  /** */
  override render() {
    console.log("<export-summary-dialog>.render()");

    let reactionsCount: number = this._dvm.threadsZvm.perspective.emojiReactions.size;
    let channelCount: number = this._dvm.threadsZvm.perspective.threads.size;
    let authorsCount: number = this._dvm.profilesZvm.perspective.profiles.size;
    let msgCount: number = this._dvm.threadsZvm.perspective.beads.size;

    /** Subject type -> Subject Name -> Thread[] */
    let channelsByCategory = new Map<string, Map<string, [ActionId, Thread][]>>();
    for (const [ppAh, thread] of this._dvm.threadsZvm.perspective.threads.entries()) {
      const typeKey = thread.pp.subject.typeName;
      if (!channelsByCategory.has(typeKey)) channelsByCategory.set(typeKey, new Map());
      const catKey = thread.pp.subject.name;
      if (thread.pp.subject.typeName === SpecialSubjectType.TextBead && thread.pp.purpose == "EDIT") {
        continue;
      }
      if (!channelsByCategory.get(typeKey)!.has(catKey)) channelsByCategory.get(typeKey)!.set(catKey, []);
      channelsByCategory.get(typeKey)!.get(catKey)!.push([ppAh,thread]);
      //msgCount += thread.beadLinksTree.length;
    }

    const allSelected = this._selectedChannels.size === channelCount;

    /** render all */
    return html`
        <ui5-dialog id="export-dialog" header-text=${msg("Export Summary")}>
         <div id="content">
          <!-- Summary -->
          ${this._fetchingAll ? 
                  html`<div style="height: 100px">
                      <ui5-busy-indicator delay="0" size="Medium" active style="width:100%; height:100%;"></ui5-busy-indicator>
                  <!-- ${msg("Fetching all messages...")} -->
                  </div>
            ` : html`
          <div class="stat-cards">
            ${([
                { label: msg("Channels"), value: channelCount },
                { label: msg("Messages"), value: msgCount },
                { label: msg("Authors"), value: authorsCount },
                { label: msg("Reactions"), value: reactionsCount },
            ] as const
            ).map(({ label, value }) => html`
            <div class="stat-card">
                <span class="stat-label">${label}</span>
                <span class="stat-value">${value.toLocaleString()}</span>
            </div>
            `)}
          </div>
        `}
            
         <!-- Channel selection -->
         <div class="select-all-row">
            <ui5-button @click=${this.toggleAll}>${allSelected? msg('Deselect All'): msg('Select All')}</ui5-button>
            <ui5-button @click=${async () => {
                this._fetchingAll = true;
                await this.fetchAll();
                this._fetchingAll = false;
            }}>${msg('Fetch All messages')}</ui5-button>
         </div>            
         <div class="channel-section">
            ${[...channelsByCategory.entries()].map(([typeName, catMap]) => {
              const res = [...catMap.entries()].map(([category, catMap]) => {
                let catName = this.determineCategory(typeName, category);
                return html`
                  <div>
                    <p class="channel-group-title">
                      ${catName}
                    </p>
                    <div class="channel-list">
                      ${catMap.map(([ppAh, thread]) => {
                          //console.log("<export-summary-dialog> thread subject", thread.pp.subject, thread);
                          let title = this.determineThreadTitle(thread);
                          const selected = this._selectedChannels.has(ppAh.b64);
                          return html`
                              <div class="channel-item ${selected ? "selected" : ""}"
                                   @click=${() => this.toggleChannel(ppAh)}
                                   role="checkbox"
                                   .aria-checked=${selected}
                                   tabindex="0"
                                   @keydown=${(e: KeyboardEvent) => {
                                       if (e.key === "Enter") {
                                           e.preventDefault();
                                           this.toggleChannel(ppAh);
                                       }
                                   }}>
                                  <ui5-checkbox ?checked=${selected}></ui5-checkbox>
                                  <span class="channel-name">${title}</span>
                                  <span class="channel-meta">${thread.beadLinksTree.length}</span>
                              </div>
                          `;
                      })}
                    </div>
                  </div>`;
              });
              return html`${res}`;
            })
          }
          </div>
         </div>
         <!-- Footer -->
         <div slot="footer" class="footer">
              <div style="flex-grow: 1"></div>
              <ui5-button style="margin-top:5px" design="Emphasized"
                          ?disabled=${this._selectedChannels.size === 0}
                          @click=${(_e: any) => {
                            // if (!allSelected) {
                            //   this.data!.json[ThreadsZvm.DEFAULT_ZOME_NAME] = this.filterData();
                            // }
                            this.dispatchEvent(new CustomEvent<any>('export-confirmed', {
                                detail: this._selectedChannels,
                                bubbles: true, composed: true}));
                            const dialog = this.shadowRoot!.getElementById("export-dialog") as Dialog;
                            dialog.close(false);
                  }}>
                  ${msg('Export')}
              </ui5-button>
             <ui5-button style="margin-top:5px" @click=${() => {
                 this.dispatchEvent(new CustomEvent<boolean>('export-files', {
                     detail: true, bubbles: true, composed: true}));
             }}>${msg('Export Files')}
             </ui5-button>
              <ui5-button style="margin-top:5px" @click=${() => {
                  const dialog = this.shadowRoot!.getElementById("export-dialog") as Dialog;
                  dialog.close(false);
              }}>
                  ${msg('Cancel')}
              </ui5-button>
          </div>
        </ui5-dialog>
    `;
  }

  /** */
  static override get styles() {
    return [
      sharedStyles,
      css`
          :host {
          }

          ui5-dialog::part(content) {
              padding-bottom:0px;
          }
          
          #content {
              display: flex;
              flex-direction: column;  
              width: 500px;
              max-height: 80vh;
              padding: 0;
              margin: 0;
          }

          .channel-section {
              flex: 1;
              overflow-y: auto;
              min-height: 0;
              margin-bottom: 1.5rem;
          }
          
          .footer {
              display: flex;
              flex-shrink: 0;
              gap: 10px;
              justify-content: flex-end;
              padding: 4px;
          }


          .stat-cards {
              display: flex;
              flex-direction: row;
              gap: 1rem;
              margin-bottom: 1.5rem;
          }

          .stat-card {
              background: var(--sapTile_Background, #fff);
              border: 1px solid var(--sapTile_BorderColor, #d9d9d9);
              border-radius: 0.5rem;
              padding: 1rem 1.25rem;
              display: flex;
              flex-direction: column;
              gap: 0.25rem;
          }

          .stat-label {
              font-size: var(--sapFontSmallSize, 0.75rem);
              color: var(--sapContent_LabelColor, #6a6d70);
              text-transform: uppercase;
              letter-spacing: 0.05em;
          }

          .stat-value {
              font-size: 2rem;
              font-weight: 700;
              color: var(--sapTextColor, #32363a);
              line-height: 1;
              margin: auto;
          }


          .channel-group-title {
              font-size: var(--sapFontSmallSize, 0.75rem);
              color: var(--sapContent_LabelColor, #6a6d70);
              text-transform: uppercase;
              /*letter-spacing: 0.06em;*/
              margin: 0.75rem 0 0.35rem;
              padding-left: 0.25rem;
          }

          .channel-list {
              background: #ebebeb9e;
              border-radius: 10px;
              display: flex;
              flex-direction: column;
              gap: 0.35rem;
              margin-right: 10px;
          }

          .channel-item {
              display: flex;
              align-items: center;
              gap: 0.6rem;
              /*padding: 0.5rem 0.75rem;*/
              border-radius: 0.375rem;
              cursor: pointer;
              transition: background 0.15s ease;
              border: 1px solid transparent;
              user-select: none;
          }

          .channel-item:hover {
              background: var(--sapList_Hover_Background, #f5f5f5);
          }

          .channel-item.selected {
              background: var(--sapList_SelectionBackgroundColor, #e8f3ff);
              border-color: var(--sapSelectedColor, #0070f2);
          }

          .channel-icon {
              font-size: 1rem;
              width: 1.25rem;
              text-align: center;
              flex-shrink: 0;
          }

          .channel-name {
              flex: 1;
              font-size: var(--sapFontSize, 1.0rem);
              color: var(--sapTextColor, #32363a);
              overflow: hidden;
              text-overflow: ellipsis;
              text-wrap: nowrap;
          }

          .channel-meta {
              font-size: 0.875rem;
              padding-right: 0.75rem;
              color: var(--sapContent_LabelColor, #6a6d70);
          }

          .select-all-row {
              display: flex;
              align-items: center;
              gap: 0.75rem;
              margin-bottom: 0.75rem;
              padding: 0 0.25rem;
          }

          .channel-section {
              margin-bottom: 1.5rem;
              flex: 1;
              overflow-y: auto;
              min-height: 0;
          }
      `]}
}
