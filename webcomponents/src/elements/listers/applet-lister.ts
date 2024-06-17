import {css, html, PropertyValues, render} from "lit";
import {customElement, property, state} from "lit/decorators.js";
import {consume} from "@lit/context";
import {msg} from "@lit/localize";

import {ActionHashB64, decodeHashFromBase64, EntryHashB64} from "@holochain/client";

import {AppletId, CreatableType} from "@lightningrodlabs/we-applet";

import {Dictionary} from "@ddd-qc/cell-proxy";
import {ZomeElement} from "@ddd-qc/lit-happ";
import {WeServicesEx} from "@ddd-qc/we-utils";

import {ThreadsZvm} from "../../viewModels/threads.zvm";
import {AnyLinkableHashB64, ThreadsPerspective} from "../../viewModels/threads.perspective";
import {ThreadsEntryType} from "../../bindings/threads.types";
import {CommentRequest} from "../../utils";
import {threadJumpEvent} from "../../jump";

/** @ui5/webcomponents */
import "@ui5/webcomponents/dist/Tree.js"
import TreeItem from "@ui5/webcomponents/dist/TreeItem";
import "@ui5/webcomponents/dist/TreeItem.js";
import "@ui5/webcomponents/dist/TreeItemCustom.js";
import BusyIndicator from "@ui5/webcomponents/dist/BusyIndicator";
import "@ui5/webcomponents/dist/BusyIndicator.js";
import "@ui5/webcomponents/dist/StandardListItem.js";
import "@ui5/webcomponents/dist/CustomListItem.js";
import {SUBJECT_TYPE_TYPE_NAME, THIS_APPLET_ID, weClientContext} from "../../contexts";


/**
 * @element
 */
@customElement("applet-lister")
export class AppletLister extends ZomeElement<ThreadsPerspective, ThreadsZvm> {

  constructor() {
    super(ThreadsZvm.DEFAULT_ZOME_NAME);
  }

  /** ID of the applet to display threads of */
  @property() appletId: AppletId = THIS_APPLET_ID;


  @consume({ context: weClientContext, subscribe: true })
  weServices!: WeServicesEx;

  /** -- State variables -- */

  @state() private _loading = true;
  @state() private _isHovered: Dictionary<boolean> = {};
           private _threadCreatableType?: CreatableType;

  /**
   * In zvmUpdated() this._zvm is not already set!
   * Subscribe to ThreadsZvm
   */
  protected async zvmUpdated(newZvm: ThreadsZvm, oldZvm?: ThreadsZvm): Promise<void> {
    console.log("<applet-lister>.zvmUpdated()");
    await this.loadSubjectTypes(newZvm);
  }


  /** */
  protected async willUpdate(changedProperties: PropertyValues<this>) {
    super.willUpdate(changedProperties);
    //console.log("<applet-lister>.willUpdate()", changedProperties, !!this._zvm, this.dnaHash);
    if (changedProperties.has("appletId") && this._zvm) {
      /*await */ this.loadSubjectTypes();
    }
  }


  /** */
  private async loadSubjectTypes(newZvm?: ThreadsZvm) {
    console.log("<applet-lister>.loadSubjectTypes()");
    this._loading = true;
    const zvm = newZvm? newZvm : this._zvm;
    const subs = await zvm.pullAppletSubjectTypes(this.appletId);
    console.log("<applet-lister>.loadSubjectTypes() subs", subs);
    this._loading = false;
  }





  /** Search for Vines attachmentType in based on _appInfoMap */
  getThreadAttachmentType(): CreatableType | undefined {
    // FIXME
    if (this._threadCreatableType) {
      return this._threadCreatableType;
    }
    // // let threadsAppletId = undefined;
    // // for (const [appletId, appInfo] of Object.entries(this._appInfoMap)) {
    // //   if (appInfo.appletName == "Vines") {
    // //     threadsAppletId = appletId;
    // //     break;
    // //   }
    // // }
    // // if (!threadsAppletId) {
    // //   console.warn("Did not find Vines applet");
    // //   return undefined;
    // // }
    // for (const [_appletHash, atts] of this.weServices.creatables.entries()) {
    //   //if (encodeHashToBase64(appletId) == threadsAppletId) {
    //   for (const [attName, att] of Object.entries(atts)) {
    //     if (attName == "thread") {
    //       this._threadCreatableType = att;
    //       return att;
    //     }
    //   }
    // }
    // console.warn("Did not find 'thread' attachmentType in WeServices");
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
    //const spaceHrl: Hrl = [decodeHashFromBase64(this.cell.dnaHash), decodeHashFromBase64(hash)];
    //const hrlc = {hrl: spaceHrl, context: {subjectType, subjectName}}
    // FIXME: since create has been removed, try to grab existing entry instead.
    // const res = await attType.create(hrlc);
    // console.log("Create/Open Thread result:", res);
    // res.context.subjectType = subjectType;
    // res.context.subjectName = subjectName;
    // this.weServices.openHrl({hrl: res.hrl, context: res.context});
  }


