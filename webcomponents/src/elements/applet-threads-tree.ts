import {css, html, PropertyValues, render} from "lit";
import {customElement, property, state} from "lit/decorators.js";
import {consume} from "@lit/context";

import {ActionHashB64, decodeHashFromBase64, EntryHashB64} from "@holochain/client";

import {AppletId, AttachmentType, Hrl, WeServices} from "@lightningrodlabs/we-applet";

import {Dictionary} from "@ddd-qc/cell-proxy";
import {ZomeElement} from "@ddd-qc/lit-happ";

import {ThreadsZvm} from "../viewModels/threads.zvm";
import {AnyLinkableHashB64, ThreadsPerspective} from "../viewModels/threads.perspective";
import {ThreadsEntryType} from "../bindings/threads.types";
import {CommentRequest} from "../utils";

/** @ui5/webcomponents */
import "@ui5/webcomponents/dist/Tree.js"
import TreeItem from "@ui5/webcomponents/dist/TreeItem";
import "@ui5/webcomponents/dist/TreeItem.js";
import "@ui5/webcomponents/dist/TreeItemCustom.js";
import BusyIndicator from "@ui5/webcomponents/dist/BusyIndicator";
import "@ui5/webcomponents/dist/BusyIndicator.js";
import "@ui5/webcomponents/dist/StandardListItem.js";
import "@ui5/webcomponents/dist/CustomListItem.js";
import {weClientContext} from "../contexts";
import {threadJumpEvent} from "../jump";


/**
 * @element
 */
@customElement("applet-threads-tree")
export class AppletThreadsTree extends ZomeElement<ThreadsPerspective, ThreadsZvm> {

  constructor() {
    super(ThreadsZvm.DEFAULT_ZOME_NAME);
  }

  /** ID of the applet to display threads of */
  @property() appletId: AppletId = ''


  @consume({ context: weClientContext, subscribe: true })
  weServices!: WeServices;

  /** -- State variables -- */

  @state() private _loading = false;
  @state() private _isHovered: Dictionary<boolean> = {};


  /**
   * In zvmUpdated() this._zvm is not already set!
   * Subscribe to ThreadsZvm
   */
  protected async zvmUpdated(newZvm: ThreadsZvm, oldZvm?: ThreadsZvm): Promise<void> {
    console.log("<applet-threads-tree>.zvmUpdated()");
    this._loading = true;
    await newZvm.probeSubjectTypes(this.appletId);
    this._loading = false;
  }

  /** */
  protected async willUpdate(changedProperties: PropertyValues<this>) {
    super.willUpdate(changedProperties);
    //console.log("<applet-threads-tree>.willUpdate()", changedProperties, !!this._zvm, this.dnaHash);
    if (changedProperties.has("appletId") && this._zvm) {
      this._loading = true;
      await this._zvm.probeSubjectTypes(this.appletId);
      this._loading = false;
    }
  }


  private _threadAttachmentType?: AttachmentType;

  /** Search for Threads attachmentType in based on _appInfoMap */
  getThreadAttachmentType(): AttachmentType | undefined {
    if (this._threadAttachmentType) {
      return this._threadAttachmentType;
    }
    // let threadsAppletId = undefined;
    // for (const [appletId, appInfo] of Object.entries(this._appInfoMap)) {
    //   if (appInfo.appletName == "Threads") {
    //     threadsAppletId = appletId;
    //     break;
    //   }
    // }
    // if (!threadsAppletId) {
    //   console.warn("Did not find Threads applet");
    //   return undefined;
    // }
    for (const [_appletHash, atts] of this.weServices.attachmentTypes.entries()) {
      //if (encodeHashToBase64(appletId) == threadsAppletId) {
      for (const [attName, att] of Object.entries(atts)) {
        if (attName == "thread") {
          this._threadAttachmentType = att;
          return att;
        }
      }
    }
    console.warn("Did not find 'thread' attachmentType in WeServices");
    return undefined;
  }


  /** */
  async openCommentThread(hash: ActionHashB64 | EntryHashB64, subjectType: string, subjectName: string): Promise<void> {
    console.log("openCommentThread()", hash);
    const attType = this.getThreadAttachmentType();
    if (!attType) {
      console.error("Thread attachmentType not found");
      return;
    }
    const spaceHrl: Hrl = [decodeHashFromBase64(this.cell.dnaHash), decodeHashFromBase64(hash)];
    const hrlc = {hrl: spaceHrl, context: {subjectType, subjectName}}
    const res = await attType.create(hrlc);
    console.log("Create/Open Thread result:", res);
    res.context.subjectType = subjectType;
    res.context.subjectName = subjectName;
    this.weServices.openHrl({hrl: res.hrl, context: res.context});
  }


