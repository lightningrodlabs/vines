import {css, html, PropertyValues} from "lit";
import {consume} from "@lit/context";
import {customElement, property, state} from "lit/decorators.js";
import {ActionHashB64, EntryHashB64} from "@holochain/client";
import {DnaElement, ZomeElement} from "@ddd-qc/lit-happ";
import {ThreadsZvm} from "../../viewModels/threads.zvm";
import {ThreadsPerspective} from "../../viewModels/threads.perspective";
import {CommentRequest, EditTopicRequest} from "../../utils";
import {msg} from "@lit/localize";
import {toasty} from "../../toast";
import {threadJumpEvent} from "../../jump";
import {ThreadsDnaPerspective, ThreadsDvm} from "../../viewModels/threads.dvm";
import {Profile as ProfileMat} from "@ddd-qc/profiles-dvm/dist/bindings/profiles.types";
import {renderAvatar, renderProfileAvatar} from "../../render";

import Dialog from "@ui5/webcomponents/dist/Dialog";

/**
 *
 */
@customElement("dm-lister")
export class DmLister extends DnaElement<ThreadsDnaPerspective, ThreadsDvm> {

  /** */
  constructor() {
    super(ThreadsDvm.DEFAULT_BASE_ROLE_NAME);
  }


  @property() showArchived?: string;
  @property() selectedThreadHash?: string;


  /** Observed perspective from zvm */
  @property({type: Object, attribute: false, hasChanged: (_v, _old) => true})
  threadsPerspective!: ThreadsPerspective;

  /** */
  onClickCommentPp(maybeCommentThread: ActionHashB64 | null, ppAh: ActionHashB64, subjectName: string) {
    this.dispatchEvent(new CustomEvent<CommentRequest>('commenting-clicked', { detail: {maybeCommentThread, subjectHash: ppAh, subjectType: "ParticipationProtocol", subjectName, viewType: "side"}, bubbles: true, composed: true }));
  }


  /** -- Methods -- */

  /**
   * In dvmUpdated() this._dvm is not already set!
   * Subscribe to ThreadsZvm
   */
  protected async dvmUpdated(newDvm: ThreadsDvm, oldDvm?: ThreadsDvm): Promise<void> {
    console.log("<dm-lister>.dvmUpdated()");
    if (oldDvm) {
      console.log("\t Unsubscribed to threadsZvm's roleName = ", oldDvm.threadsZvm.cell.name)
      oldDvm.threadsZvm.unsubscribe(this);
    }
    newDvm.threadsZvm.subscribe(this, 'threadsPerspective');
    console.log("\t Subscribed threadsZvm's roleName = ", newDvm.threadsZvm.cell.name)
  }


