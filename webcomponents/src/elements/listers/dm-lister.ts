import {css, html} from "lit";
import {customElement, property} from "lit/decorators.js";
import {ActionId, DnaElement, EntryId} from "@ddd-qc/lit-happ";
import {ThreadsPerspective} from "../../viewModels/threads.perspective";
import {msg} from "@lit/localize";
import {HideEvent, threadJumpEvent} from "../../events";
import {ThreadsDnaPerspective, ThreadsDvm} from "../../viewModels/threads.dvm";
import {Profile as ProfileMat} from "@ddd-qc/profiles-dvm/dist/bindings/profiles.types";
import {renderProfileAvatar} from "../../render";
import {sharedStyles} from "../../styles";
import {Hrl} from "@lightningrodlabs/we-applet/dist/types";
import {intoHrl} from "@ddd-qc/we-utils";


/**
 *
 */
@customElement("dm-lister")
export class DmLister extends DnaElement<ThreadsDnaPerspective, ThreadsDvm> {

  constructor() {
    super(ThreadsDvm.DEFAULT_BASE_ROLE_NAME);
  }

  /** -- Properties -- */

  @property() showArchived?: string;
  @property() selectedThreadHash?: ActionId;

  /** Observed perspective from zvm */
  @property({type: Object, attribute: false, hasChanged: (_v, _old) => true})
  threadsPerspective!: ThreadsPerspective;

  @property({type: Boolean}) nobtn: boolean = false;


  /** -- Methods -- */

  /**
   * In dvmUpdated() this._dvm is not already set!
   * Subscribe to ThreadsZvm
   */
  protected override async dvmUpdated(newDvm: ThreadsDvm, oldDvm?: ThreadsDvm): Promise<void> {
    if (oldDvm) {
      oldDvm.threadsZvm.unsubscribe(this);
    }
    newDvm.threadsZvm.subscribe(this, 'threadsPerspective');
  }


  /** */
  override render() {
    console.log("<dm-lister>.render()", this.threadsPerspective.dmAgents, this._dvm.profilesZvm.perspective.profiles);

    let treeItems = Array.from(this.threadsPerspective.dmAgents.entries()).map(([otherAgent, ppAh]) => {
      /** Skip if hidden */
      const subjectEh = EntryId.from(otherAgent);
      //console.log("<dm-lister>.render() hide subjectEh?", subjectEh, otherAgent);
      const isThreadHidden = this.threadsPerspective.hiddens[subjectEh.b64]? this.threadsPerspective.hiddens[subjectEh.b64] : false;
      if (isThreadHidden && !this.showArchived) {
        return;
      }
      /** Render DM thread */
      const maybe = this.threadsPerspective.threads.get(ppAh);
      if (!maybe) {
        return html`<ui5-busy-indicator delay="0" size="Medium" active style="width:100%; height:100%;"></ui5-busy-indicator>`;
      }
      console.log("<dm-lister> this.selectedThreadHash", this.selectedThreadHash, ppAh.short);
      const isSelected = this.selectedThreadHash && this.selectedThreadHash.equals(ppAh);
      const maybeUnreadThread = this.threadsPerspective.unreadThreads.get(ppAh);
      const hasNewBeads = maybeUnreadThread && maybeUnreadThread[1].length > 0;
      const threadIsNew = this.threadsPerspective.newThreads.has(ppAh);
      /** Determine other agent's profile */
      let otherProfile = this._dvm.profilesZvm.perspective.getProfile(otherAgent);
      if (!otherProfile) {
        otherProfile = {nickname: msg("unknown"), fields: {lang: "en"}} as ProfileMat;
      }

      /** Determine badge & buttons */

      /** 'new', 'notif' or 'unread' badge to display */
      let badge = html`<ui5-badge>0</ui5-badge>`;
      let notifCount = this._dvm.threadsZvm.perspective.getAllNotificationsForPp(ppAh).length;
      if (threadIsNew) {
        badge = html`
            <ui5-badge class="notifBadge">New</ui5-badge>`;
      } else {
        if (notifCount > 0) {
          badge = html`
              <ui5-badge class="notifBadge">${notifCount}</ui5-badge>`;
        } else {
          if (hasNewBeads) {
            badge = html`
                <ui5-badge class="unreadBadge">${maybeUnreadThread[1].length}</ui5-badge>`;
          }
        }
      }

      const hideShowBtn = this.showArchived && isThreadHidden
        ? html`
            <ui5-button icon="show" tooltip="Show" design="Transparent"
                        class="showBtn"
                        @click=${async (e:any) => {
                            e.stopPropagation();
                            this.dispatchEvent(new CustomEvent<HideEvent>('archive', {detail: {hide: false, address: otherAgent}, bubbles: true, composed: true}));
                        }}></ui5-button>
        ` : html`
                  <ui5-button icon="hide" tooltip="Hide" design="Transparent"
                              class="showBtn"
                              @click=${async (e:any) => {
                                  e.stopPropagation();
                                  this.dispatchEvent(new CustomEvent<HideEvent>('archive', {detail: {hide: true, address: otherAgent}, bubbles: true, composed: true}));
                              }}></ui5-button>`;

          return html`
              <sl-tooltip content=${otherProfile.nickname} style="--show-delay:1500">
                <div id=${ppAh.b64} class="threadItem" 
                     style="
                     font-weight:${hasNewBeads && !threadIsNew ? "bold" : "normal"}; 
                     ${isSelected? "background:#DBDBDB" : ""}
                     "
                     @click=${(_e:any) => this.dispatchEvent(threadJumpEvent(ppAh))}>
                    ${badge}
                    ${renderProfileAvatar(otherProfile, 'XS')}
                    <span style="flex-grow:1;margin-left:10px;margin-right:10px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;font-weight: ${hasNewBeads || isSelected ? "bold" : ""}">${otherProfile.nickname}</span>
                    <ui5-button icon="chain-link" tooltip=${msg("Copy Channel Link")} design="Transparent"
                                style="border:none; display:none;"
                                @click=${(e:any) => {
                                    e.stopPropagation(); e.preventDefault();
                                    const hrl: Hrl = intoHrl(this.cell.address.dnaId, ppAh);
                                    this.dispatchEvent(new CustomEvent<Hrl>('copy', {detail: hrl, bubbles: true, composed: true}));
                                }}></ui5-button>
                    ${hideShowBtn}
                </div>
              </sl-tooltip>
          `});

    treeItems = treeItems.filter((value) => value !== undefined);
    console.log("<dm-lister>.render() treeItems", treeItems);

    /** Handle empty tree case */
    if (treeItems.length == 0) {
      treeItems.push(html`<div style="color: grey; text-align: center; margin-top: 10px;">${msg('No messages found')}</div`)
    }

    /** render all */
    return html`
        <div style="display:flex; flex-direction:column; gap:10px; padding:7px; margin-bottom:10px;">
            ${this.nobtn? html`` : html`
            <ui5-button design="Emphasized"
                        @click=${(e:any) => { e.stopPropagation();
                            this.dispatchEvent(new CustomEvent<boolean>('createNewDm', {detail: true, bubbles: true, composed: true}))
                        }}>
                ${msg('Message a peer')}
            </ui5-button>`}
        </div>
        ${treeItems}
    `;
  }


  /** */
  static override get styles() {
    return [
      sharedStyles,
      css`
        :host {
          display: block;
          overflow-y: auto;
          height: 100%;
        }
        
        .chatAvatar {
           margin: 0px -5px 0px 8px;
        }

      `,

    ];
  }
}
