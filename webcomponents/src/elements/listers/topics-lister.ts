import {css, html, PropertyValues} from "lit";
import {consume} from "@lit/context";
import {customElement, property, state} from "lit/decorators.js";
import {ActionId, EntryId, ZomeElement} from "@ddd-qc/lit-happ";
import {ThreadsZvm} from "../../viewModels/threads.zvm";
import {ThreadsPerspective} from "../../viewModels/threads.perspective";
import {msg} from "@lit/localize";
import {CommentRequest, EditTopicRequest, HideEvent, SpecialSubjectType, threadJumpEvent} from "../../events";
import {onlineLoadedContext} from "../../contexts";


/**
 *
 */
@customElement("topics-lister")
export class TopicsLister extends ZomeElement<ThreadsPerspective, ThreadsZvm> {

  /** */
  constructor() {
    super(ThreadsZvm.DEFAULT_ZOME_NAME);
  }


  @property() showArchivedTopics?: string;

  @property() selectedThreadHash?: ActionId;

  @consume({ context: onlineLoadedContext, subscribe: true })
  onlineLoaded!: boolean;


  /** Don't update during online loading */
  shouldUpdate(changedProperties: PropertyValues<this>) {
    //console.log("<topics-lister>.shouldUpdate()", changedProperties, this.onlineLoaded);
    const shouldnt = !super.shouldUpdate(changedProperties);
    if (shouldnt) {
      return false;
    }
    /** Don't update during loading */
    if (changedProperties.has("perspective") && !this.onlineLoaded) {
      return false;
    }
    return true;
  }


  /** */
  onClickCommentPp(maybeCommentThread: ActionId | null, ppAh: ActionId, subjectName: string) {
    this.dispatchEvent(new CustomEvent<CommentRequest>('commenting-clicked', { detail: {maybeCommentThread, subjectId: ppAh, subjectType: SpecialSubjectType.ParticipationProtocol, subjectName, viewType: "side"}, bubbles: true, composed: true }));
  }
  /** */
  onClickCommentTopic(maybeCommentThread: ActionId | null, topicEh: EntryId, subjectName: string) {
    this.dispatchEvent(new CustomEvent<CommentRequest>('commenting-clicked', { detail: {maybeCommentThread, subjectId: topicEh, subjectType: SpecialSubjectType.SemanticTopic, subjectName, viewType: "side"}, bubbles: true, composed: true }));
  }
  /** */
  onClickEditTopic(topicHash: EntryId, subjectName: string) {
    this.dispatchEvent(new CustomEvent<EditTopicRequest>('edit-topic-clicked', { detail: {topicHash, subjectName}, bubbles: true, composed: true }));

  }