  /** */
  render() {
    console.log("<dm-lister>.render()", this.threadsPerspective.dmThreads);

    let treeItems = Object.entries(this.threadsPerspective.dmAgents).map(([otherAgent, [ppAh, isHidden]]) => {
      /** Skip if hidden */
      if (isHidden && !this.showArchived) {
        return;
      }
      /** Render DM thread */
      const maybe = this.threadsPerspective.dmThreads.get(ppAh);
      if (!maybe || otherAgent != maybe[0]) {
        return html`<ui5-busy-indicator delay="0" size="Medium" active style="width:100%; height:100%;"></ui5-busy-indicator>`;
      }
      const thread = maybe[1];

      console.log("this.selectedThreadHash", this.selectedThreadHash, ppAh, this.selectedThreadHash == ppAh);
      const isSelected = this.selectedThreadHash && this.selectedThreadHash == ppAh;

      //const hasNewBeads = thread && thread.hasUnreads();
      const maybeUnreadThread = this.threadsPerspective.unreadThreads[ppAh];
      const hasNewBeads = maybeUnreadThread && maybeUnreadThread[1].length > 0;
      //console.log("hasUnreads() thread", ppAh, thread.latestSearchLogTime);
      const threadIsNew = Object.keys(this.threadsPerspective.newThreads).includes(ppAh);
      //console.log("<dm-lister>.render() thread:", thread.pp.purpose, maybeUnreadThread);
      if (!thread.pp || (thread.isHidden && !this.showArchived) || thread.pp.purpose == "comment") {
        return;
      }

      /** Determine other agent's profile */
      let otherProfile = this._dvm.profilesZvm.perspective.profiles[otherAgent];
      if (!otherProfile) {
        otherProfile = {nickname: msg("unknown"), fields: {lang: "en"}} as ProfileMat;
      }

      /** Determine badge & buttons */

      /** 'new', 'notif' or 'unread' badge to display */
      let badge = html`<ui5-badge>0</ui5-badge>`;
      let notifCount = this._dvm.threadsZvm.getPpNotifs(ppAh).length;
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

      const hideShowBtn = this.showArchived && thread.isHidden
        ? html`
            <ui5-button icon="show" tooltip="Show" design="Transparent"
                        class="showBtn"
                        @click=${async (e) => {
                            e.stopPropagation();
                            await this._dvm.threadsZvm.unhideDm(ppAh);
                            toasty(`Unarchived DM with ${otherProfile.nickname}`);
                        }}></ui5-button>
        ` : html`
                  <ui5-button icon="hide" tooltip="Hide" design="Transparent"
                              class="showBtn"
                              @click=${async (e) => {
                                  e.stopPropagation();
                                  await this._dvm.threadsZvm.hideDm(ppAh);
                                  toasty(`Archived DM ${otherProfile.nickname}`);
                              }}></ui5-button>`;

          return html`
              <sl-tooltip content=${thread.pp.purpose} style="--show-delay:1000">
                <div id=${ppAh} class="threadItem" 
                     style="
                     font-weight:${hasNewBeads && !threadIsNew ? "bold" : "normal"}; 
                     ${threadIsNew || notifCount? "color: #359C07;" : ""}
                     ${isSelected? "background:#DBDBDB" : ""}
                     "
                     @click=${(e) => this.dispatchEvent(threadJumpEvent(ppAh))}>
                    ${badge}
                    ${renderProfileAvatar(otherProfile, 'XS')}
                    <span style="flex-grow:1;margin-left:10px;margin-right:10px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;font-weight: ${hasNewBeads || isSelected ? "bold" : ""}">${otherProfile.nickname}</span>
                    <ui5-button icon="copy" tooltip=${msg("Copy Channel Link")} design="Transparent"
                                style="border:none; display:none;"
                                @click=${(e) => {e.stopPropagation(); this.dispatchEvent(new CustomEvent('copy-thread', {detail: ppAh, bubbles: true, composed: true}))}}></ui5-button>
                    ${hideShowBtn}
                </div>
              </sl-tooltip>
          `});

    treeItems = treeItems.filter((value) => value !== undefined);
    console.log("<dm-lister>.render() treeItems", treeItems);

    const createBtn = html``;
    /** Handle empty tree case */
    if (treeItems.length == 0) {
      return html`
          <div style="display:flex; flex-direction:column; gap:10px; padding:7px;">
            <div style="color: grey; margin: auto;">${msg('No DM found')}</div>
              <ui5-button design="Emphasized"
                          @click=${(e) => { e.stopPropagation();
                              this.dispatchEvent(new CustomEvent('createNewDm', {detail: true, bubbles: true, composed: true}))
                          }}>
                  ${msg('Message a friend')}
              </ui5-button>
          </div>
      `;
    } else {
      treeItems.push(html`
          <div style="display:flex; flex-direction:column; gap:10px; padding:20px;">
              <ui5-button design="Emphasized"
                          @click=${(e) => { e.stopPropagation();
                              this.dispatchEvent(new CustomEvent('createNewDm', {detail: true, bubbles: true, composed: true}))
                          }}>
                  ${msg('Message a friend')}
              </ui5-button>
          </div>        
      `);
    }


    /** render all */
    return html`${treeItems}`;
  }


  /** */
  static get styles() {
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
