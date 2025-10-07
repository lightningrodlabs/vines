import {css, html, /*PropertyValues,*/ TemplateResult} from "lit";
import {consume} from "@lit/context";
import {customElement, property, state} from "lit/decorators.js";
import {ActionId, ActionIdMap, AgentId, DnaElement} from "@ddd-qc/lit-happ";
import {ThreadsPerspective} from "../../viewModels/threads.perspective";
import {msg} from "@lit/localize";
import {CommentRequest, EditTopicRequest, HideEvent, SpecialSubjectType, threadJumpEvent} from "../../events";
import {onlineLoadedContext} from "../../contexts";
import {sharedStyles} from "../../styles";
import {latestThreadName} from "../../utils";
import {renderAvatar, renderAvatarGroup} from "../../render";
import {ThreadsDnaPerspective, ThreadsDvm} from "../../viewModels/threads.dvm";


/** */
export interface ICollapsable {
  collapseAll(canCollapse: boolean): void;
}


/**
 *
 */
@customElement("topics-lister")
export class TopicsLister extends DnaElement<ThreadsDnaPerspective, ThreadsDvm> implements ICollapsable {

  constructor() {
    super(ThreadsDvm.DEFAULT_BASE_ROLE_NAME);
  }

  /** -- Properties -- */

  @property({type: Boolean}) history?: boolean = false;

  @property({type: Boolean}) alphabetical?: boolean = false;

  @property() showArchivedTopics?: string;

  @property() selectedThreadHash?: ActionId;

  /** Observed perspective from zvm */
  @property({type: Object, attribute: false, hasChanged: (_v, _old) => true})
  threadsPerspective!: ThreadsPerspective;

  @consume({ context: onlineLoadedContext, subscribe: true })
  onlineLoaded!: boolean;


  /** -- Methods -- */

  /** In dvmUpdated() this._dvm is not already set */
  protected override async dvmUpdated(newDvm: ThreadsDvm, oldDvm?: ThreadsDvm): Promise<void> {
    console.debug("<topics-lister>.dvmUpdated()");
    /** Subscribe to ThreadsZvm */
    if (oldDvm) {
      oldDvm.threadsZvm.unsubscribe(this);
    }
    newDvm.threadsZvm.subscribe(this, 'threadsPerspective');
  }



  @state() collapsed: ActionIdMap<boolean> = new ActionIdMap<boolean>();

  /** */
  collapseAll(canCollapse: boolean): void {
    //console.log("<topics-lister> collapseAll", canCollapse);
    this.collapsed.forEach((_v, k, map) => {map.set(k, canCollapse)} );
    this.requestUpdate();
  }


  /** */
  onClickCommentPp(maybeCommentThread: ActionId | null, ppAh: ActionId, subjectName: string) {
    this.dispatchEvent(new CustomEvent<CommentRequest>('commenting-clicked', { detail: {maybeCommentThread, subjectId: ppAh, subjectType: SpecialSubjectType.ParticipationProtocol, subjectName, viewType: "side"}, bubbles: true, composed: true }));
  }
  /** */
  onClickCommentTopic(maybeCommentThread: ActionId | null, topicAh: ActionId, subjectName: string) {
    this.dispatchEvent(new CustomEvent<CommentRequest>('commenting-clicked', { detail: {maybeCommentThread, subjectId: topicAh, subjectType: SpecialSubjectType.SemanticTopic, subjectName, viewType: "side"}, bubbles: true, composed: true }));
  }
  /** */
  onClickEditTopic(topicHash: ActionId, subjectName: string) {
    this.dispatchEvent(new CustomEvent<EditTopicRequest>('edit-topic-clicked', { detail: {topicHash, subjectName}, bubbles: true, composed: true }));
  }
  /** */
  onClickEditChannel(ppAh: ActionId) {
    this.dispatchEvent(new CustomEvent<ActionId>('edit-channel-clicked', { detail: ppAh, bubbles: true, composed: true }));
  }


