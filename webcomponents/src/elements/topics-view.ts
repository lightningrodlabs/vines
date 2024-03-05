import {css, html} from "lit";
import {customElement, property, state} from "lit/decorators.js";
import {ActionHashB64} from "@holochain/client";
import {ZomeElement} from "@ddd-qc/lit-happ";
import {ThreadsZvm} from "../viewModels/threads.zvm";
import {ThreadsPerspective} from "../viewModels/threads.perspective";
import {Dictionary} from "@ddd-qc/cell-proxy";
import {CommentRequest} from "../utils";
import {msg} from "@lit/localize";
import {toasty} from "../toast";
import {threadJumpEvent} from "../jump";


/**
 *
 */
@customElement("topics-view")
export class TopicsView extends ZomeElement<ThreadsPerspective, ThreadsZvm> {

  constructor() {
    super(ThreadsZvm.DEFAULT_ZOME_NAME);
  }

  @property() showArchivedTopics?: string;


  /** */
  onClickCommentPp(maybeCommentThread: ActionHashB64 | null, ppAh: ActionHashB64, subjectName: string) {
    this.dispatchEvent(new CustomEvent<CommentRequest>('commenting-clicked', { detail: {maybeCommentThread, subjectHash: ppAh, subjectType: "ParticipationProtocol", subjectName, viewType: "side"}, bubbles: true, composed: true }));
  }

  /** */
  onClickCommentTopic(maybeCommentThread: ActionHashB64 | null, ah: ActionHashB64, subjectName: string) {
    this.dispatchEvent(new CustomEvent<CommentRequest>('commenting-clicked', { detail: {maybeCommentThread, subjectHash: ah, subjectType: "SemanticTopic", subjectName, viewType: "side"}, bubbles: true, composed: true }));
  }



