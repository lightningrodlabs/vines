import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import {ImportData} from "./import-utils";
import {sharedStyles} from "../../styles";
import {msg} from "@lit/localize";

export type ImportConfirmed = {
  selection: Set<string>,
  data: ImportData,
}


/** */
@customElement("import-summary")
export class ImportSummary extends LitElement {

  @property({ type: Object })  data: ImportData | null = null;

  @state() private _selectedChannels: Set<string> = new Set();

  /** */
  private get channelPerCategory(): Map<string, ImportData["channels"]> {
    if (!this.data) return new Map();
    const groups = new Map<string, ImportData["channels"]>();
    for (const ch of this.data.channels) {
      const key = ch.category ?? "__dm__";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(ch);
    }
    return groups;
  }

  /** */
  private get messagesPerChannel(): Map<string, ImportData["messages"]> {
    if (!this.data) return new Map();
    const groups = new Map<string, ImportData["messages"]>();
    for (const msg of this.data.messages) {
      if (!groups.has(msg.channelId)) groups.set(msg.channelId, []);
      groups.get(msg.channelId)!.push(msg);
    }
    return groups;
  }

  /** */
  private toggleChannel(key: string) {
    const selection = new Set(this._selectedChannels);
    if (selection.has(key)) {
      selection.delete(key);
    } else {
      selection.add(key);
    }
    this._selectedChannels = selection;
  }

  /** */
  private toggleAll() {
    if (!this.data) return;
    const allKeys = this.data.channels.map((ch) => ch.id);
    if (this._selectedChannels.size === allKeys.length) {
      this._selectedChannels = new Set();
    } else {
      this._selectedChannels = new Set(allKeys);
    }
  }


  /** */
  override render() {
    if (!this.data) {
      return html`<div class="empty-state">${msg("No data to display.")}</div>`;
    }

    const { authors, channels, messages, reactions } = this.data;
    const allSelected = this._selectedChannels.size === channels.length;
    //const indeterminate = this._selectedChannels.size > 0 && !allSelected;
    //const allKeys = this.data.channels.map((ch) => ch.id);
    const channelMap = this.channelPerCategory;
    const msgMap = this.messagesPerChannel;

    /** render all */
    return html`
    <div class="summary">
        <div class="stat-cards">
            ${([
                  { label: msg("Channels"), value: channels.length },
                  { label: msg("Messages"), value: messages.length },
                  { label: msg("Authors"), value: authors.length },
                  { label: msg("Reactions"), value: reactions.length },
              ] as const
            ).map(({ label, value }) => html`
              <div class="stat-card">
                <span class="stat-label">${label}</span>
                <span class="stat-value">${value.toLocaleString()}</span>
              </div>
            `)}
        </div>

        <!-- Channel selection -->
        <div class="channel-section">
            <div class="select-all-row">
              <ui5-button @click=${this.toggleAll}>${allSelected? msg('Deselect All'): msg('Select All')}</ui5-button>
            </div>

            ${[...channelMap.entries()].map(([category, catChannels]) => {
                const isDM = category === "__dm__";
                return html`
              <div>
                <p class="channel-group-title">
                  ${isDM ? msg("Direct Messages") : category}
                </p>
                <div class="channel-list">
                  ${catChannels.map((ch) => {
                    const key = ch.id;
                    const selected = this._selectedChannels.has(key);
                    return html`
                      <div
                        class="channel-item ${selected ? "selected" : ""}"
                        @click=${() => this.toggleChannel(key)}
                        role="checkbox"
                        aria-checked=${selected}
                        tabindex="0"
                        @keydown=${(e: KeyboardEvent) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                this.toggleChannel(key);
                            }
                        }}>
                        <ui5-checkbox ?checked=${selected}></ui5-checkbox>
                        <span class="channel-name">${ch.name}</span>
                        <span class="channel-meta">${msgMap.get(ch.id)?.length}</span>
                      </div>
                    `;
                })}
                </div>
              </div>
            `;
            })}
        </div>        
        
        
    </div>
    <div class="footer">
        <div style="flex-grow: 1"></div>
        <ui5-button style="margin-top:5px" design="Emphasized"
                    ?disabled=${this._selectedChannels.size === 0}
                    @click=${(_e: any) => {
                        this.dispatchEvent(new CustomEvent<ImportConfirmed>('import-confirmed', {
                          detail: {
                            selection: this._selectedChannels,
                            data: this.data!,
                          }, bubbles: true, composed: true}));
                    }}>
            ${msg('Import')}
        </ui5-button>
        <ui5-button style="margin-top:5px" @click=${() => {
            this.dispatchEvent(new CustomEvent<boolean>('import-canceled', {detail: true, bubbles: true, composed: true}));
        }}>
            ${msg('Cancel')}
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
          }

          .footer {
              display: flex;
              gap: 10px;
              justify-content: center;
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


          .channel-section {
              margin-bottom: 1.5rem;
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
              display: flex;
              flex-direction: column;
              gap: 0.35rem;
          }

          .channel-item {
              display: flex;
              align-items: center;
              gap: 0.6rem;
              padding: 0.5rem 0.75rem;
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
          }

          .channel-meta {
              font-size: 0.875rem;
              color: var(--sapContent_LabelColor, #6a6d70);
          }

          .select-all-row {
              display: flex;
              align-items: center;
              gap: 0.75rem;
              margin-bottom: 0.75rem;
              padding: 0 0.25rem;
          }


      `]}
}