  /** */
  async clickTree(event) {
    console.log("<applet-threads-tree> click event:", event.detail.item);
    let type;
    switch (event.detail.item.level) {
      case 3: type = ThreadsEntryType.ParticipationProtocol; break;
      case 2: type = "Subject"; break;
      case 1:
      default:
        type = "SubjectType"; break;

    }

    /** DEBUG Attachment View */
    //await this.openCommentThread(event.detail.item.id, type, event.detail.item.text);

    if (type == ThreadsEntryType.ParticipationProtocol) {
      await this.updateComplete;
      this.dispatchEvent(threadJumpEvent(event.detail.item.id));
    }

  }


  /** */
  onClickComment(maybeCommentThread: ActionHashB64 | null, subjectHash: ActionHashB64, subjectType: string, subjectName: string, viewType?: string) {
    const request: CommentRequest =  {
      maybeCommentThread, subjectHash, subjectType, subjectName,
      viewType: viewType? viewType : "side",
    };
    this.dispatchEvent(new CustomEvent<CommentRequest>('commenting-clicked', { detail: request, bubbles: true, composed: true }));
  }


  /** */
  async toggleTreeItem(event: any, unreadSubjects: AnyLinkableHashB64[]) {
    const busyIndicator = this.shadowRoot.getElementById("busy") as BusyIndicator;
    const toggledTreeItem = event.detail.item as TreeItem ; // get the node that is toggled
    //const isTyped = !!this.root && typeof this.root == 'object';
    //const isTyped = !!toggledTreeItem.getAttribute("linkIndex");

    console.log("<applet-threads-tree>.toggleTreeItem()", toggledTreeItem);

    event.preventDefault(); // do not let the toggle button switch yet
    busyIndicator.active = true; // block the tree from the user

    /** Keep already existing children */
    let currentChildren = [];
    for (const item of toggledTreeItem.items) {
      currentChildren.push((item as TreeItem).id);
    }
    //console.log("toggleTreeItem() currentItemTexts", currentItemTexts);

    /** SubjectType has been toggled */
    if (event.detail.item.level == 1) {
      /** Grab children */
      let subjects = await this._zvm.probeSubjects(this.appletId, toggledTreeItem.id);
      console.log("this.weServices", this.weServices);
      if (!this.weServices) {
        console.warn("weServices not found in <applet-threads-tree>")
      }
      /** Convert to TreeItem and append to Tree */
      for (const [dnaHash, subjectHash] of subjects) {
        /* Skip if item already exists */
        if (currentChildren.includes(subjectHash)) {
          continue;
        }
        let newItem = document.createElement("ui5-tree-item") as TreeItem;
        newItem.text = subjectHash;
        if (this.weServices) {
          //const dnaHash = toggledTreeItem['dnaHash'];
          console.log("calling weServices.attachableInfo()", dnaHash, subjectHash);
          try {
            const attachableInfo = await this.weServices.attachableInfo({hrl: [decodeHashFromBase64(dnaHash), decodeHashFromBase64(subjectHash)], context: null});
            console.log("attachableInfo", attachableInfo);
            if (attachableInfo) {
              newItem.text = attachableInfo.attachableInfo.name;
            }
          } catch(e) {
            console.error("Couldn't find attachableInfo:", e);
          }
        }
        //newItem.additionalText = "[" + ta.anchor + "]";
        //newItem.setAttribute("dnaHash", dnaHash);
        //newItem.setAttribute("zomeIndex", ta.zomeIndex.toString());
        //newItem.setAttribute("linkIndex", ta.linkIndex.toString());
        newItem.id = subjectHash;
        newItem.hasChildren = true;
        newItem.level = toggledTreeItem.level + 1;
        toggledTreeItem.appendChild(newItem);
      }
    }

    /** SubjectHash has been toggled */
    if (event.detail.item.level == 2) {
      /** Grab children */
      let pps = await this._zvm.probeSubjectThreads(toggledTreeItem.id);

      const tmpls = [];
      /** Convert to TreeItem and append to Tree */
      for (const [ppAh, pp] of Object.entries(pps)) {
        /* Skip if item already exists */
        if (currentChildren.includes(ppAh)) {
          continue;
        }

        // Simple tree-item
        //const tmpl = html`<ui5-tree-item id=${ppAh} text=${pp.purpose} level=${toggledTreeItem.level + 1}></ui5-tree-item>`;


        const maybeCommentThread = this._zvm.getCommentThreadForSubject(ppAh);
        const hasUnreadComments = unreadSubjects.includes(ppAh);
        const threadIsNew = this.perspective.newThreads[ppAh] != undefined;
        const hasNewBeads = Object.keys(this.perspective.unreadThreads).includes(ppAh);

        /** 'new' badge to display */
        let newBadge = html``;
        if (threadIsNew) {
          newBadge = html`<ui5-badge color-scheme="3" style="margin-top:10px; color:brown;">+1</ui5-badge>`;
        }

        const tmpl = html`
          <ui5-tree-item-custom id=${ppAh} level=${toggledTreeItem.level + 1}>
            <span slot="content" style="display:flex;overflow: hidden;font-weight:${hasNewBeads && !threadIsNew? "bold" : "normal"}">
                ${pp.purpose}
                ${newBadge}
            </span>
          </ui5-tree-item-custom>
        `;


        tmpls.push(tmpl);
      }
      render(tmpls, toggledTreeItem);
    }

    /** Done */
    toggledTreeItem.toggle(); // manually switch the toggle button
    busyIndicator.active = false;
  }


