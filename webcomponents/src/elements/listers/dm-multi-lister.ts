import {css, html, TemplateResult} from "lit";
import {tooltipOnlyWhenClipped} from "../../utils";
import {customElement, property, state} from "lit/decorators.js";
import "@ui5/webcomponents/dist/Icon.js";
import "@ui5/webcomponents-icons/dist/slim-arrow-right.js";
import "@ui5/webcomponents-icons/dist/slim-arrow-down.js";
import {ActionId, AgentIdMap, DnaMultiElement, EntryId} from "@ddd-qc/lit-happ";
//import {ThreadsPerspective} from "../../viewModels/threads.perspective";
import {msg} from "@lit/localize";
import {multiJumpEvent, HideEvent} from "../../events";
import {ThreadsDvm} from "../../viewModels/threads.dvm";
import {Profile as ProfileMat} from "@ddd-qc/profiles-dvm/dist/bindings/profiles.types";
import {renderProfileAvatar} from "../../render";
import {sharedStyles} from "../../styles";


/**
 *
 */
@customElement("dm-multi-lister")
export class DmMultiLister extends DnaMultiElement<ThreadsDvm> {

  constructor() {
    super(ThreadsDvm.DEFAULT_BASE_ROLE_NAME);
  }

  /** -- Properties -- */

  @property() showArchived?: string;
  @property() selectedThreadHash?: ActionId;

  @state() private _collapsed = false;

  /** Observed perspective from zvm */
  // @property({type: Object, attribute: false, hasChanged: (_v, _old) => true})
  // threadsPerspective!: ThreadsPerspective;


  /** -- Methods -- */

  // /**
  //  * In dvmUpdated() this._dvm is not already set!
  //  * Subscribe to ThreadsZvm
  //  */
  // protected override async dvmUpdated(newDvm: ThreadsDvm, oldDvm?: ThreadsDvm): Promise<void> {
  //   if (oldDvm) {
  //     oldDvm.threadsZvm.unsubscribe(this);
  //   }
  //   newDvm.threadsZvm.subscribe(this, 'threadsPerspective');
  // }


  /** */
  override render() {
    console.log("<dm-multi-lister>.render()", this._dvms);
    const itemMap: AgentIdMap<{unread: boolean, tmpl: TemplateResult<1>}> = new AgentIdMap();
    for (const dvm of this._dvms.values()) {
      Array.from(dvm.threadsZvm.perspective.dmAgents.entries()).map(([otherAgent, ppAh]) => {
        if (itemMap.has(otherAgent)) {
          return;
        }
        /** Skip if hidden */
        const subjectEh = EntryId.from(otherAgent);
        //console.log("<dm-multi-lister>.render() hide subjectEh?", subjectEh, otherAgent);
        const isThreadHidden = dvm.threadsZvm.perspective.hiddens[subjectEh.b64]? dvm.threadsZvm.perspective.hiddens[subjectEh.b64] : false;
        if (isThreadHidden && !this.showArchived) {
          return;
        }
        /** Render DM thread */
        const maybe = dvm.threadsZvm.perspective.threads.get(ppAh);
        if (!maybe) {
          itemMap.set(otherAgent, {unread: false, tmpl: html`<ui5-busy-indicator delay="0" size="M" active style="width:100%; height:100%;"></ui5-busy-indicator>`});
          return;
        }
        console.log("<dm-multi-lister> this.selectedThreadHash", this.selectedThreadHash, ppAh.short);
        const isSelected = this.selectedThreadHash && this.selectedThreadHash.equals(ppAh);
        const maybeUnreadThread = dvm.threadsZvm.perspective.unreads.get(ppAh);
        const hasNewBeads = maybeUnreadThread && maybeUnreadThread[1].length > 0;
        const threadIsNew = dvm.threadsZvm.perspective.newThreads.has(ppAh);
        /** Determine other agent's profile */
        let otherProfile = dvm.profilesZvm.perspective.getProfile(otherAgent);
        if (!otherProfile) {
          otherProfile = {nickname: msg("unknown"), fields: {lang: "en"}} as ProfileMat;
        }

        /** Determine badge & buttons */

        /** 'new', 'notif' or 'unread' badge to display */
          // let badge = html`<ui5-tag hide-state-icon>0</ui5-tag>`;
        let badge = html`<div style="min-width: 26px"></div>`;
        let notifCount = dvm.threadsZvm.perspective.getAllNotificationsForPp(ppAh).length;
        if (threadIsNew) {
          badge = html`
            <ui5-tag hide-state-icon class="notifBadge">New</ui5-tag>`;
        } else {
          if (notifCount > 0) {
            badge = html`
              <ui5-tag hide-state-icon class="notifBadge">${notifCount}</ui5-tag>`;
          } else {
            if (hasNewBeads) {
              badge = html`
                <ui5-tag hide-state-icon class="unreadBadge">${maybeUnreadThread[1].length}</ui5-tag>`;
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

        itemMap.set(otherAgent, {unread: !!(isSelected || threadIsNew || notifCount > 0 || hasNewBeads), tmpl: html`
          <sl-tooltip content=${otherProfile.nickname} style="--show-delay:1500" disabled @mouseover=${tooltipOnlyWhenClipped}>
              <div id=${ppAh.b64} class="threadItem"
                   style="
                     font-weight:${hasNewBeads && !threadIsNew? "bold" : "normal"}; 
                     ${isSelected? "background: var(--vines-sidebar-row-selected); box-shadow: var(--vines-shadow-row);" : ""}
                     "
                   @click=${(_e: any) => this.dispatchEvent(multiJumpEvent(ppAh, otherAgent))}>
                  ${badge}
                  ${renderProfileAvatar(this, otherAgent, otherProfile, 'XS')}
                  <span class="rowTitle" style="flex-grow:1;margin-left:10px;margin-right:10px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;font-weight: ${hasNewBeads || isSelected? "bold" : ""}">${otherProfile.nickname}</span>
                  ${hideShowBtn}
              </div>
          </sl-tooltip>
      `});
      });
    }
    /** A closed section still lists the open DM and the DMs with unread, notified or new messages */
    const allTreeItems: TemplateResult<1>[] = [...itemMap.values()].filter((r) => !this._collapsed || r.unread).map((r) => r.tmpl);
    console.log("<dm-multi-lister>.render() allTreeItems", allTreeItems);

    /** Handle empty tree case */
    if (!this._collapsed && allTreeItems.length == 0) {
      allTreeItems.push(html`<div style="color: var(--vines-ink-muted); text-align: center; margin-top: 10px; cursor: default">${msg('No messages found')}</div`)
    }

    /** render all */
    return html`
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
            ${allTreeItems}
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
