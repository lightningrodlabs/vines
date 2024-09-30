import {css, html} from "lit";
import {customElement, property, state} from "lit/decorators.js";
import {msg} from "@lit/localize";
import {
  ActionId,
  ActionIdMap, AnyId,
  EntryId, EntryIdMap, intoAnyId,
  ZomeElement
} from "@ddd-qc/lit-happ";
import {WeServicesEx} from "@ddd-qc/we-utils";

import {ThreadsZvm} from "../../viewModels/threads.zvm";
import {ThreadsPerspective} from "../../viewModels/threads.perspective";
import {AnyIdMap} from "../../utils";
import {toasty} from "../../toast";
import {threadJumpEvent} from "../../events";
import {Thread} from "../../viewModels/thread";
import {consume} from "@lit/context";
import {filesContext, THIS_APPLET_ID, weClientContext} from "../../contexts";
import {Subject, ThreadsEntryType} from "../../bindings/threads.types";
import {FilesDvm} from "@ddd-qc/files";
import {sharedStyles} from "../../styles";


/**
 *
 */
@customElement("my-threads-lister")
export class MyThreadsLister extends ZomeElement<ThreadsPerspective, ThreadsZvm> {

  constructor() {
    super(ThreadsZvm.DEFAULT_ZOME_NAME);
  }

  /** -- Properties -- */

  @property() showArchivedSubjects?: string;

  @property() selectedThreadHash?: ActionId;

  @consume({ context: filesContext, subscribe: true })
  filesDvm!: FilesDvm;

  @consume({ context: weClientContext, subscribe: true })
  weServices!: WeServicesEx;

  @property({type: Boolean}) collapsed?: boolean = false;
  @state() private _loading = false;


  /** -- Methods -- */

  /** */
  protected override async zvmUpdated(newZvm: ThreadsZvm, oldZvm?: ThreadsZvm): Promise<void> {
    super.zvmUpdated(newZvm, oldZvm)
    this._loading = true;
    await newZvm.zomeProxy.queryAll();
    this._loading = false;
  }


