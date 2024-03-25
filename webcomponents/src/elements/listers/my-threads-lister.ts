import {css, html} from "lit";
import {customElement, property, state} from "lit/decorators.js";
import {msg} from "@lit/localize";
import {ActionHashB64, DnaHashB64} from "@holochain/client";
import {Dictionary, ZomeElement} from "@ddd-qc/lit-happ";
import {WeServicesEx} from "@ddd-qc/we-utils";

import {ThreadsZvm} from "../../viewModels/threads.zvm";
import {AnyLinkableHashB64, SubjectMat, ThreadsPerspective} from "../../viewModels/threads.perspective";
import {CommentRequest} from "../../utils";
import {toasty} from "../../toast";
import {threadJumpEvent} from "../../jump";
import {Thread} from "../../viewModels/thread";
import {consume} from "@lit/context";
import {globaFilesContext, THIS_APPLET_ID, weClientContext} from "../../contexts";
import {SEMANTIC_TOPIC_TYPE_NAME} from "../../bindings/threads.types";
import {FilesDvm} from "@ddd-qc/files";


/**
 *
 */
@customElement("my-threads-lister")
export class MyThreadsLister extends ZomeElement<ThreadsPerspective, ThreadsZvm> {

  constructor() {
    super(ThreadsZvm.DEFAULT_ZOME_NAME);
  }

  @property() showArchivedTopics?: string;

  @property() selectedThreadHash?: string;

  @consume({ context: globaFilesContext, subscribe: true })
  filesDvm!: FilesDvm;

  @consume({ context: weClientContext, subscribe: true })
  weServices!: WeServicesEx;

  @state() private _loading = false;


  protected async zvmUpdated(newZvm: ThreadsZvm, oldZvm?: ThreadsZvm): Promise<void> {
    super.zvmUpdated(newZvm, oldZvm)
    this._loading = true;
    await newZvm.queryThreads();
    await newZvm.queryBeads();
    this._loading = false;
  }


  /** */
  onClickCommentPp(maybeCommentThread: ActionHashB64 | null, ppAh: ActionHashB64, subjectName: string) {
    this.dispatchEvent(new CustomEvent<CommentRequest>('commenting-clicked', { detail: {maybeCommentThread, subjectHash: ppAh, subjectType: "ParticipationProtocol", subjectName, viewType: "side"}, bubbles: true, composed: true }));
  }

  /** */
  onClickCommentTopic(maybeCommentThread: ActionHashB64 | null, ah: ActionHashB64, subjectName: string) {
    this.dispatchEvent(new CustomEvent<CommentRequest>('commenting-clicked', { detail: {maybeCommentThread, subjectHash: ah, subjectType: SEMANTIC_TOPIC_TYPE_NAME, subjectName, viewType: "side"}, bubbles: true, composed: true }));
  }



  /** Render threads about entries in Threads DNA (other than semantic topics) */
  renderSubjectSubLister(subjectHash: AnyLinkableHashB64, subject: SubjectMat, myThreads: ActionHashB64[]) {
    const subjectThreads = this.perspective.threadsPerSubject[subjectHash];
    // FIXME
    return html`
            <div style="display:flex; flex-direction:column; gap:10px; padding:7px;">
                <div style="background: orange">${subject.typeName}: FIXME</div>
            </div>
        `;
  }


  /** */
  renderVinesSubLister(subjectHash: AnyLinkableHashB64, subject: SubjectMat, myThreads: ActionHashB64[]) {
    console.log("<my-threads-lister> subject", subjectHash);
    // /** Skip if hidden */
    // FIXME: Figure out how to know if its hidden or not
    // if (isHidden && !this.showArchivedTopics) {
    //   return;
    // }
    /** Render threads about entries in Threads DNA (other than semantic topics) */
    if (!this.perspective.allSemanticTopics[subjectHash] /* subject.typeName != "SemanticTopic" */) {
      return this.renderSubjectSubLister(subjectHash, subject, myThreads);
    }
    /** */
    return this.renderSemTopicSubLister(subjectHash, myThreads);
  }


