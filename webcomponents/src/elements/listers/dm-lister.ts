import {css, html, TemplateResult} from "lit";
import {tooltipOnlyWhenClipped, reorderAnimated} from "../../utils";
import {customElement, property, state} from "lit/decorators.js";
import "@ui5/webcomponents/dist/Icon.js";
import "@ui5/webcomponents-icons/dist/slim-arrow-right.js";
import "@ui5/webcomponents-icons/dist/slim-arrow-down.js";
import {ActionId, AgentId, DnaElement, EntryId} from "@ddd-qc/lit-happ";
import {ThreadsPerspective} from "../../viewModels/threads.perspective";
import {msg} from "@lit/localize";
import {HideEvent, threadJumpEvent} from "../../events";
import {ThreadsDnaPerspective, ThreadsDvm} from "../../viewModels/threads.dvm";
import {Profile as ProfileMat} from "@ddd-qc/profiles-dvm/dist/bindings/profiles.types";
import {renderProfileAvatar} from "../../render";
import {sharedStyles} from "../../styles";


/**
 *
 */
@customElement("dm-lister")
export class DmLister extends DnaElement<ThreadsDnaPerspective, ThreadsDvm> {

  constructor() {
    super(ThreadsDvm.DEFAULT_BASE_ROLE_NAME);
  }

  private _dragged: any;

  /** -- Properties -- */

  @property() showArchived?: string;
  @property() selectedThreadHash?: ActionId;
  @property() order: string = "custom";

  /** Observed perspective from zvm */
  @property({type: Object, attribute: false, hasChanged: (_v, _old) => true})
  threadsPerspective!: ThreadsPerspective;

  @property({type: Boolean}) nobtn: boolean = false;

  @state() private _collapsed = false;


  /** -- Methods -- */

  /**
   * Subscribe to ThreadsZvm.
   * Note: Here, this._dvm is not set yet!
   */
  protected override async dvmUpdated(newDvm: ThreadsDvm, oldDvm?: ThreadsDvm): Promise<void> {
    if (oldDvm) {
      oldDvm.threadsZvm.unsubscribe(this);
    }
    newDvm.threadsZvm.subscribe(this, 'threadsPerspective');
  }


  /** Grab the order for local storage. Set order and append any unknown remaining elements */
  getOrderFromLocalStorage(allPairs: [AgentId, ActionId][]): [AgentId, ActionId][] {
    const json = localStorage.getItem("vinesDmOrder");
    if (!json) return allPairs;
    let ids: string[];
    try {
      ids = JSON.parse(json) as string[];
    } catch {
      return allPairs;
    }
    //console.debug("getOrderFromLocalStorage()", ids);
    let pairs: [AgentId, ActionId][] = [];
    for (const idb64 of ids) {
      const id = new AgentId(idb64);
      // Need dm thread's ppAh
      const found: [AgentId, ActionId] = allPairs.find((pair) => pair[0].equals(id))!;
      pairs.push(found);
      allPairs = allPairs.filter((key) => !key[0].equals(id));
    }
    //console.debug("DM ORDER FROM LOCAL STORAGE", pairs);
    return pairs.concat(allPairs);
  }