  /** */
  render() {
    console.log("<topics-lister>.render()", this.perspective.semanticTopics);
    let treeItems = Array.from(this.perspective.semanticTopics.entries()).map(([topicEh, title]) => {
      const isSubjectHidden = this._zvm.perspective.hiddens[topicEh.b64]? this._zvm.perspective.hiddens[topicEh.b64] : false;
      /** Skip if hidden */
      if (isSubjectHidden && !this.showArchivedTopics) {
        return;
      }
      /** Render threads for Topic */
      //let threads = [html`<ui5-busy-indicator delay="0" size="Medium" active style="margin:auto; width:50%; height:50%;"></ui5-busy-indicator>`];
      let threads = [];
      let topicThreads = this.perspective.threadsPerSubject.get(topicEh.b64);
      if (topicThreads == undefined) {
        topicThreads = [];
        //this._zvm.pullSubjectThreads(topicHash).then(() => this.requestUpdate())
      } else {
        topicThreads = topicThreads.sort((a, b) => {
          const nameA = this.perspective.threads.get(a).name;
          const nameB = this.perspective.threads.get(b).name;
          return nameA.localeCompare(nameB);
        });
        threads = topicThreads.map((ppAh) => {
          const thread = this.perspective.threads.get(ppAh);
          if (!thread) {
            return html`<ui5-busy-indicator delay="0" size="Medium" active style="width:100%; height:100%;"></ui5-busy-indicator>`;
          }
          console.log("this.selectedThreadHash", this.selectedThreadHash, ppAh);
          const isSelected = this.selectedThreadHash && this.selectedThreadHash.equals(ppAh);
          const isThreadHidden = this._zvm.perspective.hiddens[ppAh.b64]? this._zvm.perspective.hiddens[ppAh.b64] : false;
          //const hasNewBeads = thread && thread.hasUnreads();
          const maybeUnreadThread = this.perspective.unreadThreads.get(ppAh);
          const hasNewBeads = maybeUnreadThread && maybeUnreadThread[1].length > 0;
          //console.log("hasUnreads() thread", ppAh, thread.latestSearchLogTime);
          const threadIsNew = this.perspective.newThreads.has(ppAh);
          //console.log("<topics-lister>.render() thread:", thread.pp.purpose, maybeUnreadThread);
          if (!thread.pp || (isThreadHidden && !this.showArchivedTopics) || thread.pp.purpose == "comment") {
            return;
          }

          /** Determine badge & buttons */
          const maybeCommentThread: ActionId | null = this._zvm.perspective.getCommentThreadForSubject(ppAh);
          let hasUnreadComments = false;
          if (maybeCommentThread != null) {
            hasUnreadComments = this.perspective.unreadThreads.has(maybeCommentThread);
          }
          //console.log("<topics-lister> maybeCommentThread", maybeCommentThread, hasUnreadComments);

          let commentButton = html``;
          if (hasUnreadComments) {
            commentButton = html`
                <ui5-button icon="comment" tooltip=${msg("View comments")}
                            style="border:none; display:none;"
                            design="Negative"
                            @click="${(e) => this.onClickCommentPp(maybeCommentThread, ppAh, thread.pp.purpose)}"></ui5-button>`;
          } else {
            commentButton = maybeCommentThread != null
              ? html`
                  <ui5-button icon="comment" tooltip=${msg("View comments")} design="Transparent"
                              style="border:none; display:none;"
                              @click=${(e) => {e.stopPropagation(); this.onClickCommentPp(maybeCommentThread, ppAh, thread.pp.purpose)}}></ui5-button>`
              : html`
                  <ui5-button icon="sys-add" tooltip=${msg("Create comment Thread")} design="Transparent"
                              style="border:none; display:none;"
                              @click=${(e) => {e.stopPropagation(); this.onClickCommentPp(maybeCommentThread, ppAh, thread.pp.purpose)}}></ui5-button>`;
          }

          /** 'new', 'notif' or 'unread' badge to display */
          let badge = html`<ui5-badge>0</ui5-badge>`;
          let notifCount = this._zvm.perspective.getAllNotificationsForPp(ppAh).length;
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

          const hideShowBtn = this.showArchivedTopics && isThreadHidden ?
            html`
                <ui5-button icon="show" tooltip="Show" design="Transparent"
                            class="showBtn"
                            @click=${async (e) => {
                                e.stopPropagation();
                                this.dispatchEvent(new CustomEvent<HideEvent>('archive', {detail: {hide: false, address: ppAh}, bubbles: true, composed: true}));
                            }}></ui5-button>
            ` : html`
                      <ui5-button icon="hide" tooltip="Hide" design="Transparent"
                                  class="showBtn"
                                  @click=${async (e) => {
                                      e.stopPropagation();
                                      this.dispatchEvent(new CustomEvent<HideEvent>('archive', {detail: {hide: true, address: ppAh}, bubbles: true, composed: true}));
                                  }}></ui5-button>`;

          return html`
              <sl-tooltip content=${thread.pp.purpose} style="--show-delay:1000">
                <div id=${ppAh.b64} class="threadItem" 
                     style="
                     font-weight:${hasNewBeads && !threadIsNew ? "bold" : "normal"}; 
                     ${threadIsNew || notifCount? "color: #359C07;" : ""}
                     ${isSelected? "background:#DBDBDB" : ""}
                     "
                     @click=${(e) => this.dispatchEvent(threadJumpEvent(ppAh))}>
                    ${badge}
                    <span style="flex-grow:1;margin-left:10px;margin-right:10px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;font-weight: ${hasNewBeads || isSelected ? "bold" : ""}">${thread.pp.purpose}</span>
                    <ui5-button icon="copy" tooltip=${msg("Copy Channel Link")} design="Transparent"
                                style="border:none; display:none;"
                                @click=${(e) => {e.stopPropagation(); this.dispatchEvent(new CustomEvent<ActionId>('copy-thread', {detail: ppAh, bubbles: true, composed: true}))}}></ui5-button>
                    ${hideShowBtn}                  
                    ${commentButton}
                </div>
              </sl-tooltip>
          `})
      }
      /* */
      const newSubjects = this._zvm.perspective.getNewSubjects();
      const unreadSubjects = this._zvm.perspective.getUnreadSubjects();

      /** Render Topic */
      const maybeCommentThread: ActionId | null = this._zvm.perspective.getCommentThreadForSubject(topicEh);
      const topicIsNew = newSubjects.get(topicEh.b64) != undefined;
      let topicHasUnreadComments = false;
      if (maybeCommentThread != null) {
        topicHasUnreadComments = unreadSubjects.map((id) => id.b64).includes(topicEh.b64);
      }

      let topicCommentButton = html``;
      if (topicHasUnreadComments) {
        topicCommentButton = html`<ui5-button icon="comment" tooltip=${msg("View comments")}
                                             design="Negative" style="border:none;background: transparent"
                                             @click=${(e) => this.onClickCommentTopic(maybeCommentThread, topicEh, title)}></ui5-button>`;
      } else {
          topicCommentButton = maybeCommentThread != null
            ? html`
                <ui5-button id=${"cmt-" + topicEh.b64} icon="comment" tooltip=${msg("View comments")} design="Transparent" 
                            style="border:none;display: none"
                            @click="${(e) => this.onClickCommentTopic(maybeCommentThread, topicEh, title)}"></ui5-button>`
            : html`
                <ui5-button id=${"cmt-" + topicEh.b64} icon="sys-add" tooltip=${msg("Create comment thread for this Topic")} design="Transparent"
                            style="border:none; padding:0px;display: none" 
                            @click="${(e) => this.onClickCommentTopic(maybeCommentThread, topicEh, title)}"></ui5-button>`;
      }


      /** 'new', 'notif' and 'unread' badge to display */
      let topicBadge = html``;
      if (topicIsNew) {
        topicBadge = html`<ui5-badge class="notifBadge subjectBadge">New</ui5-badge>`;
      } else {
        let notifCount = 0; // FIXME: Get real notif count
        if (notifCount > 0) {
          topicBadge = html`<ui5-badge class="notifBadge subjectBadge">${notifCount}</ui5-badge>`;
        } else {
          /** Agregate count of unread beads on all topic's threads */
          let count = 0;
          for (const topicPpAh of topicThreads) {
            if (this.perspective.unreadThreads.get(topicPpAh)) {
              count += this.perspective.unreadThreads.get(topicPpAh)[1].length;
            }
          }
          if (count > 0) {
            topicBadge = html`<ui5-badge class="unreadBadge subjectBadge">${count}</ui5-badge>`;
          }
        }
      }

      const topicHideBtn = this.showArchivedTopics && isSubjectHidden ? html`
          <ui5-button id=${"hide-" + topicEh.b64} icon="show" tooltip="Show" design="Transparent"
                      style="border:none; padding:0px;display:none;"
                      @click="${async (e) => {
                          e.stopPropagation();
                          this.dispatchEvent(new CustomEvent<HideEvent>('archive', {detail: {hide: false, address: topicEh}, bubbles: true, composed: true}));
                      }}"></ui5-button>
      ` : html`
          <ui5-button id=${"hide-" + topicEh.b64} icon="hide" tooltip="Hide" design="Transparent"
                      style="border:none; padding:0px;display:none;"
                      @click="${async (e) => {
                          e.stopPropagation();
                          this.dispatchEvent(new CustomEvent<HideEvent>('archive', {detail: {hide: true, address: topicEh}, bubbles: true, composed: true}));
                      }}"></ui5-button>
      `;

      // const delButton = html`<ui5-button icon="delete" tooltip=${msg("Delete topic")}
      //                                        design="Negative" style="border:none;background: transparent"
      //                                        @click=${(e) => this._zvm.zomeProxy.deleteSemanticTopic(decodeHashFromBase64(topicHash))}></ui5-button>`;

      const topicHasUnreads = unreadSubjects.map((id) => id.b64).includes(topicEh.b64);

      //console.log("<topics-lister>.render() threads", threads);
      if (threads.length == 0) {
        threads = [html`<div class="threadItem">
                   <span style="margin-left:28px;margin-right:10px;color:grey">${msg('No channels found')}</span>
              </div>`];
      }

      /** render topic item */
      return html`
          <ui5-panel id=${topicEh.b64}
                     @mouseover=${(e) => {
                       const hide = this.shadowRoot.getElementById("hide-" + topicEh.b64);
                       const cmt = this.shadowRoot.getElementById("cmt-" + topicEh.b64);
                       const edit = this.shadowRoot.getElementById("edit-" + topicEh.b64);
                       if (hide) hide.style.display = "block";
                       if (cmt) cmt.style.display = "block";
                       if (edit) edit.style.display = "block";
                     }}
                     @mouseout=${(e) => {
                       const hide = this.shadowRoot.getElementById("hide-" + topicEh.b64);
                       const cmt = this.shadowRoot.getElementById("cmt-" + topicEh.b64);
                       const edit = this.shadowRoot.getElementById("edit-" + topicEh.b64);
                       if (hide) hide.style.display = "none";
                       if (cmt) cmt.style.display = "none";
                       if (edit) edit.style.display = "none";
                     }}>
            <!-- header -->
            <div slot="header" style="display:flex; flex-direction:row; overflow:hidden;width: 100%;">
                <div style="flex-grow:1; height:18px; margin-top:8px; margin-right:10px; font-weight:${topicHasUnreads? "bold" : ""}; text-overflow:ellipsis; overflow:hidden;">${title}</div>
                <!-- ${topicBadge} -->
                <!-- Edit not working properly -->
                <!-- <ui5-button id=${"edit-" + topicEh.b64} icon="edit" tooltip=${msg("Edit Title")} design="Transparent"
                        style="border:none;display: none"
                        @click="${(e) => this.onClickEditTopic(topicEh, title)}"></ui5-button>     -->
                ${topicHideBtn}                
                ${topicCommentButton}
                <ui5-button icon="add" tooltip=${msg("Create a new channel for this Topic")}
                            design="Transparent" 
                            style="color:grey"
                            @click=${async (e) => {
                              e.stopPropagation(); //console.log("topic clicked:", title);
                              await this.updateComplete;
                              this.dispatchEvent(new CustomEvent<EntryId>('createThreadClicked', {detail: topicEh, bubbles: true, composed: true}));
                            }}>
                </ui5-button>
            </div>
            <!-- threads -->              
            ${threads}
          </ui5-panel>`
    });

    treeItems = treeItems.filter((value) => value !== undefined);
    console.log("<topics-lister>.render() treeItems", treeItems);

    /** Handle empty tree case */
    if (treeItems.length == 0) {
      return html`
          <div style="display:flex; flex-direction:column; gap:10px; padding:7px;">
            <div style="color: grey; margin: auto;">${msg('No topics found')}</div>
            <ui5-button design="Emphasized"
                        @click=${(e) => this.dispatchEvent(new CustomEvent<boolean>('createNewTopic', {detail: true, bubbles: true, composed: true}))}>
                ${msg('Create new topic')}
            </ui5-button>
          </div>
      `;
    }

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
          color: #588AD7;
        }

        ui5-panel::part(header):hover {
          /*background: rgb(198, 214, 250);*/
          /*font-weight: bold;*/
          color: #0087ff !important;
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

        .subjectBadge {
          margin-top: 10px !important;
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