  /** */
  async clickTree(event) {
    console.log("<applet-lister> click event:", event.detail.item);
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

    console.log("<applet-lister>.toggleTreeItem()", toggledTreeItem);

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
      let subjects = await this._zvm.findSubjects(this.appletId, toggledTreeItem.id);
      console.log("this.weServices", this.weServices);
      if (!this.weServices) {
        console.warn("weServices not found in <applet-lister>")
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
          console.log("calling weServices.assetInfo()", dnaHash, subjectHash);
          try {
            const assetLocInfo = await this.weServices.assetInfo({hrl: [decodeHashFromBase64(dnaHash), decodeHashFromBase64(subjectHash)], context: null});
            console.log("assetLocInfo", assetLocInfo);
            if (assetLocInfo) {
              newItem.text = assetLocInfo.assetInfo.name;
            }
          } catch(e) {
            console.error("Couldn't find assetInfo:", e);
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
      let pps = await this._zvm.pullSubjectThreads(toggledTreeItem.id);

      const tmpls = [];
      /** Convert to TreeItem and append to Tree */
      for (const [ppAh, [pp, _ts, _author]] of Object.entries(pps)) {
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
    console.log("<applet-lister>.render()", this.appletId);
    if (this.appletId == "") {
      return html `<div>No Applet selected</div>`;
    }
    if (this._loading) {
      return html `<ui5-busy-indicator delay="0" size="Medium" active style="margin:auto; width:100%; height:100%;"></ui5-busy-indicator>`;
    }

    let subjectTypes = this.perspective.appletSubjectTypes[this.appletId];
    console.log("<applet-lister>.render() subjectTypes", subjectTypes);
    if (!subjectTypes) {
      subjectTypes = {};
    }

    // FIXME: Reset tree on update() or fix bug with subjects not under the correct update when adding new SubjectTypes live

    /* */
    const newSubjects = this._zvm.getNewSubjects();
    const unreadSubjects = this._zvm.getUnreadSubjects();

    let treeItems = Object.entries(subjectTypes).map(([pathHash, subjectType]) => {
      console.log("<applet-lister>.render() subjectType", subjectType, pathHash);
      /** Render SubjectTypes */
      const maybeCommentThread = this._zvm.getCommentThreadForSubject(pathHash);
      const isUnread = Object.keys(this._zvm.perspective.unreadThreads).includes(maybeCommentThread);
      const topicIsNew = newSubjects[pathHash] != undefined;

      let commentButton = html``;
      if (isUnread) {
        commentButton = html`<ui5-button icon="comment" tooltip=${msg("View comments")}
                                             design="Negative" class=${this._isHovered[pathHash]? "" : "transBtn"}
                                             @click="${(e) => this.onClickComment(maybeCommentThread, pathHash, SUBJECT_TYPE_TYPE_NAME, subjectType)}"></ui5-button>`;
      } else {
        if (this._isHovered[pathHash]) {
          commentButton = html`
              <ui5-button icon=${maybeCommentThread? "comment" : "sys-add"} tooltip="${maybeCommentThread?"View Thread" : "Create new Thread"}"
                          design="Transparent"
                          @click="${(e) => this.onClickComment(maybeCommentThread, pathHash, SUBJECT_TYPE_TYPE_NAME, subjectType)}"></ui5-button>`
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

    /** Handle empty tree case */
    if (treeItems.length == 0) {
      return html`
          <div style="display:flex; flex-direction:column; gap:10px; padding:7px;">
            <div style="color: grey; margin: auto;">${msg('No threads found')}</div>
            <ui5-button design="Emphasized"  ?disabled=${!this.weServices || this.weServices.appletId == this.appletId || this.appletId == THIS_APPLET_ID}
                        @click=${(e) => {
                          if (this.weServices && this.appletId != THIS_APPLET_ID) this.weServices.openAppletMain(decodeHashFromBase64(this.appletId))
                        }}>
                ${msg('Go to applet')}
            </ui5-button>
          </div>
      `;
    }

    /** render all */
    return html`
      <ui5-busy-indicator id="busy" delay="20" style="width: 100%">
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
