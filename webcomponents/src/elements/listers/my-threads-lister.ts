import {css, html} from "lit";
import {customElement, property, state} from "lit/decorators.js";
import {msg} from "@lit/localize";
import {
  ActionId,
  ActionIdMap,
  Dictionary,
  DnaId,
  DnaIdMap,
  EntryId, EntryIdMap,
  LinkableId,
  LinkableIdMap,
  ZomeElement
} from "@ddd-qc/lit-happ";
import {WeServicesEx} from "@ddd-qc/we-utils";

import {ThreadsZvm} from "../../viewModels/threads.zvm";
import {SubjectMat, ThreadsPerspective} from "../../viewModels/threads.perspective";
import {CommentRequest} from "../../utils";
import {toasty} from "../../toast";
import {threadJumpEvent} from "../../jump";
import {Thread} from "../../viewModels/thread";
import {consume} from "@lit/context";
import {APPLET_TYPE_NAME, globaFilesContext, THIS_APPLET_ID, weClientContext} from "../../contexts";
import {ThreadsEntryType} from "../../bindings/threads.types";
import {FilesDvm} from "@ddd-qc/files";


/**
 *
 */
@customElement("my-threads-lister")
export class MyThreadsLister extends ZomeElement<ThreadsPerspective, ThreadsZvm> {

  constructor() {
    super(ThreadsZvm.DEFAULT_ZOME_NAME);
  }

  @property() showArchivedSubjects?: string;

  @property() selectedThreadHash?: ActionId;

  @consume({ context: globaFilesContext, subscribe: true })
  filesDvm!: FilesDvm;

  @consume({ context: weClientContext, subscribe: true })
  weServices!: WeServicesEx;

  @state() private _loading = false;


  /** */
  protected async zvmUpdated(newZvm: ThreadsZvm, oldZvm?: ThreadsZvm): Promise<void> {
    super.zvmUpdated(newZvm, oldZvm)
    this._loading = true;
    await newZvm.zomeProxy.queryAll();
    //await newZvm.queryThreads();
    //await newZvm.queryBeads();
    this._loading = false;
  }


  /** */
  onClickCommentPp(maybeCommentThread: ActionId | null, ppAh: ActionId, subjectName: string) {
    this.dispatchEvent(new CustomEvent<CommentRequest>('commenting-clicked', { detail: {maybeCommentThread, subjectHash: ppAh, subjectType: ThreadsEntryType.ParticipationProtocol, subjectName, viewType: "side"}, bubbles: true, composed: true }));
  }

  /** */
  onClickCommentSubject(maybeCommentThread: ActionId | null, lh: LinkableId, subjectName: string, subjectType: string) {
    this.dispatchEvent(new CustomEvent<CommentRequest>('commenting-clicked', { detail: {maybeCommentThread, subjectHash: lh, subjectType, subjectName, viewType: "side"}, bubbles: true, composed: true }));
  }

  /** */
  onClickCommentAppletId(maybeCommentThread: ActionId | null, appletId: EntryId, appletName: string) {
    this.dispatchEvent(new CustomEvent<CommentRequest>('commenting-clicked', { detail: {maybeCommentThread, subjectHash: appletId, subjectType: APPLET_TYPE_NAME, subjectName: appletName, viewType: "side"}, bubbles: true, composed: true }));
  }