  /** */
  override render() {
    console.log("<topics-lister>.render()", this.collapsed, this.threadsPerspective.semanticTopics.size, this.threadsPerspective.semanticTopics);

    let pairs = Array.from(this.threadsPerspective.semanticTopics.entries());
    if (this.alphabetical) {
      pairs = pairs.sort((a, b) => {
        return a[1][0].localeCompare(b[1][0]);
      });
    } else {
      pairs = pairs.reverse();
    }
    let treeItems = pairs.map(([topicAh, [title, author]]) => {
      const isSubjectHidden = this.threadsPerspective.hiddens[topicAh.b64]? this.threadsPerspective.hiddens[topicAh.b64] : false;
      /** Skip if hidden */
      if (isSubjectHidden && !this.showArchivedTopics) {
        return;
      }
      /** Render threads for Topic */
      let threads: TemplateResult<1>[] = [];
      let topicThreads = this.threadsPerspective.getSubjectThreads(topicAh);
      if (topicThreads == undefined) {
        topicThreads = [];
      } else {
        if (this.alphabetical) {
          topicThreads = topicThreads.sort((a, b) => {
            const threadA = this.threadsPerspective.threads.get(a)!;
            const nameA = latestThreadName(threadA.title, threadA.pp, this._dvm.threadsZvm);
            const threadB = this.threadsPerspective.threads.get(b)!;
            const nameB = latestThreadName(threadB.title, threadB.pp, this._dvm.threadsZvm);
            return nameA.localeCompare(nameB);
          });
        } else {
          topicThreads = topicThreads.sort((a, b) => {
            const nameA = this.threadsPerspective.threads.get(a)!.creationTime
            const nameB = this.threadsPerspective.threads.get(b)!.creationTime;
            return nameB - nameA
          });
        }
        threads = topicThreads.map((ppAh) => {
          const thread = this.threadsPerspective.threads.get(ppAh);
          if (!thread) {
            return html`<ui5-busy-indicator delay="0" size="Medium" active style="width:100%; height:100%;"></ui5-busy-indicator>`;
          }
          //console.log("this.selectedThreadHash", this.selectedThreadHash, ppAh);
          const isPersistent = this._dvm.threadsZvm.perspective.isPersistent(ppAh.b64);
          const isSelected = this.selectedThreadHash && this.selectedThreadHash.equals(ppAh);
          const isThreadHidden = this.threadsPerspective.hiddens[ppAh.b64]? this.threadsPerspective.hiddens[ppAh.b64] : false;
          const maybeUnreadThread = this.threadsPerspective.unreads.get(ppAh);
          const hasNewBeads = maybeUnreadThread && maybeUnreadThread[1].length > 0;
          const threadIsNew = this.threadsPerspective.newThreads.has(ppAh);
          if (!thread.pp || (isThreadHidden && !this.showArchivedTopics) || thread.pp.purpose == "comment") {
            return html``;
          }
          /** Determine badge & buttons */
          const maybeCommentThread: ActionId | null = this.threadsPerspective.getCommentThreadForSubject(ppAh);
          let hasUnreadComments = false;
          if (maybeCommentThread != null) {
            hasUnreadComments = this.threadsPerspective.unreads.has(maybeCommentThread);
          }
          //console.log("<topics-lister> maybeCommentThread", maybeCommentThread, hasUnreadComments);

          let commentButton = html``;
          if (hasUnreadComments) {
            commentButton = html`
                <ui5-button icon="comment" tooltip=${msg("View comments")}
                            style="border:none; display:none; ${isSelected? "color:#444;" : ""}"
                            design="Negative"
                            @click="${(_e:any) => this.onClickCommentPp(maybeCommentThread, ppAh, thread.title)}"></ui5-button>`;
          } else {
            commentButton = maybeCommentThread != null
              ? html`
                  <ui5-button icon="comment" tooltip=${msg("View comments")} design="Transparent"
                              style="border:none; display:none; ${isSelected? "color:#444;" : ""}"
                              @click=${(e:any) => {e.stopPropagation(); this.onClickCommentPp(maybeCommentThread, ppAh, thread.title)}}></ui5-button>`
              : html`
                  <ui5-button icon="sys-add" tooltip=${msg("Create comment thread")} design="Transparent"
                              style="border:none; display:none; ${isSelected? "color:#444;" : ""}"
                              @click=${(e:any) => {e.stopPropagation(); this.onClickCommentPp(maybeCommentThread, ppAh, thread.title)}}></ui5-button>`;
          }

          /** 'new', 'notif' or 'unread' badge to display */
          let badge = html`<ui5-badge>0</ui5-badge>`;
          let notifCount = this.threadsPerspective.getAllNotificationsForPp(ppAh).length;
          if (threadIsNew) {
            if (isPersistent) {
              badge = html`<ui5-badge class="notifBadge" title="new channel!">${notifCount}</ui5-badge>`;
            } else {
              badge = html`<ui5-badge class="tempBadge">${msg("temp")}</ui5-badge>`;
            }
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
                            class="showBtn" style="${isSelected? "color:#444;" : ""}"
                            @click=${async (e:any) => {
                                e.stopPropagation();
                                this.dispatchEvent(new CustomEvent<HideEvent>('archive', {detail: {hide: false, address: ppAh, type: "Channel"}, bubbles: true, composed: true}));
                            }}></ui5-button>
            ` : html`
                      <ui5-button icon="hide" tooltip="Hide" design="Transparent"
                                  class="showBtn" style="${isSelected? "color:#444;" : ""}"
                                  @click=${async (e:any) => {
                                      e.stopPropagation();
                                      this.dispatchEvent(new CustomEvent<HideEvent>('archive', {detail: {hide: true, address: ppAh, type: "Channel"}, bubbles: true, composed: true}));
                                  }}></ui5-button>`;

          /** Create avatar group */
          const agents: AgentId[] = this._dvm.allCurrentOthers(undefined, ppAh);
          const avatarGrp = Object.values(agents).length > 0
              ? Object.values(agents).length > 1
                  ? renderAvatarGroup(this._dvm.profilesZvm, agents)
                  : renderAvatar(this, this._dvm.profilesZvm, agents[0]!, "XS")
              : html``;

          /** render topic thread */
          return html`
              <sl-tooltip content=${thread.title} style="--show-delay:1000">
                <div id=${ppAh.b64} class="threadItem" 
                     style="
                       font-weight:${hasNewBeads && !threadIsNew ? "bold" : "normal"}; 
                       ${threadIsNew || notifCount? "color: #359C07;" : ""}
                       ${isSelected? "background:#4684FD;color:#444;" : ""}
                     "
                     @click=${(_e:any) => this.dispatchEvent(threadJumpEvent(ppAh))}>
                    ${badge}
                    <span style="flex-grow:1;margin-left:10px;margin-right:10px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;font-weight: ${hasNewBeads || isSelected ? "bold" : ""}; color: ${isSelected? "white" : ""};">${thread.title}</span>
                    ${avatarGrp}
                    ${this.cell.address.agentId.equals(thread.author)? html`<ui5-button id=${"edit-" + ppAh.b64} icon="edit" tooltip=${msg("Edit Title")} design="Transparent"
                                style="border:none;display: none"
                                @click=${(_e:any) => this.onClickEditChannel(ppAh)}></ui5-button>` : html``}
                    <copy-wal-button .dnaId=${this.cell.address.dnaId} .hash=${ppAh} name=${msg("Channel")}
                                     style="border:none; display: none; ${isSelected? "color:#444;" : ""}"></copy-wal-button>
                    ${hideShowBtn}                  
                    ${commentButton}
                </div>
              </sl-tooltip>
          `})
      }
      /* */
      const newSubjects = this.threadsPerspective.getNewSubjects();
      const unreadSubjects = this.threadsPerspective.getUnreadSubjects();

      /** Render Topic */
      const maybeCommentThread: ActionId | null = this.threadsPerspective.getCommentThreadForSubject(topicAh);
      const topicIsNew = newSubjects.get(topicAh.b64) != undefined;
      let topicHasUnreadComments = false;
      if (maybeCommentThread != null) {
        topicHasUnreadComments = unreadSubjects.map((id) => id.b64).includes(topicAh.b64);
      }

      let topicCommentButton = html``;
      if (topicHasUnreadComments) {
        topicCommentButton = html`<ui5-button icon="comment" tooltip=${msg("View comments")}
                                             design="Negative" style="border:none;background: transparent"
                                             @click=${(_e:any) => this.onClickCommentTopic(maybeCommentThread, topicAh, title)}></ui5-button>`;
      } else {
          topicCommentButton = maybeCommentThread != null
            ? html`
                <ui5-button id=${"cmt-" + topicAh.b64} icon="comment" tooltip=${msg("View comments")} design="Transparent" 
                            style="border:none;display: none"
                            @click="${(_e:any) => this.onClickCommentTopic(maybeCommentThread, topicAh, title)}"></ui5-button>`
            : html`
                <ui5-button id=${"cmt-" + topicAh.b64} icon="sys-add" tooltip=${msg("Create comment thread for this Category")} design="Transparent"
                            style="border:none; padding:0px;display: none" 
                            @click="${(_e:any) => this.onClickCommentTopic(maybeCommentThread, topicAh, title)}"></ui5-button>`;
      }


      /** 'new', 'notif' and 'unread' badge to display */
      let topicBadge = html``;
      if (topicIsNew) {
        topicBadge = html`<ui5-badge class="notifBadge subjectBadge">${msg('new')}</ui5-badge>`;
      } else {
        let notifCount = 0; // FIXME: Get real notif count
        if (notifCount > 0) {
          topicBadge = html`<ui5-badge class="notifBadge subjectBadge">${notifCount}</ui5-badge>`;
        } else {
          /** Agregate count of unread beads on all topic's threads */
          let count = 0;
          for (const topicPpAh of topicThreads) {
            if (this.threadsPerspective.unreads.get(topicPpAh)) {
              count += this.threadsPerspective.unreads.get(topicPpAh)![1].length;
            }
          }
          if (count > 0) {
            topicBadge = html`<ui5-badge class="unreadBadge subjectBadge">${count}</ui5-badge>`;
          }
        }
      }

      const topicHideBtn = this.showArchivedTopics && isSubjectHidden ? html`
          <ui5-button id=${"hide-" + topicAh.b64} icon="show" tooltip="Show" design="Transparent"
                      style="border:none; padding:0px;display:none;"
                      @click="${async (e:any) => {
                          e.stopPropagation();
                          this.dispatchEvent(new CustomEvent<HideEvent>('archive', {detail: {hide: false, address: topicAh, type: "Topic"}, bubbles: true, composed: true}));
                      }}"></ui5-button>
      ` : html`
          <ui5-button id=${"hide-" + topicAh.b64} icon="hide" tooltip="Hide" design="Transparent"
                      style="border:none; padding:0px;display:none;"
                      @click="${async (e:any) => {
                          e.stopPropagation();
                          this.dispatchEvent(new CustomEvent<HideEvent>('archive', {detail: {hide: true, address: topicAh, type: "Topic"}, bubbles: true, composed: true}));
                      }}"></ui5-button>
      `;

      // const delButton = html`<ui5-button icon="delete" tooltip=${msg("Delete topic")}
      //                                        design="Negative" style="border:none;background: transparent"
      //                                        @click=${(e:any) => this._zvm.zomeProxy.deleteSemanticTopic(decodeHashFromBase64(topicHash))}></ui5-button>`;

      const topicHasUnreads = unreadSubjects.map((id) => id.b64).includes(topicAh.b64);

      //console.log("<topics-lister>.render() threads", threads);
      if (threads.length == 0) {
        //const tBgColor = this._dvm.perspective.myNewestTopic && topicAh.equals(this._dvm.perspective.myNewestTopic)? "#c3f9c5bd" : "#F6FAFC";
        const tBgColor = "#F6FAFC";
        threads = [html`<div class="threadItem" style="cursor: default; display: flex; flex-direction: column; background: ${tBgColor}">
                   <span style="color:grey;">${msg('No channels found')}</span>
                    <span class="linky" style="text-decoration: underline; font-size: small"
                          @click=${async (e:any) => {
                              e.stopPropagation(); e.preventDefault();
                              await this.updateComplete;
                              this.dispatchEvent(new CustomEvent<ActionId>('createThreadClicked', {detail: topicAh, bubbles: true, composed: true}));
                          }}
                    >
                        ${msg('Create channel')}</span>
              </div>`];
      }

      /** render topic item */
      console.log("<topics-lister> collapsed", this.collapsed);
      let collapsed = false;
      if (this.collapsed.get(topicAh)) {
        collapsed = this.collapsed.get(topicAh)!;
      }  else {
        this.collapsed.set(topicAh, false);
      }
      const bgColor = this._dvm.perspective.myNewestTopic && topicAh.equals(this._dvm.perspective.myNewestTopic)? "background:#c3f9c5bd" : "";
      return html`
          <ui5-panel id=${topicAh.b64} ?collapsed=${collapsed}
                     style="${bgColor}"
                     @toggle=${(e:any) => {
                       //console.log("<topics-lister> TOGGLED", e.target.collapsed);
                       this.collapsed.set(topicAh, e.target.collapsed);
                       this.requestUpdate();
                     }}
                     @mouseover=${(_e:any) => {
                       const hide = this.shadowRoot!.getElementById("hide-" + topicAh.b64);
                       const cmt = this.shadowRoot!.getElementById("cmt-" + topicAh.b64);
                       const edit = this.shadowRoot!.getElementById("edit-" + topicAh.b64);
                       if (hide) hide.style.display = "block";
                       if (cmt) cmt.style.display = "block";
                       if (edit && this.cell.address.agentId.equals(author)) edit.style.display = "block";
                     }}
                     @mouseout=${(_e:any) => {
                       const hide = this.shadowRoot!.getElementById("hide-" + topicAh.b64);
                       const cmt = this.shadowRoot!.getElementById("cmt-" + topicAh.b64);
                       const edit = this.shadowRoot!.getElementById("edit-" + topicAh.b64);
                       if (hide) hide.style.display = "none";
                       if (cmt) cmt.style.display = "none";
                       if (edit) edit.style.display = "none";
                     }}>
            <!-- header -->
            <div slot="header" style="display:flex; flex-direction:row; overflow:hidden; width:100%;">
                <div style="flex-grow:1; height:18px; margin-top:8px; margin-right:10px; font-weight:${topicHasUnreads? "bold" : ""}; text-overflow:ellipsis; overflow:hidden;">${title}</div>
                <!-- ${topicBadge} -->
                <ui5-button id=${"edit-" + topicAh.b64} icon="edit" tooltip=${msg("Edit Title")} design="Transparent"
                        style="border:none;display: none"
                        @click=${(_e:any) => this.onClickEditTopic(topicAh, title)}></ui5-button>
                ${topicHideBtn}                
                ${topicCommentButton}
                <ui5-button icon="add" tooltip=${msg("Create a new Channel for this Category")}
                            design="Transparent" 
                            style="color:grey"
                            @click=${async (e:any) => {
                              e.stopPropagation(); e.preventDefault();
                              await this.updateComplete;
                              this.dispatchEvent(new CustomEvent<ActionId>('createThreadClicked', {detail: topicAh, bubbles: true, composed: true}));
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
      treeItems.push(html`<div style="color: grey; margin: 10px auto 20px auto;">${msg('No topics found')}</div>`);
      //if (this._dvm.profilesZvm.perspective.agents.length <= 1) {
        treeItems.push(html`<div style="color: grey; margin: 10px auto 20px auto;">${msg('(Might not be connected to peers yet)')}</div>`);
      //}
    }

    /** render all */
    return html`${treeItems}`
  }


  /** */
  static override get styles() {
    return [
      sharedStyles,
      css`
        :host {
          /*background: #FBFCFD;*/
          /*display: block;*/
          display: flex;
          flex-direction: column;
          /*overflow-y: auto;*/
          /*height: 100%;*/
          padding-bottom: 20px;
        }

        .subjectBadge {
          margin-top: 10px !important;
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
          background: #33A000;
        }

        ui5-panel::part(header) > copy-wal-button {
          border: 1px solid black;
          background: #33A000;
        }
        
        
      
        ui5-panel::part(header):hover > ui5-button {
          display: block !important;
        }
        
        ui5-panel::part(header):hover > copy-wal-button {
          display: block !important;
        }
      `,

    ];
  }
}
