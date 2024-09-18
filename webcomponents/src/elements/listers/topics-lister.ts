import {css, html, /*PropertyValues,*/ TemplateResult} from "lit";
import {consume} from "@lit/context";
import {customElement, property} from "lit/decorators.js";
import {ActionId, EntryId, ZomeElement} from "@ddd-qc/lit-happ";
import {ThreadsZvm} from "../../viewModels/threads.zvm";
import {ThreadsPerspective} from "../../viewModels/threads.perspective";
import {msg} from "@lit/localize";
import {CommentRequest, EditTopicRequest, HideEvent, SpecialSubjectType, threadJumpEvent} from "../../events";
import {onlineLoadedContext} from "../../contexts";
import {sharedStyles} from "../../styles";
import {Hrl} from "@lightningrodlabs/we-applet/dist/types";
import {intoHrl} from "@ddd-qc/we-utils";


/**
 *
 */
@customElement("topics-lister")
export class TopicsLister extends ZomeElement<ThreadsPerspective, ThreadsZvm> {

  constructor() {
    super(ThreadsZvm.DEFAULT_ZOME_NAME);
  }

  /** -- Properties -- */

  @property({type: Boolean}) collapsed?: boolean = false;

  @property() showArchivedTopics?: string;

  @property() selectedThreadHash?: ActionId;

  @consume({ context: onlineLoadedContext, subscribe: true })
  onlineLoaded!: boolean;


  /** -- Methods -- */