  /** */
  render() {
    console.log("<applet-threads-tree>.render()", this.appletId);
    if (this.appletId == "") {
      return html `<div>No Applet selected</div>`;
    }
    if (this._loading) {
      return html `<div>Loading subject types</div>`;
    }

    let subjectTypes = this.perspective.appletSubjectTypes[this.appletId];
    if (!subjectTypes) {
      subjectTypes = {};
    }

    // FIXME: Reset tree on update() or fix bug with subjects not under the correct update when adding new SubjectTypes live

    /* */
    const newSubjects = this._zvm.getNewSubjects();
    const unreadSubjects = this._zvm.getUnreadSubjects();

    let treeItems = Object.entries(subjectTypes).map(([pathHash, subjectType]) => {
      /** Render SubjectTypes */
      const maybeCommentThread = this._zvm.getCommentThreadForSubject(pathHash);
      const isUnread = Object.keys(this._zvm.perspective.unreadThreads).includes(maybeCommentThread);
      const topicIsNew = newSubjects[pathHash] != undefined;

      let commentButton = html``;
      if (isUnread) {
        commentButton = html`<ui5-button icon="comment" tooltip="View Thread" 
                                             design="Negative" class=${this._isHovered[pathHash]? "" : "transBtn"}
                                             @click="${(e) => this.onClickComment(maybeCommentThread, pathHash, "SubjectType", subjectType)}"></ui5-button>`;
      } else {
        if (this._isHovered[pathHash]) {
          commentButton = html`
              <ui5-button icon=${maybeCommentThread? "comment" : "sys-add"} tooltip="${maybeCommentThread?"View Thread" : "Create new Thread"}"
                          design="Transparent"
                          @click="${(e) => this.onClickComment(maybeCommentThread, pathHash, "SubjectType", subjectType)}"></ui5-button>`
        }
      }

      /** 'new' badge to display */
      let newBadge = html``;
      if (topicIsNew) {
        newBadge = html`<ui5-badge color-scheme="3" style="margin-top:10px; color:brown;">+1</ui5-badge>`;
      }

      //const topicHasUnreads = this.perspective.unreadSubjects.includes(topicHash);
      return html`<ui5-tree-item-custom id=${pathHash} level="1" has-children>
          <div slot="content" style="display:flex;align-items:center;font-weight:normal;text-decoration:none;">
              <span>${subjectType}</span>
              ${commentButton}
              ${newBadge}
          </div>
      </ui5-tree-item-custom>`
    });
    //console.log({treeItems})

    /** render all */
    return html`
      <ui5-busy-indicator id="busy" style="width: 100%">
        <ui5-tree id="threadsTree" mode="SingleSelect" no-data-text="No SubjectTypes found"
                  @item-toggle=${(e) => this.toggleTreeItem(e, unreadSubjects)}
                  @item-click=${this.clickTree}
                  @item-mouseover=${(e) => {this._isHovered[e.detail.item.id] = true; this.requestUpdate();}}
                  @item-mouseout=${(e) => {this._isHovered[e.detail.item.id] = false;}}
        >
          ${treeItems}
        </ui5-tree>
      </ui5-busy-indicator>
    `
  }


  /** */
  static get styles() {
    return [
      css`
        :host {
          background: #f7f6f8;
          display: block;
          height: 100vh;
        }

        #threadsTree {
          display: flex;
          flex-direction: column;
        }
        
        .transBtn {
          border:none;
          background:none;
        }
      `,

    ];
  }
}