  /** */
  override render(): TemplateResult<1> {
    console.debug("<dm-lister>.render()", this.threadsPerspective.dmAgents, this._dvm.profilesZvm.perspective.profiles);
    let pairs: [AgentId, ActionId][] = Array.from(this.threadsPerspective.dmAgents.entries());

    switch (this.order) {
      case "alpha":
        pairs = pairs.sort((a, b) => {
          const nameA = this._dvm.profilesZvm.perspective.getProfile(a[0])!.nickname;
          const nameB = this._dvm.profilesZvm.perspective.getProfile(b[0])!.nickname;
          return nameA.localeCompare(nameB);
        });
        break;
      case "chrono":
        pairs = pairs.sort((a, b) => {
          const nameA = this._dvm.profilesZvm.perspective.getProfileTs(a[0])!;
          const nameB = this._dvm.profilesZvm.perspective.getProfileTs(b[0])!;
          return nameB - nameA;
        });
        break;
      case "custom":
        pairs = this.getOrderFromLocalStorage(pairs);
        break;
    }

    const rows = pairs.map(([otherAgent, ppAh]) => {
      /** Skip if hidden */
      const subjectEh = EntryId.from(otherAgent);
      //console.log("<dm-lister>.render() hide subjectEh?", subjectEh, otherAgent);
      const isThreadHidden = this.threadsPerspective.hiddens[subjectEh.b64]? this.threadsPerspective.hiddens[subjectEh.b64] : false;
      if (isThreadHidden && !this.showArchived) {
        return undefined;
      }
      /** Render DM thread */
      const maybe = this.threadsPerspective.threads.get(ppAh);
      if (!maybe) {
        return {unread: false, tmpl: html`<ui5-busy-indicator delay="0" size="M" active style="width:100%; height:100%;"></ui5-busy-indicator>`};
      }
      //console.debug("<dm-lister> this.selectedThreadHash", this.selectedThreadHash, ppAh.short);
      const isSelected = this.selectedThreadHash && this.selectedThreadHash.equals(ppAh);
      const maybeUnreadThread = this.threadsPerspective.unreads.get(ppAh);
      const hasNewBeads = maybeUnreadThread && maybeUnreadThread[1].length > 0;
      const threadIsNew = this.threadsPerspective.newThreads.has(ppAh);
      /** Determine the other agent's profile */
      let otherProfile = this._dvm.profilesZvm.perspective.getProfile(otherAgent);
      if (!otherProfile) {
        otherProfile = {nickname: msg("unknown"), fields: {lang: "en"}} as ProfileMat;
      }

      /** 'new', 'notif' or 'unread' badge to display */
      // let badge = html`<ui5-tag hide-state-icon>0</ui5-tag>`;
      let badge = html`<div style="min-width: 26px"></div>`;
      let notifCount = this._dvm.threadsZvm.perspective.getAllNotificationsForPp(ppAh).length;
      if (threadIsNew) {
        badge = html`<ui5-tag hide-state-icon class="notifBadge">New</ui5-tag>`;
      } else {
        if (notifCount > 0) {
          badge = html`<ui5-tag hide-state-icon class="notifBadge">${notifCount}</ui5-tag>`;
        } else {
          if (hasNewBeads) {
            badge = html`<ui5-tag hide-state-icon class="unreadBadge">${maybeUnreadThread[1].length}</ui5-tag>`;
          }
        }
      }

      const hideShowBtn = this.showArchived && isThreadHidden
        ? html`
            <ui5-button icon="show" tooltip=${msg("Show")} design="Transparent"
                        class="showBtn"
                        @click=${async (e: any) => {
                            e.stopPropagation();
                            this.dispatchEvent(new CustomEvent<HideEvent>('archive', {
                                detail: {
                                    hide: false,
                                    address: otherAgent,
                                    type: "DM"
                                }, bubbles: true, composed: true
                            }));
                        }}></ui5-button>
        ` : html`
            <ui5-button icon="hide" tooltip=${msg("Hide")} design="Transparent"
                        class="showBtn"
                        @click=${async (e: any) => {
                            e.stopPropagation();
                            this.dispatchEvent(new CustomEvent<HideEvent>('archive', {
                                detail: {
                                    hide: true,
                                    address: otherAgent,
                                    type: "DM"
                                }, bubbles: true, composed: true
                            }));
                        }}></ui5-button>`;

      return {unread: !!(isSelected || threadIsNew || notifCount > 0 || hasNewBeads), tmpl: html`
          <sl-tooltip content=${otherProfile.nickname} style="--show-delay:1500" disabled @mouseover=${tooltipOnlyWhenClipped}>
              <div id=${ppAh.b64} .agent=${otherAgent.b64} 
                   class="threadItem"
                   style="
                     font-weight: ${hasNewBeads && !threadIsNew? "bold" : "normal"}; 
                     ${isSelected? "background: var(--vines-sidebar-row-selected); box-shadow: var(--vines-shadow-row);" : ""}
                     "
                   .draggable=${this.order == "custom"? "true" : ""}
                   @dragstart=${(e: any) => {
                       e.stopPropagation();
                       this._dragged = e.target.closest('sl-tooltip');
                       //console.log("dm._dragged", this._dragged);
                       setTimeout(() =>  this._dragged?.classList.add('dragging'), 0)
                       e.dataTransfer!.effectAllowed = 'move';
                       e.dataTransfer!.setData('dm', otherAgent.b64);
                   }}
                   @dragend=${(e: DragEvent) => {
                       e.stopPropagation();
                       (e.currentTarget as HTMLElement).classList.remove('dragging');
                       this._dragged = null;
                       // Clean up any leftover drag-over highlights
                       this.shadowRoot?.querySelectorAll('.drag-over')
                         .forEach(el => el.classList.remove('drag-over'));
                   }}
                   @dragleave=${(e: DragEvent) => (e.currentTarget as HTMLElement).classList.remove('drag-over')}
                   @dragover=${(e: any) => {
                       e.preventDefault(); e.stopPropagation();
                       //console.log("dragover", e.dataTransfer!.types)
                       
                       if (e.dataTransfer!.types.includes('dm')) {
                           e.dataTransfer!.dropEffect = 'move';
                           (e.currentTarget as HTMLElement).classList.add('drag-over');

                           const target = e.target.closest('sl-tooltip');
                           if (!target || target === this._dragged) return;
                           
                           const container = this as HTMLElement;
                            
                           const {top, height} = target.getBoundingClientRect();
                           const isAfterTarget = e.clientY > top + height / 2;

                           const first = container.shadowRoot!.querySelector<HTMLElement>('sl-tooltip');
                           
                           //console.log("dm dragover", target, first, container, this._dragged);
                           
                           const dim = first!.children[0]!.getBoundingClientRect();
                           const isBeforeFirst = e.clientY < dim.top + dim.height / 2;

                           /** The rows live inside the section panel */
                           const list = first!.parentElement!;
                           reorderAnimated(this.shadowRoot!, 'sl-tooltip > .threadItem', () => {
                               if (isBeforeFirst) {
                                   list.insertBefore(this._dragged, first);
                               } else {
                                   list.insertBefore(this._dragged, isAfterTarget ? target.nextSibling : target);
                               }
                           });
                       }
                   }}
                   @drop=${(e: any) => {
                       e.preventDefault(); e.stopPropagation();
                       const dmAgent = e.dataTransfer!.getData('dm');
                       if (dmAgent) {
                           const container = this as HTMLElement;
                           const order = Array.from(container.shadowRoot!.querySelectorAll('sl-tooltip'))
                                   .map(el => (el.children[0]! as any).agent)
                                   .filter(id => id !== '');
                           console.log("DM ORDER", order);
                           const deduped = [...new Set(order)];
                           localStorage.setItem("vinesDmOrder", JSON.stringify(deduped));
                       }
                   }}                   
                   @click=${(_e: any) => this.dispatchEvent(threadJumpEvent(ppAh))}>
                  ${badge}
                  ${renderProfileAvatar(this, otherAgent, otherProfile, 'XS')}
                  <span class="rowTitle" style="flex-grow:1;margin-left:10px;margin-right:10px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;font-weight: ${hasNewBeads || isSelected? "bold" : ""}">${otherProfile.nickname}</span>
                  ${hideShowBtn}
              </div>
          </sl-tooltip>
      `};
    });
    /** A closed section still lists the open DM and the DMs with unread, notified or new messages */
    let treeItems = rows.filter((r) => !!r && (!this._collapsed || r.unread)).map((r) => r!.tmpl);
    //console.log("<dm-lister>.render() treeItems", treeItems);
    /** Handle empty tree case */
    if (!this._collapsed && treeItems.length == 0) {
      treeItems.push(html`<div style="color: var(--vines-ink-muted); text-align: center; margin-top: 10px; cursor: default">${msg('No messages found')}</div`)
    }
    /** render all */
    return html`
        ${this.nobtn? html`` : html`
            <div style="display:flex; flex-direction:column; gap:10px; padding:7px; margin-bottom:10px;">
                <ui5-button design="Emphasized"
                            @click=${(e: any) => {
                                e.stopPropagation();
                                this.dispatchEvent(new CustomEvent<boolean>('createNewDm', {
                                    detail: true,
                                    bubbles: true,
                                    composed: true
                                }))
                            }}>
                    ${msg('Message a peer')}
                </ui5-button>
            </div>
        `}
        <ui5-panel class="lister-panel ${this._collapsed? "collapsed" : ""}" fixed>
            <div slot="header" class="lister-panel-header"
                 @click=${(e: any) => {
                     if (e.target.closest && e.target.closest('ui5-button')) return;
                     this._collapsed = !this._collapsed;
                 }}>
                <ui5-icon class="lister-chevron" name=${this._collapsed? "slim-arrow-right" : "slim-arrow-down"}></ui5-icon>
                <div class="lister-panel-title">${msg("Direct Messages")}</div>
                <ui5-button icon="add" tooltip=${msg("New Direct Message")} design="Transparent"
                            style="color: var(--vines-ink-muted)"
                            @click=${(e: any) => {
                                e.stopPropagation();
                                e.preventDefault();
                                this.dispatchEvent(new CustomEvent<boolean>('createNewDm', {detail: true, bubbles: true, composed: true}));
                            }}>
                </ui5-button>
            </div>
            ${treeItems}
        </ui5-panel>
    `;
  }


  /** */
  static override get styles() {
    return [
      sharedStyles,
      css`
        :host {
          display: block;
          /*overflow-y: auto;*/
          height: 100%;
        }

        .chatAvatar {
          margin: 0px -5px 0px 8px;
        }

      `,

    ];
  }
}