  /** */
  renderSubjectSubLister(subjectId: AnyId, _subject: Subject, myThreads: ActionId[], /*title: string, isHidden: boolean*/) {
    let title = "";
    let threads = myThreads.map((ppAh) => {
      const thread = this.perspective.threads.get(ppAh);
      if (!thread) {
        return html`<ui5-busy-indicator delay="0" size="Medium" active style="width:100%; height:100%;"></ui5-busy-indicator>`;
      }
      console.log("this.selectedThreadHash", this.selectedThreadHash, ppAh);
      const isThreadHidden = this._zvm.perspective.hiddens[ppAh.b64]? this._zvm.perspective.hiddens[ppAh.b64] : false;
      const isSelected = this.selectedThreadHash && this.selectedThreadHash.equals(ppAh);
      title = thread.name;
      const maybeUnreadThread = this.perspective.unreadThreads.get(ppAh);
      const hasNewBeads = maybeUnreadThread && maybeUnreadThread[1].length > 0;
      const threadIsNew = this.perspective.newThreads.has(ppAh);
      console.log("<my-threads-lister>.render() thread:", thread.pp.purpose, maybeUnreadThread);
      if (!thread.pp || (isThreadHidden && !this.showArchivedSubjects) /*|| thread.pp.purpose == "comment"*/) {
        return html``;
      }

      /** Determine badge & buttons */
      // const maybeCommentThread: ActionId | null = this._zvm.perspective.getCommentThreadForSubject(ppAh);
      // let hasUnreadComments = false;
      // if (maybeCommentThread != null) {
      //   hasUnreadComments = this._zvm.perspective.unreadThreads.has(maybeCommentThread);
      // }
      //console.log("<my-threads-view> maybeCommentThread", maybeCommentThread, hasUnreadComments);

      let commentButton = html``;
      // if (hasUnreadComments) {
      //   commentButton = html`
      //         <ui5-button icon="comment" tooltip=${msg("View comments")}
      //                     style="border:none; display:none;"
      //                     design="Negative"
      //                     @click="${(e:any) => this.onClickCommentPp(maybeCommentThread, ppAh, thread.pp.purpose)}"></ui5-button>`;
      // } else {
      //   commentButton = maybeCommentThread != null
      //     ? html`
      //                 <ui5-button icon="comment" tooltip=${msg("View comments")} design="Transparent"
      //                             style="border:none; display:none;"
      //                             @click="${(e:any) => this.onClickCommentPp(maybeCommentThread, ppAh, thread.pp.purpose)}"></ui5-button>`
      //     : html`
      //                 <ui5-button icon="sys-add" tooltip=${msg("Create comment Thread")} design="Transparent"
      //                             style="border:none; display:none;"
      //                             @click="${(e:any) => this.onClickCommentPp(maybeCommentThread, ppAh, thread.pp.purpose)}"></ui5-button>`;
      // }

      /** 'new', 'notif' or 'unread' badge to display */
      let badge = html`
            <ui5-badge>0</ui5-badge>`;
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

      const hideShowBtn = this.showArchivedSubjects && isThreadHidden ?
        html`
              <ui5-button icon="show" tooltip="Show" design="Transparent"
                          class="showBtn"
                          @click=${async (_e:any) => {
          await this._zvm.unhideSubject(ppAh);
          toasty(`${msg("Unarchived Subject")} "${thread.pp.purpose}"`);
        }}></ui5-button>
          ` : html`
                    <ui5-button icon="hide" tooltip="Hide" design="Transparent"
                                class="showBtn"
                                @click=${async (_e:any) => {
          await this._zvm.hideSubject(ppAh);
          toasty(`${msg("Archived Subject")} "${thread.pp.purpose}"`);
        }}></ui5-button>`;

      return html`
            <sl-tooltip content=${thread.pp.purpose} style="--show-delay:1000">
                <div id=${ppAh.b64} class="threadItem"
                     style="
                       font-weight:${hasNewBeads && !threadIsNew ? "bold" : "normal"}; 
                       ${threadIsNew || notifCount ? "color: #359C07;" : ""}
                       ${isSelected ? "background:#DBDBDB" : ""}
                       "
                     @click=${(_e:any) => {
                        const jump = threadJumpEvent(ppAh);
                        this.dispatchEvent(jump);
                     }}>
                  ${badge}
                  <span style="flex-grow:1;margin-left:10px;margin-right:10px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;font-weight: ${hasNewBeads || isSelected ? "bold" : ""}">${thread.pp.purpose}</span>
                  <!-- ${hideShowBtn} -->
                  ${commentButton}
                </div>
            </sl-tooltip>
        `;
    })

    /* */
    const newSubjects = this._zvm.perspective.getNewSubjects();
    const unreadSubjects = this._zvm.perspective.getUnreadSubjects();

    /** Render Subject */
    //const maybeCommentThread: ActionId | null = this._zvm.perspective.getCommentThreadForSubject(subjectId);
    const subjectIsNew = newSubjects.get(subjectId.b64) != undefined;
    // let subjectHasUnreadComments = false;
    // if (maybeCommentThread != null) {
    //   subjectHasUnreadComments = unreadSubjects.map((id) => id.b64).includes(subjectId.b64);
    // }

    let subjectCommentButton = html``;
    // if (subjectHasUnreadComments) {
    //   subjectCommentButton = html`<ui5-button icon="comment" tooltip=${msg("View comments")}
    //                                          design="Negative" style="border:none;background: transparent"
    //                                          @click="${(e:any) => this.onClickCommentSubject(maybeCommentThread, subjectId, title, subject.typeName)}"></ui5-button>`;
    // } else {
    //   subjectCommentButton = maybeCommentThread != null
    //     ? html`
    //             <ui5-button id=${"cmt-" + subjectId.b64} icon="comment" tooltip=${msg("View comments")} design="Transparent"
    //                         style="border:none;display: none"
    //                         @click="${(e:any) => this.onClickCommentSubject(maybeCommentThread, subjectId, title, subject.typeName)}"></ui5-button>`
    //     : html`
    //             <ui5-button id=${"cmt-" + subjectId.b64} icon="sys-add" tooltip=${msg("Create comment thread for this Subject")} design="Transparent"
    //                         style="border:none; padding:0px;display: none"
    //                         @click="${(e:any) => this.onClickCommentSubject(maybeCommentThread, subjectId, title, subject.typeName)}"></ui5-button>`;
    // }

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
            count += this.perspective.unreadThreads.get(myThreadAh)![1].length;
          }
        }
        if (count > 0) {
          subjectBadge = html`<ui5-badge class="unreadBadge subjectBadge">${count}</ui5-badge>`;
        }
      }
    }

    const subjectHasUnreads = unreadSubjects.map((id) => id.b64).includes(subjectId.b64);

    if (threads.length == 0) {
      threads = [html`<div class="threadItem">
                   <span style="margin-left:28px;margin-right:10px;color:grey">${msg('No channels found')}</span>
              </div>`];
    }

    /** render subject sub-lister */
    return html`
          <ui5-panel id=${subjectId.b64} ?collapsed=${this.collapsed}
                     @mouseover=${(_e:any) => {
                        const hide = this.shadowRoot!.getElementById("hide-" + subjectId.b64);
                        const cmt = this.shadowRoot!.getElementById("cmt-" + subjectId.b64);
                        if (hide) hide.style.display = "block";
                        if (cmt) cmt.style.display = "block";
                     }}
                     @mouseout=${(_e:any) => {
                        const hide = this.shadowRoot!.getElementById("hide-" + subjectId.b64);
                        const cmt = this.shadowRoot!.getElementById("cmt-" + subjectId.b64);
                        if (hide) hide.style.display = "none";
                        if (cmt) cmt.style.display = "none";
                     }}>
            <!-- header -->
            <div slot="header" style="display:flex; flex-direction:row; overflow:hidden;width: 100%; height: 36px;">
                <div style="flex-grow:1; height:18px; margin-top:8px; margin-right:10px; font-weight:${subjectHasUnreads? "bold" : ""}; text-overflow:ellipsis; overflow:hidden;">${title}</div>
                <!-- ${subjectBadge} -->
                ${subjectCommentButton}
    </div>
      <!-- threads -->              
      ${threads}
    </ui5-panel>`;
  }


  /** */
  override render() {
    console.log("<my-threads-lister>.render()", this._loading, this.perspective.threads, this.cell.address.agentId.short);
    /** Grab my threads */
    const myBeads = Array.from(this.perspective.beads.values())
      .filter(([info, _typed]) => info.author.b64 == this.cell.address.agentId.b64)
      .filter(([info, _typed]) => info.beadType != ThreadsEntryType.EncryptedBead);
    const myBeadThreads: ActionIdMap<Thread> = new ActionIdMap();
    myBeads.map(([beadInfo, _typed]) => myBeadThreads.set(beadInfo.bead.ppAh, this.perspective.threads.get(beadInfo.bead.ppAh)!));

    const myThreads: ActionIdMap<Thread> = new ActionIdMap();
    Array.from(this.perspective.threads.entries())
      .filter(([_ah, thread]) => thread.author.b64 == this.cell.address.agentId.b64)
      .map(([ah, thread]) => myThreads.set(ah, thread));

    console.log("<my-threads-lister>   count beads", this.perspective.beads.size, myBeads.length, myBeadThreads.size);
    console.log("<my-threads-lister> count threads", this.perspective.threads.size, myThreads.size);
    console.log("<my-threads-lister> myBeadThreads", myBeadThreads.size, myBeadThreads);
    console.log("<my-threads-lister>     myThreads", myThreads.size, myThreads);

    /** concat (and dedup) */
    //const allThreads = Object.assign({}, myThreads, myBeadThreads);
    const allThreads = new ActionIdMap([...myThreads, ...myBeadThreads]);
    console.log("<my-threads-lister> allThreads", allThreads.size, allThreads);

    /** appletId -> (subjectHash -> ppAh[]) */
    let allThreadsByApplet: EntryIdMap<AnyIdMap<ActionId[]>> = new EntryIdMap();
    const allSubjects: AnyIdMap<Subject> = new AnyIdMap();
    Array.from(allThreads.entries()).map(([ppAh, thread]) => {
      let appletId = thread.pp.subject.appletId;
      if (!appletId) {
        //appletId = THIS_APPLET_ID;
        return;
      }
      const appletEh = new EntryId(appletId);
      if (!allThreadsByApplet.get(appletEh)) {
        allThreadsByApplet.set(appletEh, new AnyIdMap())
      }
      if (!allThreadsByApplet.get(appletEh)!.get(thread.pp.subject.address)) {
        allThreadsByApplet.get(appletEh)!.set(thread.pp.subject.address, []);
      }
      allThreadsByApplet.get(appletEh)!.get(thread.pp.subject.address)!.push(ppAh);
      allSubjects.set(thread.pp.subject.address, thread.pp.subject);
    });
    console.log("<my-threads-lister> allThreadsByApplet", allThreadsByApplet);

    /** Render each appletId */
    const unreadSubjects = this._zvm.perspective.getUnreadSubjects();
    let appletSubListers = Array.from(allThreadsByApplet.entries()).map(([appletId, appletThreads]) => {
      console.log("<my-threads-lister> appletId:", appletId);
      let appletSubLister = html``;
      let appletName = "Vines";
      if (!appletId.equals(THIS_APPLET_ID) || (this.weServices && !appletId.equals(this.weServices.appletIds[0]!))) {
        if (!this.weServices || !this.weServices.appletInfoCached(appletId)) {
          console.warn("Can't render threads from other applets without WeServices");
          return html`<div style="background: #d9d9d970;padding: 5px;color: #ff0000ba;">${msg('Unknown Tool')}</div>`;
        }
        /** render other appletId threads */
        const appletInfo = this.weServices.appletInfoCached(appletId);
        if (appletInfo) {
          appletName = appletInfo.appletName;
        }
      }

      /** Render applet subjects */
      let subjectItems = Array.from(appletThreads.entries()).map(([subjectHash, ppAhs]) => {
        const subject = allSubjects.get(subjectHash);
        return subject? this.renderSubjectSubLister(intoAnyId(subjectHash), subject, ppAhs) : html``;
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
      const maybeCommentThread: ActionId | null = this._zvm.perspective.getCommentThreadForSubject(appletId);
      let appletHasUnreadComments = false;
      if (maybeCommentThread != null) {
        appletHasUnreadComments = unreadSubjects.map((id) => id.b64).includes(appletId.b64);
      }
      let appletCommentBtn = html``;
      // if (appletHasUnreadComments) {
      //   appletCommentBtn = html`<ui5-button icon="comment" tooltip=${msg("View comments")}
      //                                        design="Negative" style="border:none; background:transparent"
      //                                        @click="${(e:any) => this.onClickCommentAppletId(maybeCommentThread, appletId, appletName)}"></ui5-button>`;
      // } else {
      //   appletCommentBtn = maybeCommentThread != null
      //     ? html`
      //           <ui5-button id=${"cmt-" + appletId.b64} icon="comment" tooltip=${msg("View comments")} design="Transparent"
      //                       style="border:none; display:none"
      //                       @click="${(e:any) => this.onClickCommentAppletId(maybeCommentThread, appletId, appletName)}"></ui5-button>`
      //     : html`
      //           <ui5-button id=${"cmt-" + appletId.b64} icon="sys-add" tooltip=${msg("Create comment thread for this Applet")} design="Transparent"
      //                       style="border:none; padding:0px; display:none"
      //                       @click="${(e:any) => this.onClickCommentAppletId(maybeCommentThread, appletId, appletName)}"></ui5-button>`;
      // }


      /** render appletSubLister */
      return html`
          <ui5-panel id=${appletId.b64} ?collapsed=${this.collapsed}
                     @mouseover=${(_e:any) => {
                         const hide = this.shadowRoot!.getElementById("hide-" + appletId.b64);
                         const cmt = this.shadowRoot!.getElementById("cmt-" + appletId.b64);
                         if (hide) hide.style.display = "block";
                         if (cmt) cmt.style.display = "block";
                     }}
                     @mouseout=${(_e:any) => {
                         const hide = this.shadowRoot!.getElementById("hide-" + appletId.b64);
                         const cmt = this.shadowRoot!.getElementById("cmt-" + appletId.b64);
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
            <div style="color: grey; margin: auto;">${msg('No channels found')}</div>
          </div>
      `;
    }

    if (this._loading)  {
      this.style.background = "#ececec";
    } else {
      this.style.background = "inherit";
    }

    /** render all */
    return html`${appletSubListers}`
  }



  /** */
  static override get styles() {
    return [
      sharedStyles,
      css`
        :host {
          display: block;
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