  /** */
  render() {
    console.log("<topics-view>.render()");


    let treeItems = Object.entries(this.perspective.allSemanticTopics).map(([topicHash, [title, isHidden]]) => {
      /** Skip if hidden */
      if (isHidden && !this.showArchivedTopics) {
        return;
      }
      /** Render threads for Topic */
      let threads = [html`<ui5-busy-indicator size="Medium" active style="margin:auto; width:50%; height:50%;"></ui5-busy-indicator>`];
      let topicThreads = this.perspective.threadsPerSubject[topicHash];
      if (topicThreads == undefined) {
        topicThreads = [];
        this._zvm.probeSubjectThreads(topicHash).then(() => this.requestUpdate())
      } else {
        topicThreads = topicThreads.sort((a, b) => {
          const nameA = this.perspective.threads.get(a).name;
          const nameB = this.perspective.threads.get(b).name;
          return nameA.localeCompare(nameB);
        });
        threads = Object.values(topicThreads).map((ppAh) => {
          const thread = this.perspective.threads.get(ppAh);
          if (!thread) {
            return html`<ui5-busy-indicator size="Medium" active style="margin:auto; width:50%; height:50%;"></ui5-busy-indicator>`;
          }
          //const hasNewBeads = thread && thread.hasUnreads();
          const maybeUnreadThread = this.perspective.unreadThreads[ppAh];
          const hasNewBeads = maybeUnreadThread && maybeUnreadThread[1].length > 0;
          //console.log("hasUnreads() thread", ppAh, thread.latestSearchLogTime);
          const threadIsNew = Object.keys(this.perspective.newThreads).includes(ppAh);
          console.log("<topics-view>.render() thread:", thread.pp.purpose, maybeUnreadThread);
          if (!thread.pp || (thread.isHidden && !this.showArchivedTopics) || thread.pp.purpose == "comment") {
            return html``;
          }

          /** Determine badge & buttons */
          const maybeCommentThread: ActionHashB64 | null = this._zvm.getCommentThreadForSubject(ppAh);
          let hasUnreadComments = false;
          if (maybeCommentThread != null) {
            hasUnreadComments = Object.keys(this._zvm.perspective.unreadThreads).includes(maybeCommentThread);
          }
          //console.log("<topics-view> maybeCommentThread", maybeCommentThread, hasUnreadComments);

          let commentButton = html``;
          if (hasUnreadComments) {
            commentButton = html`
                <ui5-button icon="comment" tooltip="View Thread"
                            style="border:none; display:none;"
                            design="Negative"
                            @click="${(e) => this.onClickCommentPp(maybeCommentThread, ppAh, thread.pp.purpose)}"></ui5-button>`;
          } else {
            commentButton = maybeCommentThread != null
              ? html`
                  <ui5-button icon="comment" tooltip=${msg("View comments")} design="Transparent"
                              style="border:none; display:none;"
                              @click="${(e) => this.onClickCommentPp(maybeCommentThread, ppAh, thread.pp.purpose)}"></ui5-button>`
              : html`
                  <ui5-button icon="sys-add" tooltip=${msg("Create comment Thread")} design="Transparent"
                              style="border:none; display:none;"
                              @click="${(e) => this.onClickCommentPp(maybeCommentThread, ppAh, thread.pp.purpose)}"></ui5-button>`;
          }

          /** 'new', 'notif' or 'unread' badge to display */
          let badge = html`<ui5-badge>0</ui5-badge>`;
          if (threadIsNew) {
            badge = html`
                <ui5-badge class="notifBadge">New</ui5-badge>`;
          } else {
            let notifCount = this._zvm.getPpNotifs(ppAh).length;
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

          const hideShowBtn = this.showArchivedTopics && thread.isHidden ?
            html`
                <ui5-button icon="show" tooltip="Show" design="Transparent"
                            class="showBtn"
                            @click=${async (e) => {
                                await this._zvm.unhideSubject(ppAh);
                                toasty(`Unarchived Subject "${thread.pp.purpose}"`);
                            }}></ui5-button>
            ` : html`
                      <ui5-button icon="hide" tooltip="Hide" design="Transparent"
                                  class="showBtn"
                                  @click=${async (e) => {
                                      await this._zvm.hideSubject(ppAh);
                                      toasty(`Archived Subject "${thread.pp.purpose}`);
                                  }}></ui5-button>`;

          return html`
              <div id=${ppAh} class="threadItem" style="font-weight:${hasNewBeads && !threadIsNew ? "bold" : "normal"};"
                   @click=${(e) => this.dispatchEvent(threadJumpEvent(ppAh))}>
                  ${badge}
                  <span style="flex-grow:1;margin-left:10px;margin-right:10px; overflow:hidden; text-overflow:ellipsis;font-weight: ${hasNewBeads ? "bold" : ""}">${thread.pp.purpose}</span>
                  ${hideShowBtn}                  
                  ${commentButton}
              </div>
          `})
      }
      /* */
      const newSubjects = this._zvm.getNewSubjects();
      const unreadSubjects = this._zvm.getUnreadSubjects();

      /** Render Topic */
      const maybeCommentThread: ActionHashB64 | null = this._zvm.getCommentThreadForSubject(topicHash);
      const topicIsNew = newSubjects[topicHash] != undefined;
      let topicHasUnreadComments = false;
      if (maybeCommentThread != null) {
        topicHasUnreadComments = unreadSubjects.includes(topicHash);
      }

      let topicCommentButton = html``;
      if (topicHasUnreadComments) {
        topicCommentButton = html`<ui5-button icon="comment" tooltip="View Thread" 
                                             design="Negative" style="border:none;background: transparent"
                                             @click="${(e) => this.onClickCommentTopic(maybeCommentThread, topicHash, title)}"></ui5-button>`;
      } else {
          topicCommentButton = maybeCommentThread != null
            ? html`
                <ui5-button id=${"cmt-"+topicHash} icon="comment" tooltip=${msg("View comments")} design="Transparent" 
                            style="border:none;display: none"
                            @click="${(e) => this.onClickCommentTopic(maybeCommentThread, topicHash, title)}"></ui5-button>`
            : html`
                <ui5-button id=${"cmt-"+topicHash} icon="sys-add" tooltip=${msg("Create comment thread for this Topic")} design="Transparent"
                            style="border:none; padding:0px;display: none" 
                            @click="${(e) => this.onClickCommentTopic(maybeCommentThread, topicHash, title)}"></ui5-button>`;
      }


      /** 'new', 'notif' and 'unread' badge to display */
      let topicBadge = html``;
      if (topicIsNew) {
        topicBadge = html`<ui5-badge class="notifBadge subjectBadge">New</ui5-badge>`;
      } else {
        let notifCount = 0; // FIXME
        if (notifCount > 0) {
          topicBadge = html`<ui5-badge class="notifBadge subjectBadge">${notifCount}</ui5-badge>`;
        } else {
          /** Agregate count of unread beads on all topic's threads */
          let count = 0;
          for (const topicPpAh of topicThreads) {
            if (this.perspective.unreadThreads[topicPpAh]) {
              count += this.perspective.unreadThreads[topicPpAh][1].length;
            }
          }
          if (count > 0) {
            topicBadge = html`<ui5-badge class="unreadBadge subjectBadge">${count}</ui5-badge>`;
          }
        }
      }

      const topicHideBtn = this.showArchivedTopics && isHidden ? html`
          <ui5-button id=${"hide-"+topicHash} icon="show" tooltip="Show" design="Transparent"
                      style="border:none; padding:0px;display:none;"
                      @click="${async (e) => {
                          await this._zvm.unhideSubject(topicHash);
                          toasty(`Unarchived Topic "${title}"`)
                      }}"></ui5-button>
      ` : html`
          <ui5-button id=${"hide-"+topicHash} icon="hide" tooltip="Hide" design="Transparent"
                      style="border:none; padding:0px;display:none;"
                      @click="${async (e) => {
                          await this._zvm.hideSubject(topicHash);
                          toasty(`Archived Topic "${title}"`)
                      }}"></ui5-button>
      `;

      const topicHasUnreads = unreadSubjects.includes(topicHash);
      return html`
          <ui5-panel id=${topicHash}
                     @mouseover=${(e) => {
                       const hide = this.shadowRoot.getElementById("hide-"+topicHash);
                       const cmt = this.shadowRoot.getElementById("cmt-"+topicHash);
                       if (hide) hide.style.display = "block";
                       if (cmt) cmt.style.display = "block";
                     }}
                     @mouseout=${(e) => {
                       const hide = this.shadowRoot.getElementById("hide-"+topicHash);
                       const cmt = this.shadowRoot.getElementById("cmt-"+topicHash);
                       if (hide) hide.style.display = "none";
                       if (cmt) cmt.style.display = "none";
                     }}>
            <!-- header -->
            <div slot="header" style="display:flex; flex-direction:row; overflow:hidden;width: 100%;">
                <div style="flex-grow:1; color:#588AD7; height:18px; margin-top:8px; margin-right:10px; font-weight:${topicHasUnreads? "bold" : ""}; text-overflow:ellipsis; overflow:hidden;">${title}</div>
                ${topicBadge}
                ${topicHideBtn}                
                ${topicCommentButton}
                <ui5-button icon="add" tooltip="Create a new channel for this Topic" design="Transparent" @click=${async (e) => {
                    e.stopPropagation(); //console.log("topic clicked:", title);
                    await this.updateComplete;
                    this.dispatchEvent(new CustomEvent('createThreadClicked', {detail: topicHash, bubbles: true, composed: true}));
                }}></ui5-button>
            </div>
            <!-- threads -->              
            ${threads}
          </ui5-panel>`
    });

    /** render all */
    return html`${treeItems}`
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

        ui5-panel {
          display: flex;
          flex-direction: column;
          /*padding: 7px;*/
          border: none;
          margin-bottom: 20px;
        }
        ui5-panel::part(content) {
          padding: 0;
          padding-left: 7px;
        }        
        ui5-panel::part(header) {
          border: none;
        }
        ui5-panel::part(header):hover {
          /*background: rgb(198, 214, 250);*/
          font-weight: bold;
        }

        ui5-panel::part(header) > ui5-button {
          border: 1px solid black;
          background: red;
        }

        ui5-panel::part(header):hover > ui5-button {
          display: block !important;
        }
        
        .threadItem {
          display: flex;
          overflow: hidden;
          align-items: center;
          height: 36px;
          padding-left: 10px;
          cursor: pointer;
          color: #484848;
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

        #semTree {
          display: flex;
          flex-direction: column;
          /*width: 100%;*/
        }

        .transBtn {
          border: none;
          background: none;
        }

        .subjectBadge {
          margin-top: 10px !important;
        }

        .unreadBadge {
          background: aliceblue;
          color: gray;
          border-color: aliceblue;
          margin-top: 3px;
        }

        .notifBadge {
          color: #82a52a;
          margin-top: 3px;
        }
      `,

    ];
  }
}