  /** */
  renderSubjectSubLister(subjectHash: LinkableId, subject: SubjectMat, myThreads: ActionId[], /*title: string, isHidden: boolean*/) {
    const isSubjectHidden = this._zvm.perspective.hiddens[subjectHash.b64]? this._zvm.perspective.hiddens[subjectHash.b64] : false;
    let title = "";
    let threads = myThreads.map((ppAh) => {
      const thread = this.perspective.threads.get(ppAh);
      if (!thread) {
        return html`<ui5-busy-indicator delay="0" size="Medium" active style="width:100%; height:100%;"></ui5-busy-indicator>`;
      }
      console.log("this.selectedThreadHash", this.selectedThreadHash, ppAh, this.selectedThreadHash == ppAh);
      const isThreadHidden = this._zvm.perspective.hiddens[ppAh.b64]? this._zvm.perspective.hiddens[ppAh.b64] : false;
      const isSelected = this.selectedThreadHash && this.selectedThreadHash == ppAh;
      title = thread.name;
      //const hasNewBeads = thread && thread.hasUnreads();
      const maybeUnreadThread = this.perspective.unreadThreads.get(ppAh);
      const hasNewBeads = maybeUnreadThread && maybeUnreadThread[1].length > 0;
      //console.log("hasUnreads() thread", ppAh, thread.latestSearchLogTime);
      const threadIsNew = this.perspective.newThreads.has(ppAh);
      console.log("<my-threads-lister>.render() thread:", thread.pp.purpose, maybeUnreadThread);
      if (!thread.pp || (isThreadHidden && !this.showArchivedSubjects) /*|| thread.pp.purpose == "comment"*/) {
        return html``;
      }

      /** Determine badge & buttons */
      const maybeCommentThread: ActionId | null = this._zvm.getCommentThreadForSubject(ppAh);
      let hasUnreadComments = false;
      if (maybeCommentThread != null) {
        hasUnreadComments = this._zvm.perspective.unreadThreads.has(maybeCommentThread);
      }
      //console.log("<my-threads-view> maybeCommentThread", maybeCommentThread, hasUnreadComments);

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
                                  @click="${(e) => this.onClickCommentPp(maybeCommentThread, ppAh, thread.pp.purpose)}"></ui5-button>`
          : html`
                      <ui5-button icon="sys-add" tooltip=${msg("Create comment Thread")} design="Transparent"
                                  style="border:none; display:none;"
                                  @click="${(e) => this.onClickCommentPp(maybeCommentThread, ppAh, thread.pp.purpose)}"></ui5-button>`;
      }

      /** 'new', 'notif' or 'unread' badge to display */
      let badge = html`
            <ui5-badge>0</ui5-badge>`;
      let notifCount = this._zvm.getAllNotificationsForPp(ppAh).length;
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

      const hideShowBtn = this.showArchivedSubjects && isThreadHidden ?
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
                <div id=${ppAh.b64} class="threadItem"
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

    /** Render Subject */
    const maybeCommentThread: ActionId | null = this._zvm.getCommentThreadForSubject(subjectHash);
    const subjectIsNew = newSubjects.get(subjectHash) != undefined;
    let subjectHasUnreadComments = false;
    if (maybeCommentThread != null) {
      subjectHasUnreadComments = unreadSubjects.includes(subjectHash);
    }

    let subjectCommentButton = html``;
    if (subjectHasUnreadComments) {
      subjectCommentButton = html`<ui5-button icon="comment" tooltip=${msg("View comments")}
                                             design="Negative" style="border:none;background: transparent"
                                             @click="${(e) => this.onClickCommentSubject(maybeCommentThread, subjectHash, title, subject.typeName)}"></ui5-button>`;
    } else {
      subjectCommentButton = maybeCommentThread != null
        ? html`
                <ui5-button id=${"cmt-" + subjectHash.b64} icon="comment" tooltip=${msg("View comments")} design="Transparent" 
                            style="border:none;display: none"
                            @click="${(e) => this.onClickCommentSubject(maybeCommentThread, subjectHash, title, subject.typeName)}"></ui5-button>`
        : html`
                <ui5-button id=${"cmt-" + subjectHash.b64} icon="sys-add" tooltip=${msg("Create comment thread for this Subject")} design="Transparent"
                            style="border:none; padding:0px;display: none" 
                            @click="${(e) => this.onClickCommentSubject(maybeCommentThread, subjectHash, title, subject.typeName)}"></ui5-button>`;
    }

    /** 'new', 'notif' and 'unread' badge to display */
    let subjectBadge = html``;
    if (subjectIsNew) {
      subjectBadge = html`<ui5-badge class="notifBadge subjectBadge">New</ui5-badge>`;
    } else {
      let notifCount = 0; // FIXME: Get real notif count
      if (notifCount > 0) {
        subjectBadge = html`<ui5-badge class="notifBadge subjectBadge">${notifCount}</ui5-badge>`;
      } else {
        /** Agregate count of unread beads on all subject's threads */
        let count = 0;
        for (const myThreadAh of myThreads) {
          if (this.perspective.unreadThreads.get(myThreadAh)) {
            count += this.perspective.unreadThreads.get(myThreadAh)[1].length;
          }
        }
        if (count > 0) {
          subjectBadge = html`<ui5-badge class="unreadBadge subjectBadge">${count}</ui5-badge>`;
        }
      }
    }

    const subjectHideBtn = this.showArchivedSubjects && isSubjectHidden ? html`
          <ui5-button id=${"hide-" + subjectHash.b64} icon="show" tooltip="Show" design="Transparent"
                      style="border:none; padding:0px;display:none;"
                      @click="${async (e) => {
      await this._zvm.unhideSubject(subjectHash);
      toasty(`Unarchived Subject "${title}"`)
    }}"></ui5-button>
      ` : html`
          <ui5-button id=${"hide-" + subjectHash.b64} icon="hide" tooltip="Hide" design="Transparent"
                      style="border:none; padding:0px;display:none;"
                      @click="${async (e) => {
      await this._zvm.hideSubject(subjectHash);
      toasty(`Archived Subject "${title}"`)
    }}"></ui5-button>
      `;

    const subjectHasUnreads = unreadSubjects.includes(subjectHash);

    if (threads.length == 0) {
      threads = [html`<div class="threadItem">
                   <span style="margin-left:28px;margin-right:10px;color:grey">${msg('No threads found')}</span>
              </div>`];
    }

    /** render subject sub-lister */
    return html`
          <ui5-panel id=${subjectHash.b64}
                     @mouseover=${(e) => {
                        const hide = this.shadowRoot.getElementById("hide-"+subjectHash);
                        const cmt = this.shadowRoot.getElementById("cmt-"+subjectHash);
                        if (hide) hide.style.display = "block";
                        if (cmt) cmt.style.display = "block";
                     }}
                     @mouseout=${(e) => {
                        const hide = this.shadowRoot.getElementById("hide-"+subjectHash);
                        const cmt = this.shadowRoot.getElementById("cmt-"+subjectHash);
                        if (hide) hide.style.display = "none";
                        if (cmt) cmt.style.display = "none";
                     }}>
            <!-- header -->
            <div slot="header" style="display:flex; flex-direction:row; overflow:hidden;width: 100%; height: 36px;">
                <div style="flex-grow:1; height:18px; margin-top:8px; margin-right:10px; font-weight:${subjectHasUnreads? "bold" : ""}; text-overflow:ellipsis; overflow:hidden;">${title}</div>
                <!-- ${subjectBadge} -->
                <!-- ${subjectHideBtn} -->                
                ${subjectCommentButton}
    </div>
      <!-- threads -->              
      ${threads}
    </ui5-panel>`;
  }


  /** */
  render() {
    console.log("<my-threads-lister>.render()", this._loading, this.perspective.threads, this.cell.agentId.short);

    // if (this._loading) {
    //   return html`<ui5-busy-indicator delay="0" size="Medium" active style="margin:auto; width:100%; height:100%;"></ui5-busy-indicator>`;
    // }

    /** Grab my threads */
    const myBeads = Array.from(this.perspective.beads.values())
      .filter(([info, _typed]) => info.author.b64 == this.cell.agentId.b64)
      .filter(([info, _typed]) => info.beadType != ThreadsEntryType.EncryptedBead);
    const myBeadThreads: ActionIdMap<Thread> = new ActionIdMap();
    myBeads.map(([beadInfo, _typed]) => myBeadThreads.set(beadInfo.bead.ppAh, this.perspective.threads.get(beadInfo.bead.ppAh)));

    const myThreads: ActionIdMap<Thread> = new ActionIdMap();
    Array.from(this.perspective.threads.entries())
      .filter(([_ah, thread]) => thread.author.b64 == this.cell.agentId.b64)
      .map(([ah, thread]) => myThreads.set(ah, thread));

    console.log("<my-threads-lister>   count beads", Object.entries(this.perspective.beads).length, myBeads.length, myBeadThreads.size);
    console.log("<my-threads-lister> count threads", this.perspective.threads.size, myThreads.size);


    /** concat (and dedup) */
    const allThreads = Object.assign({}, myThreads, myBeadThreads);

    console.log("<my-threads-lister> myBeadThreads", myBeadThreads.size, myBeadThreads);
    console.log("<my-threads-lister> myThreads", myThreads.size, myThreads);
    console.log("<my-threads-lister> allThreads", allThreads.size, allThreads);

    /** appletId -> (subjectHash -> ppAh[]) */
    let allThreadsByApplet: EntryIdMap<LinkableIdMap<ActionId[]>> = new EntryIdMap();
    const allSubjects: LinkableIdMap<SubjectMat> = new LinkableIdMap();
    Array.from(allThreads.entries()).map(([ppAh, thread]) => {
      let appletId = thread.pp.subject.appletId;
      if (!appletId) {
        //appletId = THIS_APPLET_ID;
        return;
      }
      if (!allThreadsByApplet.get(appletId)) {
        allThreadsByApplet.set(appletId, new LinkableIdMap())
      }
      if (!allThreadsByApplet.get(appletId).get(thread.pp.subject.hash)) {
        allThreadsByApplet.get(appletId).set(thread.pp.subject.hash, []);
      }
      allThreadsByApplet.get(appletId).get(thread.pp.subject.hash).push(ppAh);
      allSubjects.set(thread.pp.subject.hash, thread.pp.subject);
    });
    console.log("<my-threads-lister> allThreadsByApplet", allThreadsByApplet);

    /** Render each appletId */
    const unreadSubjects = this._zvm.getUnreadSubjects();
    let appletSubListers = Array.from(allThreadsByApplet.entries()).map(([appletId, appletThreads]) => {
      console.log("<my-threads-lister> appletId:", appletId);
      let appletSubLister = html``;
      let appletName = "Vines";
      if (appletId.b64 != THIS_APPLET_ID.b64 && appletId.b64 != this.weServices.appletId) {
        if (!this.weServices || !this.weServices.appletInfoCached(appletId)) {
          console.warn("Can't render threads from other applets without WeServices");
          return html`<div style="background: #d9d9d970;padding: 5px;color: #ff0000ba;">${msg('Unknown applet')}</div>`;
        }
        /** render other appletId threads */
        const appletInfo = this.weServices.appletInfoCached(appletId);
        appletName = appletInfo.appletName;
      }

      /** Render applet subjects */
      let subjectItems = Array.from(appletThreads.entries()).map(([subjectHash, ppAhs]) => {
        const subject = allSubjects.get(subjectHash);
        return this.renderSubjectSubLister(subjectHash, subject, ppAhs);
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

      /** Render Applet */
      const maybeCommentThread: ActionId | null = this._zvm.getCommentThreadForSubject(appletId);
      let appletHasUnreadComments = false;
      if (maybeCommentThread != null) {
        appletHasUnreadComments = unreadSubjects.includes(appletId);
      }
      let appletCommentBtn = html``;
      if (appletHasUnreadComments) {
        appletCommentBtn = html`<ui5-button icon="comment" tooltip=${msg("View comments")}
                                             design="Negative" style="border:none; background:transparent"
                                             @click="${(e) => this.onClickCommentAppletId(maybeCommentThread, appletId, appletName)}"></ui5-button>`;
      } else {
        appletCommentBtn = maybeCommentThread != null
          ? html`
                <ui5-button id=${"cmt-" + appletId.b64} icon="comment" tooltip=${msg("View comments")} design="Transparent" 
                            style="border:none; display:none"
                            @click="${(e) => this.onClickCommentAppletId(maybeCommentThread, appletId, appletName)}"></ui5-button>`
          : html`
                <ui5-button id=${"cmt-" + appletId.b64} icon="sys-add" tooltip=${msg("Create comment thread for this Applet")} design="Transparent"
                            style="border:none; padding:0px; display:none" 
                            @click="${(e) => this.onClickCommentAppletId(maybeCommentThread, appletId, appletName)}"></ui5-button>`;
      }


      /** render appletSubLister */
      return html`
          <ui5-panel id=${appletId.b64}
                     @mouseover=${(e) => {
                         const hide = this.shadowRoot.getElementById("hide-"+appletId);
                         const cmt = this.shadowRoot.getElementById("cmt-"+appletId);
                         if (hide) hide.style.display = "block";
                         if (cmt) cmt.style.display = "block";
                     }}
                     @mouseout=${(e) => {
                         const hide = this.shadowRoot.getElementById("hide-"+appletId);
                         const cmt = this.shadowRoot.getElementById("cmt-"+appletId);
                         if (hide) hide.style.display = "none";
                         if (cmt) cmt.style.display = "none";
                     }}>
              <div slot="header" style="display:flex; flex-direction:row; overflow:hidden; width:100%; height:36px; font-size:18px; color:#663ef7">
                  <div style="flex-grow:1; height:18px; margin-top:8px; margin-right:10px; font-weight:${appletHasUnreadComments? "bold" : ""}; text-overflow:ellipsis; overflow:hidden;">${appletName}</div>
                  ${appletCommentBtn}
              </div>
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

    if (this._loading)  {
      this.style.background = "#ececec";
    } else {
      this.style.background = "#FBFCFD";
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