  /** */
  renderSemTopicSubLister(topicHash: AnyLinkableHashB64, myThreads: ActionHashB64[]) {
    const [title, isHidden] = this.perspective.allSemanticTopics[topicHash];
    let threads = myThreads.map((ppAh) => {
      /** Render threads for Topic */
      const thread = this.perspective.threads.get(ppAh);
      if (!thread) {
        return html`<ui5-busy-indicator delay="0" size="Medium" active style="width:100%; height:100%;"></ui5-busy-indicator>`;
      }
      console.log("this.selectedThreadHash", this.selectedThreadHash, ppAh, this.selectedThreadHash == ppAh);
      const isSelected = this.selectedThreadHash && this.selectedThreadHash == ppAh;

      //const hasNewBeads = thread && thread.hasUnreads();
      const maybeUnreadThread = this.perspective.unreadThreads[ppAh];
      const hasNewBeads = maybeUnreadThread && maybeUnreadThread[1].length > 0;
      //console.log("hasUnreads() thread", ppAh, thread.latestSearchLogTime);
      const threadIsNew = Object.keys(this.perspective.newThreads).includes(ppAh);
      console.log("<my-threads-lister>.render() thread:", thread.pp.purpose, maybeUnreadThread);
      if (!thread.pp || (thread.isHidden && !this.showArchivedTopics) /*|| thread.pp.purpose == "comment"*/) {
        return html``;
      }

      /** Determine badge & buttons */
      const maybeCommentThread: ActionHashB64 | null = this._zvm.getCommentThreadForSubject(ppAh);
      let hasUnreadComments = false;
      if (maybeCommentThread != null) {
        hasUnreadComments = Object.keys(this._zvm.perspective.unreadThreads).includes(maybeCommentThread);
      }
      //console.log("<my-threads-view> maybeCommentThread", maybeCommentThread, hasUnreadComments);

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
      let badge = html`
            <ui5-badge>0</ui5-badge>`;
      let notifCount = this._zvm.getPpNotifs(ppAh).length;
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
            <sl-tooltip content=${thread.pp.purpose} style="--show-delay:1000">
                <div id=${ppAh} class="threadItem"
                     style="
                       font-weight:${hasNewBeads && !threadIsNew ? "bold" : "normal"}; 
                       ${threadIsNew || notifCount ? "color: #359C07;" : ""}
                       ${isSelected ? "background:#DBDBDB" : ""}
                       "
                     @click=${(e) => this.dispatchEvent(threadJumpEvent(ppAh))}>
                  ${badge}
                  <span style="flex-grow:1;margin-left:10px;margin-right:10px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;font-weight: ${hasNewBeads || isSelected ? "bold" : ""}">${thread.pp.purpose}</span>
                  <!-- ${hideShowBtn} -->
                  ${commentButton}
                </div>
            </sl-tooltip>
        `;
    })

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
        for (const topicPpAh of myThreads) {
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

    if (threads.length == 0) {
      threads = [html`<div class="threadItem">
                   <span style="margin-left:28px;margin-right:10px;color:grey">${msg('No threads found')}</span>
              </div>`];
    }

    /** render topic item */
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
            <div slot="header" style="display:flex; flex-direction:row; overflow:hidden;width: 100%; height: 36px;">
                <div style="flex-grow:1; height:18px; margin-top:8px; margin-right:10px; font-weight:${topicHasUnreads? "bold" : ""}; text-overflow:ellipsis; overflow:hidden;">${title}</div>
                <!-- ${topicBadge} -->
                <!-- ${topicHideBtn} -->                
                ${topicCommentButton}
                    <!--
                <ui5-button icon="add" tooltip="Create a new channel for this Topic" 
                            design="Transparent" 
                            style="color:grey"
                            @click=${async (e) => {
      e.stopPropagation(); //console.log("topic clicked:", title);
      await this.updateComplete;
      this.dispatchEvent(new CustomEvent('createThreadClicked', {detail: topicHash, bubbles: true, composed: true}));
    }}>
        </ui5-button>-->
    </div>
      <!-- threads -->              
      ${threads}
    </ui5-panel>`;
  }


  /** */
  render() {
    console.log("<my-threads-lister>.render()", this._loading, this.perspective.threads, this.cell.agentPubKey);

    if (this._loading) {
      return html`<ui5-busy-indicator delay="0" size="Medium" active style="margin:auto; width:100%; height:100%;"></ui5-busy-indicator>`;
    }

    /** Grab my threads */
    const myBeads= Object.entries(this.perspective.beads).filter(([ah, pair]) => pair[0].author == this.cell.agentPubKey);
    const myBeadThreads: Record<ActionHashB64, Thread> = {}
    myBeads.map(([beadAh, [beadInfo, typed]]) => myBeadThreads[beadInfo.bead.ppAh] = this.perspective.threads.get(beadInfo.bead.ppAh));

    const myThreads: Record<ActionHashB64, Thread> = {}
    Array.from(this.perspective.threads.entries())
      .filter(([h, thread]) => thread.author == this.cell.agentPubKey)
      .map(([h, thread]) => myThreads[h] = thread);

    console.log("<my-threads-lister>   count beads", Object.entries(this.perspective.beads).length, myBeads.length, myBeadThreads.length);
    console.log("<my-threads-lister> count threads", this.perspective.threads.size, myThreads.length);


    /** concat (and dedup) */
    const allThreads = Object.assign({}, myThreads, myBeadThreads);

    console.log("<my-threads-lister> myBeadThreads", myBeadThreads.length, myBeadThreads);
    console.log("<my-threads-lister> myThreads", myThreads.length, myThreads);
    console.log("<my-threads-lister> allThreads", allThreads.length, allThreads);

    /** appletId -> (subjectHash -> ppAh[]) */
    let allThreadsByApplet: Record<DnaHashB64, Dictionary<ActionHashB64[]>> = {};
    const allSubjects: Record<AnyLinkableHashB64, SubjectMat> = {}
      Object.entries(allThreads).map(([ppAh, thread]) => {
      if (!allThreadsByApplet[thread.pp.subject.appletId]) {
        allThreadsByApplet[thread.pp.subject.appletId] = {}
      }
      if (!allThreadsByApplet[thread.pp.subject.appletId][thread.pp.subject.hash]) {
        allThreadsByApplet[thread.pp.subject.appletId][thread.pp.subject.hash] = [];
      }
      allThreadsByApplet[thread.pp.subject.appletId][thread.pp.subject.hash].push(ppAh);
      allSubjects[thread.pp.subject.hash] = thread.pp.subject;
    });
    console.log("<my-threads-lister> allThreadsByApplet", allThreadsByApplet);

    /** Render each appletId */
    let appletSubListers = Object.entries(allThreadsByApplet).map(([appletId, appletThreads]) => {
      console.log("<my-threads-lister> appletId:", appletId);
      let appletSubLister = html``;
      let appletName = "Vines";
      if (appletId != THIS_APPLET_ID && appletId != this.weServices.appletId) {
        if (!this.weServices || !this.weServices.getAppletInfo(appletId)) {
          console.warn("Can't render threads from other applets without WeServices");
          return html`<div style="background: #d9d9d970;padding: 5px;color: #ff0000ba;">${msg('Unknown applet')}</div>`;
        }
        /** render other appletId threads */
        const appletInfo = this.weServices.getAppletInfo(appletId);
        appletName = appletInfo.appletName;
      } else {
        /** Render semantic topic threads */
        let subjectItems = Object.entries(appletThreads).map(([subjectHash, ppAhs]) => {
          const subject = allSubjects[subjectHash];
          return this.renderVinesSubLister(subjectHash, subject, ppAhs);
        });

        /** Handle empty sub-tree case */
        if (subjectItems.length == 0) {
          subjectItems = [html`
              <div style="display:flex; flex-direction:column; gap:10px; padding:7px;">
                  <div style="color: grey; margin: auto;">${msg('No subjects found')}</div>
              </div>
          `];
        }
        appletSubLister = html`${subjectItems}`;
      }

      /** render appletSubLister */
      return html`
          <ui5-panel>
              <div slot="header" style="font-weight: bold; color:grey;">${appletName}</div>
              ${appletSubLister}
          </ui5-panel>    
      `;
    });


    /** Handle empty tree case */
    if (appletSubListers.length == 0) {
      return html`
          <div style="display:flex; flex-direction:column; gap:10px; padding:7px;">
            <div style="color: grey; margin: auto;">${msg('No threads found')}</div>
          </div>
      `;
    }

    /** render all */
    return html`${appletSubListers}`
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