  // /** Don't update during online loading */
  // override shouldUpdate(changedProperties: PropertyValues<this>) {
  //   const shouldnt = !super.shouldUpdate(changedProperties);
  //   if (shouldnt) {
  //     return false;
  //   }
  //   /** Don't update during loading */
  //   if (changedProperties.has("perspective") && !this.onlineLoaded) {
  //     return false;
  //   }
  //   return true;
  // }


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
  override render() {
    console.log("<topics-lister>.render()", this.perspective.semanticTopics);
    let treeItems = Array.from(this.perspective.semanticTopics.entries()).map(([topicEh, title]) => {
      const isSubjectHidden = this._zvm.perspective.hiddens[topicEh.b64]? this._zvm.perspective.hiddens[topicEh.b64] : false;
      /** Skip if hidden */
      if (isSubjectHidden && !this.showArchivedTopics) {
        return;
      }
      /** Render threads for Topic */
      let threads: TemplateResult<1>[] = [];
      let topicThreads = this.perspective.threadsPerSubject.get(topicEh.b64);
      if (topicThreads == undefined) {
        topicThreads = [];
      } else {
        topicThreads = topicThreads.sort((a, b) => {
          const nameA = this.perspective.threads.get(a)!.name;
          const nameB = this.perspective.threads.get(b)!.name;
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
          const maybeUnreadThread = this.perspective.unreadThreads.get(ppAh);
          const hasNewBeads = maybeUnreadThread && maybeUnreadThread[1].length > 0;
          const threadIsNew = this.perspective.newThreads.has(ppAh);
          if (!thread.pp || (isThreadHidden && !this.showArchivedTopics) || thread.pp.purpose == "comment") {
            return html``;
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
                            style="border:none; display:none; ${isSelected? "color:#444;" : ""}"
                            design="Negative"
                            @click="${(_e:any) => this.onClickCommentPp(maybeCommentThread, ppAh, thread.pp.purpose)}"></ui5-button>`;
          } else {
            commentButton = maybeCommentThread != null
              ? html`
                  <ui5-button icon="comment" tooltip=${msg("View comments")} design="Transparent"
                              style="border:none; display:none; ${isSelected? "color:#444;" : ""}"
                              @click=${(e:any) => {e.stopPropagation(); this.onClickCommentPp(maybeCommentThread, ppAh, thread.pp.purpose)}}></ui5-button>`
              : html`
                  <ui5-button icon="sys-add" tooltip=${msg("Create comment thread")} design="Transparent"
                              style="border:none; display:none; ${isSelected? "color:#444;" : ""}"
                              @click=${(e:any) => {e.stopPropagation(); this.onClickCommentPp(maybeCommentThread, ppAh, thread.pp.purpose)}}></ui5-button>`;
          }

          /** 'new', 'notif' or 'unread' badge to display */
          let badge = html`<ui5-badge>0</ui5-badge>`;
          let notifCount = this._zvm.perspective.getAllNotificationsForPp(ppAh).length;
          if (threadIsNew) {
            badge = html`
                <ui5-badge class="notifBadge">${msg("new")}</ui5-badge>`;
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
                                this.dispatchEvent(new CustomEvent<HideEvent>('archive', {detail: {hide: false, address: ppAh}, bubbles: true, composed: true}));
                            }}></ui5-button>
            ` : html`
                      <ui5-button icon="hide" tooltip="Hide" design="Transparent"
                                  class="showBtn" style="${isSelected? "color:#444;" : ""}"
                                  @click=${async (e:any) => {
                                      e.stopPropagation();
                                      this.dispatchEvent(new CustomEvent<HideEvent>('archive', {detail: {hide: true, address: ppAh}, bubbles: true, composed: true}));
                                  }}></ui5-button>`;

          return html`
              <sl-tooltip content=${thread.pp.purpose} style="--show-delay:1000">
                <div id=${ppAh.b64} class="threadItem" 
                     style="
                     font-weight:${hasNewBeads && !threadIsNew ? "bold" : "normal"}; 
                     ${threadIsNew || notifCount? "color: #359C07;" : ""}
                     ${isSelected? "background:#4684FD;color:#444;" : ""}
                     "
                     @click=${(_e:any) => this.dispatchEvent(threadJumpEvent(ppAh))}>
                    ${badge}
                    <span style="flex-grow:1;margin-left:10px;margin-right:10px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;font-weight: ${hasNewBeads || isSelected ? "bold" : ""}">${thread.pp.purpose}</span>
                    <ui5-button icon="copy" tooltip=${msg("Copy Channel Link")} design="Transparent"
                                style="border:none; display:none; ${isSelected? "color:#444;" : ""}"
                                @click=${(e:any) => {
                                    e.stopPropagation(); e.preventDefault();
                                    const hrl: Hrl = intoHrl(this.cell.address.dnaId, ppAh);
                                    this.dispatchEvent(new CustomEvent<Hrl>('copy', {detail: hrl, bubbles: true, composed: true}));
                                }}></ui5-button>
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
                                             @click=${(_e:any) => this.onClickCommentTopic(maybeCommentThread, topicEh, title)}></ui5-button>`;
      } else {
          topicCommentButton = maybeCommentThread != null
            ? html`
                <ui5-button id=${"cmt-" + topicEh.b64} icon="comment" tooltip=${msg("View comments")} design="Transparent" 
                            style="border:none;display: none"
                            @click="${(_e:any) => this.onClickCommentTopic(maybeCommentThread, topicEh, title)}"></ui5-button>`
            : html`
                <ui5-button id=${"cmt-" + topicEh.b64} icon="sys-add" tooltip=${msg("Create comment thread for this Topic")} design="Transparent"
                            style="border:none; padding:0px;display: none" 
                            @click="${(_e:any) => this.onClickCommentTopic(maybeCommentThread, topicEh, title)}"></ui5-button>`;
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
              count += this.perspective.unreadThreads.get(topicPpAh)![1].length;
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
                      @click="${async (e:any) => {
                          e.stopPropagation();
                          this.dispatchEvent(new CustomEvent<HideEvent>('archive', {detail: {hide: false, address: topicEh}, bubbles: true, composed: true}));
                      }}"></ui5-button>
      ` : html`
          <ui5-button id=${"hide-" + topicEh.b64} icon="hide" tooltip="Hide" design="Transparent"
                      style="border:none; padding:0px;display:none;"
                      @click="${async (e:any) => {
                          e.stopPropagation();
                          this.dispatchEvent(new CustomEvent<HideEvent>('archive', {detail: {hide: true, address: topicEh}, bubbles: true, composed: true}));
                      }}"></ui5-button>
      `;

      // const delButton = html`<ui5-button icon="delete" tooltip=${msg("Delete topic")}
      //                                        design="Negative" style="border:none;background: transparent"
      //                                        @click=${(e:any) => this._zvm.zomeProxy.deleteSemanticTopic(decodeHashFromBase64(topicHash))}></ui5-button>`;

      const topicHasUnreads = unreadSubjects.map((id) => id.b64).includes(topicEh.b64);

      //console.log("<topics-lister>.render() threads", threads);
      if (threads.length == 0) {
        threads = [html`<div class="threadItem">
                   <span style="margin-left:28px;margin-right:10px;color:grey">${msg('No channels found')}</span>
              </div>`];
      }

      /** render topic item */
      return html`
          <ui5-panel id=${topicEh.b64} ?collapsed=${this.collapsed}
                     @mouseover=${(_e:any) => {
                       const hide = this.shadowRoot!.getElementById("hide-" + topicEh.b64);
                       const cmt = this.shadowRoot!.getElementById("cmt-" + topicEh.b64);
                       const edit = this.shadowRoot!.getElementById("edit-" + topicEh.b64);
                       if (hide) hide.style.display = "block";
                       if (cmt) cmt.style.display = "block";
                       if (edit) edit.style.display = "block";
                     }}
                     @mouseout=${(_e:any) => {
                       const hide = this.shadowRoot!.getElementById("hide-" + topicEh.b64);
                       const cmt = this.shadowRoot!.getElementById("cmt-" + topicEh.b64);
                       const edit = this.shadowRoot!.getElementById("edit-" + topicEh.b64);
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
                        @click="${(_e:any) => this.onClickEditTopic(topicEh, title)}"></ui5-button>     -->
                ${topicHideBtn}                
                ${topicCommentButton}
                <ui5-button icon="add" tooltip=${msg("Create a new channel for this Topic")}
                            design="Transparent" 
                            style="color:grey"
                            @click=${async (e:any) => {
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
      treeItems.push(html`<div style="color: grey; margin: 10px auto 20px auto;">${msg('No topics found')}</div>`);
    }

    /** render all */
    return html`
        ${treeItems}
        <ui5-button design="Emphasized"
                    style="margin: auto;"
                    @click=${(_e:any) => this.dispatchEvent(new CustomEvent<boolean>('createNewTopic', {detail: true, bubbles: true, composed: true}))}>
            ${msg('Create new Topic')}
        </ui5-button>
    `
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

        ui5-panel::part(header):hover > ui5-button {
          display: block !important;
        }

        
        .subjectBadge {
          margin-top: 10px !important;
        }
        
      `,

    ];
  }
}
