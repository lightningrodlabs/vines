import {css, html, TemplateResult} from "lit";
import {customElement, property} from "lit/decorators.js";
import {ActionId, DnaMultiElement, EntryId} from "@ddd-qc/lit-happ";
//import {ThreadsPerspective} from "../../viewModels/threads.perspective";
import {msg} from "@lit/localize";
import {HideEvent, threadJumpEvent} from "../../events";
import {ThreadsDvm} from "../../viewModels/threads.dvm";
import {Profile as ProfileMat} from "@ddd-qc/profiles-dvm/dist/bindings/profiles.types";
import {renderProfileAvatar} from "../../render";


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
    console.log("<dm-lister>.render()", this._dvms);
    const allTreeItems: TemplateResult<1>[] = [];
    for (const dvm of this._dvms.values()) {
      const treeItems = Array.from(dvm.threadsZvm.perspective.dmAgents.entries()).map(([otherAgent, ppAh]) => {
      /** Skip if hidden */
      const subjectEh = EntryId.from(otherAgent);
      //console.log("<dm-lister>.render() hide subjectEh?", subjectEh, otherAgent);
      const isThreadHidden = dvm.threadsZvm.perspective.hiddens[subjectEh.b64] ? dvm.threadsZvm.perspective.hiddens[subjectEh.b64] : false;
      if (isThreadHidden && !this.showArchived) {
        return;
      }
      /** Render DM thread */
      const maybe = dvm.threadsZvm.perspective.threads.get(ppAh);
      if (!maybe) {
        return html`
            <ui5-busy-indicator delay="0" size="Medium" active style="width:100%; height:100%;"></ui5-busy-indicator>`;
      }
      console.log("<dm-lister> this.selectedThreadHash", this.selectedThreadHash, ppAh.short);
      const isSelected = this.selectedThreadHash && this.selectedThreadHash.equals(ppAh);
      const maybeUnreadThread = dvm.threadsZvm.perspective.unreadThreads.get(ppAh);
      const hasNewBeads = maybeUnreadThread && maybeUnreadThread[1].length > 0;
      const threadIsNew = dvm.threadsZvm.perspective.newThreads.has(ppAh);
      /** Determine other agent's profile */
      let otherProfile = dvm.profilesZvm.perspective.getProfile(otherAgent);
      if (!otherProfile) {
        otherProfile = {nickname: msg("unknown"), fields: {lang: "en"}} as ProfileMat;
      }

      /** Determine badge & buttons */

      /** 'new', 'notif' or 'unread' badge to display */
      let badge = html`
          <ui5-badge>0</ui5-badge>`;
      let notifCount = dvm.threadsZvm.perspective.getAllNotificationsForPp(ppAh).length;
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
                              @click=${async (e: any) => {
                                  e.stopPropagation();
                                  this.dispatchEvent(new CustomEvent<HideEvent>('archive', {detail: {hide: false, address: otherAgent}, bubbles: true, composed: true}));
                              }}></ui5-button>
        ` : html`
                  <ui5-button icon="hide" tooltip="Hide" design="Transparent"
                              class="showBtn"
                              @click=${async (e: any) => {
                                  e.stopPropagation();
                                  this.dispatchEvent(new CustomEvent<HideEvent>('archive', {detail: {hide: true, address: otherAgent}, bubbles: true, composed: true}));
                              }}></ui5-button>`;

      return html`
          <sl-tooltip content=${otherProfile.nickname} style="--show-delay:1500">
              <div id=${ppAh.b64} class="threadItem"
                   style="
                     font-weight:${hasNewBeads && !threadIsNew ? "bold" : "normal"}; 
                     ${isSelected ? "background:#DBDBDB" : ""}
                     "
                   @click=${(_e: any) => this.dispatchEvent(threadJumpEvent(ppAh))}>
                  ${badge}
                  ${renderProfileAvatar(otherProfile, 'XS')}
                  <span style="flex-grow:1;margin-left:10px;margin-right:10px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;font-weight: ${hasNewBeads || isSelected ? "bold" : ""}">${otherProfile.nickname}</span>
                  <ui5-button icon="copy" tooltip=${msg("Copy Channel Link")} design="Transparent"
                              style="border:none; display:none;"
                              @click=${(e: any) => {
                                  e.stopPropagation();
                                  this.dispatchEvent(new CustomEvent<ActionId>('copy-thread', {detail: ppAh, bubbles: true, composed: true}))
                              }}></ui5-button>
                  ${hideShowBtn}
              </div>
          </sl-tooltip>
      `
      });
      const nonNullItems: TemplateResult<1>[] = treeItems.filter((value) => value !== undefined) as TemplateResult<1>[];
      allTreeItems.push(...nonNullItems);
    }

    console.log("<dm-lister>.render() allTreeItems", allTreeItems);

    /** Handle empty tree case */
    if (allTreeItems.length == 0) {
      allTreeItems.push(html`<div style="color: grey; text-align: center; margin-top: 10px;">${msg('No DM found')}</div`)
    }

    /** render all */
    return html`
        <div style="display:flex; flex-direction:column; gap:10px; padding:7px; margin-bottom:10px;">
            <ui5-button design="Emphasized"
                        @click=${(e:any) => { e.stopPropagation();
                            this.dispatchEvent(new CustomEvent<boolean>('createNewDm', {detail: true, bubbles: true, composed: true}))
                        }}>
                ${msg('Message a peer')}
            </ui5-button>
        </div>
        ${allTreeItems}
    `;
  }


  /** */
  static override get styles() {
    return [
      css`
        :host {
          background: #FBFCFD;
          display: block;
          overflow-y: auto;
          height: 100%;
        }


        .threadItem {
          display: flex;
          overflow: hidden;
          align-items: center;
          height: 36px;
          padding-left: 10px;
          margin-right: 7px;
          cursor: pointer;
          color: #484848;
          background: #FBFCFD;
          border-radius: 5px;
        }

        .threadItem:hover {
          background: rgb(222, 232, 255);
        }

        .threadItem:hover > ui5-button {
          display: block !important;
        }

        .showBtn {
          border: none;
          padding: 0px;
          display: none;
        }

        .chatAvatar {
           margin: 0px -5px 0px 8px;
        }
        
        ui5-badge {
          min-width: 1.7rem;
          margin-top: 3px;
          background: rgb(183, 183, 183);
          color: rgb(232, 232, 232);
        }

        .unreadBadge {
          background: #342D1F;
          color: white;
        }

        .notifBadge {
          color: #ffffff;
          background: #359C07;
        }
      `,

    ];
  }
}
