import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import {ChannelInfo, ImportData} from "./import-utils";
import {sharedStyles} from "../../styles";
import {msg} from "@lit/localize";
import {ThreadsSnapshot} from "../../viewModels/threads.perspective";
import {ThreadsZvm} from "../../viewModels/threads.zvm";
import Input from "@ui5/webcomponents/dist/Input";

export type ImportConfirmed = {
  selection: Set<string>,
  data: ImportData,
  canPublish: boolean,
}


/** */
@customElement("import-summary")
export class ImportSummary extends LitElement {

  @property({ type: Object })  data: ImportData | null = null;

  @state() private _selectedChannels: Set<string> = new Set();


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
    const allKeys = this.data.vines!.channels.map((ch) => ch.info.id);
    if (this._selectedChannels.size === allKeys.length) {
      this._selectedChannels = new Set();
    } else {
      this._selectedChannels = new Set(allKeys);
    }
  }


  /** */
  override render() {
    if (!this.data || (!this.data.discord && !this.data.vines)) {
      return html`<div class="empty-state">${msg("No data to display.")}</div>`;
    }

    let reactionsCount: number = 0;
    let channelCount: number = 0;
    let authorsCount: number = 0;
    let msgCount: number = 0
    /** category -> channel[] */
    let channelsByCategory = new Map<string, ChannelInfo[]>();
    /** channelId -> msgId[] */
    let msgByChannel = new Map<string, string[]>();
    if (this.data.discord) {
      authorsCount = this.data.discord!.authors.length;
      channelCount = this.data.discord!.channels.length;
      msgCount = this.data.discord!.messages.length;
      reactionsCount = this.data.discord!.reactions.length;
      /** channelsByCategory */
      for (const ch of this.data.discord!.channels) {
        const key = ch.category ?? "__dm__";
        if (!channelsByCategory.has(key)) channelsByCategory.set(key, []);
        channelsByCategory.get(key)!.push(ch);
      }
      /** msgByChannel */
      for (const msg of this.data.discord!.messages) {
        if (!msgByChannel.has(msg.channelId)) msgByChannel.set(msg.channelId, []);
        msgByChannel.get(msg.channelId)!.push(msg.id);
      }
    } else {
      authorsCount = this.data.vines!.authors.length;
      channelCount = this.data.vines!.channels.length;
      /** channelsByCategory & msgByChannel */
      for (const ch of this.data.vines!.channels) {
        const catKey = ch.info.category ?? "__dm__";
        if (!channelsByCategory.has(catKey)) channelsByCategory.set(catKey, []);
        channelsByCategory.get(catKey)!.push(ch.info);
        msgByChannel.set(ch.info.id, []);
        msgCount += ch.messages.length;
        for (const msg of ch.messages) {
          msgByChannel.get(ch.info.id)!.push(msg.ah.b64);
          reactionsCount += msg.reactions;
        }
      }
    }

    const allSelected = !!this.data.discord || this._selectedChannels.size === channelCount;

    /** render all */
    return html`
      <div class="summary">
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

        <!-- Channel selection -->
        ${!!this.data.discord
            ? this.data.discord.channels[0]!.category
              ? html`<h3>${msg('Discord channel')}</h3>
               <div style="display:grid; grid-template-columns: 1fr 1fr; column-gap: 1rem;">
                 <div>
                 <div style="color:grey; font-size:small">${msg('Category')}</div>
                    <ui5-input id="discord-topic" outlined required show-clear-icon
                               .value=${this.data.discord.channels[0]!.category}
                               .placeholder=${this.data.discord.channels[0]!.category}
                               @input=${(e: any) => {
                                   if (e.target.value.length > 0) {
                                       this.data!.discord!.channels[0]!.category = e.target.value;
                                   } else {
                                       this.data!.discord!.channels[0]!.category = (this.shadowRoot!.getElementById("discord-topic") as Input).placeholder;
                                   }
                               }}>
                    </ui5-input>
            </div>
            <div>
                <div style="color:grey; font-size:small">${msg('Channel')}</div>
                <ui5-input id="discord-channel" outlined required show-clear-icon
                           .value=${this.data.discord.channels[0]!.name}
                           .placeholder=${this.data.discord.channels[0]!.name}
                           @input=${(e: any) => {
                               if (e.target.value.length > 0) {
                                   this.data!.discord!.channels[0]!.name = e.target.value;
                               } else {
                                   this.data!.discord!.channels[0]!.name = (this.shadowRoot!.getElementById("discord-channel") as Input).placeholder;
                               }
                           }}>
                </ui5-input>
            </div>
               </div>
            ` : html`<span>${msg('DM channel with')} <b>${this.data!.discord!.channels[0]!.name}</b></span>
        ` : html`
        <div class="select-all-row">
            <ui5-button @click=${this.toggleAll}>${allSelected? msg('Deselect All'): msg('Select All')}</ui5-button>
        </div>            
        <div class="channel-section">
            ${[...channelsByCategory.entries()].map(([category, catChannels]) => {
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
                        <span class="channel-meta">${msgByChannel.get(ch.id)?.length}</span>
                      </div>
                    `;
                })}
                </div>
              </div>
            `;
            })}
        </div>
        `}
      </div>
      <div class="footer">
        <div style="flex-grow: 1"></div>
        <ui5-button style="margin-top:5px" design="Emphasized"
                    ?disabled=${this._selectedChannels.size === 0 && !this.data!.discord}
                    @click=${(_e: any) => this.onImport(allSelected, true)}>
            ${msg('Import')}
        </ui5-button>
          <ui5-button style="margin-top:5px"
                      ?disabled=${(this._selectedChannels.size === 0 && !this.data!.discord) || this.data!.discord}
                      @click=${(_e: any) => this.onImport(allSelected, false)}>
              ${msg('Dry-run')}
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
  onImport(allSelected: boolean, canPublish: boolean) {
    if (!allSelected) {
      this.data!.json[ThreadsZvm.DEFAULT_ZOME_NAME] = this.filterData();
    }
    this.dispatchEvent(new CustomEvent<ImportConfirmed>('import-confirmed', {
      detail: {
        selection: this._selectedChannels,
        data: this.data!,
        canPublish
      }, bubbles: true, composed: true}));
  }


  /** */
  filterData(): ThreadsSnapshot {
    const threadsSnapshot: ThreadsSnapshot = this.data!.json[ThreadsZvm.DEFAULT_ZOME_NAME];
    console.debug("filterData() START", threadsSnapshot.pps.length, threadsSnapshot.beads.length, threadsSnapshot.emojiReactions.length);
    /** Filter Threads */
    const pps: ThreadsSnapshot["pps"] = [];
    const selectedTopics: Set<string> = new Set();
    for (const tuple of threadsSnapshot.pps) {
      if (this._selectedChannels.has(tuple[0])) {
        pps.push(tuple);
        selectedTopics.add(tuple[1].subject.address);
      }
    }
    threadsSnapshot.pps = pps;
    /** Filter Topics */
    const topics: ThreadsSnapshot["semanticTopics"] = [];
    for (const tuple of threadsSnapshot.semanticTopics) {
      if (selectedTopics.has(tuple[0])) {
        topics.push(tuple);
      }
    }
    threadsSnapshot.semanticTopics = topics;
    /** Filter Messages */
    const keptMsgs: Set<string> = new Set();
    for (const channel of this.data!.vines!.channels) {
      for (const msg of channel.messages) {
        keptMsgs.add(msg.ah.b64);
      }
    }
    const beads: ThreadsSnapshot["beads"] = [];
    for (const tuple of threadsSnapshot.beads) {
      if (keptMsgs.has(tuple[0])) {
        beads.push(tuple);
      }
    }
    threadsSnapshot.beads = beads;
    /** Filter Reactions */
    const emojiReactions: ThreadsSnapshot["emojiReactions"] = [];
    for (const tuple of threadsSnapshot.emojiReactions) {
      if (keptMsgs.has(tuple[0])) {
        emojiReactions.push(tuple);
      }
    }
    threadsSnapshot.emojiReactions = emojiReactions;
    /** */
    console.debug("filterData() END", threadsSnapshot.pps.length, threadsSnapshot.beads.length, threadsSnapshot.emojiReactions.length);
    return threadsSnapshot;
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
              max-height: 80vh;
          }
          
          .summary {
              flex: 1;
              overflow: hidden;
              padding: 1rem;
              display: flex; 
              flex-direction: column;
          }


          .channel-section {
              margin-bottom: 1.5rem;
              flex: 1;               
              overflow-y: auto;
              min-height: 0;
          }

          .footer {
              display: flex;
              flex-shrink: 0;
              gap: 10px;
              justify-content: flex-end;
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


      `]}
}
