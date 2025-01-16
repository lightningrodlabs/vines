import {css, html, /*PropertyValues,*/} from "lit";
import {consume} from "@lit/context";
import {customElement, property} from "lit/decorators.js";
import {ActionId, ZomeElement} from "@ddd-qc/lit-happ";
import {ThreadsZvm} from "../../viewModels/threads.zvm";
import {ThreadsPerspective} from "../../viewModels/threads.perspective";
import {msg} from "@lit/localize";
import {CommentRequest, EditTopicRequest, HideEvent, SpecialSubjectType, threadJumpEvent} from "../../events";
import {onlineLoadedContext} from "../../contexts";
import {sharedStyles} from "../../styles";
import {Hrl} from "@theweave/api/dist/types";
import {intoHrl} from "@ddd-qc/we-utils";


/**
 *
 */
@customElement("history-lister")
export class HistoryLister extends ZomeElement<ThreadsPerspective, ThreadsZvm> {

  constructor() {
    super(ThreadsZvm.DEFAULT_ZOME_NAME);
  }

  /** -- Properties -- */

  @property({type: Boolean}) history?: boolean = false;
  @property({type: Boolean}) collapsed?: boolean = true;

  @property() showArchivedTopics?: string;

  @property() selectedThreadHash?: ActionId;

  @property() threadStack?: ActionId[];

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
    console.log("<history-lister>.render()", this.threadStack?.length);

    let threads = this.threadStack?.map((ppAh) => {
      const thread = this.perspective.threads.get(ppAh);
      if (!thread) {
        return html`<ui5-busy-indicator delay="0" size="Medium" active style="width:100%; height:100%;"></ui5-busy-indicator>`;
      }
      //console.log("this.selectedThreadHash", this.selectedThreadHash, ppAh);
      const isSelected = false;
      //const isSelected = this.selectedThreadHash && this.selectedThreadHash.equals(ppAh);
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
                ${this.cell.address.agentId.equals(thread.author)? html`<ui5-button id=${"edit-" + ppAh.b64} icon="edit" tooltip=${msg("Edit Title")} design="Transparent"
                            style="border:none;display: none"
                            @click=${(_e:any) => this.onClickEditChannel(ppAh)}></ui5-button>` : html``}
                <ui5-button icon="chain-link" tooltip=${msg("Copy Channel Link")} design="Transparent"
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
    `});

    //console.log("<topics-lister>.render() threads", threads);
    if (!threads || threads.length == 0) {
      threads = [html`<div class="threadItem">
                 <span style="margin-left:28px;margin-right:10px;color:grey">${msg('No channel history')}</span>
            </div>`];
    }

    /** render all */
    return html`
        <ui5-panel ?collapsed=${this.collapsed}>
            <div slot="header" style="display:flex; flex-direction:row; overflow:hidden;width: 100%;">
                <span style="width: 1.2rem; height: 1.2rem">${msg("History")}</span>
            </div>
        ${threads}
        </ui5-panel>
    `;
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
          color: #9f9e9e;
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
