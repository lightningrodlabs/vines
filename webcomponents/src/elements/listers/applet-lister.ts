import {css, html, PropertyValues, render} from "lit";
import {customElement, property, state} from "lit/decorators.js";
import {consume} from "@lit/context";
import {msg} from "@lit/localize";

import {CreatableType} from "@lightningrodlabs/we-applet";
import {ActionId, DhtId, EntryId, EntryIdMap, intoLinkableId, LinkableId, ZomeElement} from "@ddd-qc/lit-happ";
import {WeServicesEx} from "@ddd-qc/we-utils";

import {ThreadsZvm} from "../../viewModels/threads.zvm";
import {ThreadsPerspective} from "../../viewModels/threads.perspective";
import {ThreadsEntryType} from "../../bindings/threads.types";
import {CommentRequest, SpecialSubjectType, threadJumpEvent} from "../../events";
import {THIS_APPLET_ID, weClientContext} from "../../contexts";


/** @ui5/webcomponents */
import "@ui5/webcomponents/dist/Tree.js"
import TreeItem from "@ui5/webcomponents/dist/TreeItem";
import "@ui5/webcomponents/dist/TreeItem.js";
import "@ui5/webcomponents/dist/TreeItemCustom.js";
import BusyIndicator from "@ui5/webcomponents/dist/BusyIndicator";
import "@ui5/webcomponents/dist/BusyIndicator.js";
import "@ui5/webcomponents/dist/StandardListItem.js";
import "@ui5/webcomponents/dist/CustomListItem.js";



/**
 * @element
 */
@customElement("applet-lister")
export class AppletLister extends ZomeElement<ThreadsPerspective, ThreadsZvm> {

  constructor() {
    super(ThreadsZvm.DEFAULT_ZOME_NAME);
  }

  /** ID of the applet to display threads of */
  @property() appletId: EntryId = THIS_APPLET_ID;


  @consume({ context: weClientContext, subscribe: true })
  weServices!: WeServicesEx;

  /** -- State variables -- */

  @state() private _loading = true;
  @state() private _isHovered: EntryIdMap<boolean> = new EntryIdMap();
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
  async openCommentThread(hash: DhtId, subjectType: string, subjectName: string): Promise<void> {
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
  onClickComment(maybeCommentThread: ActionId | null, subjectHash: LinkableId, subjectType: string, subjectName: string, viewType?: string) {
    const request: CommentRequest = {
      maybeCommentThread, subjectHash, subjectType, subjectName,
      viewType: viewType? viewType : "side",
    };
    this.dispatchEvent(new CustomEvent<CommentRequest>('commenting-clicked', { detail: request, bubbles: true, composed: true }));
  }


  /** */
  async toggleTreeItem(event: any, unreadSubjects: LinkableId[]) {
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
      const itemEh = new EntryId(toggledTreeItem.id);
      let subjects = await this._zvm.findSubjects(this.appletId, itemEh);
      console.log("this.weServices", this.weServices);
      if (!this.weServices) {
        console.warn("weServices not found in <applet-lister>")
      }
      /** Convert to TreeItem and append to Tree */
      for (const [dnaHash, subjectHash] of subjects) {
        /* Skip if item already exists */
        if (currentChildren.includes(subjectHash.b64)) {
          continue;
        }
        let newItem = document.createElement("ui5-tree-item") as TreeItem;
        newItem.text = subjectHash.b64;
        if (this.weServices) {
          //const dnaHash = toggledTreeItem['dnaHash'];
          console.log("calling weServices.assetInfo()", dnaHash, subjectHash);
          try {
            const assetLocInfo = await this.weServices.assetInfo({hrl: [dnaHash.hash, subjectHash.hash], context: null});
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
        newItem.id = subjectHash.b64;
        newItem.hasChildren = true;
        newItem.level = toggledTreeItem.level + 1;
        toggledTreeItem.appendChild(newItem);
      }
    }

    /** SubjectHash has been toggled */
    if (event.detail.item.level == 2) {
      const itemHash = intoLinkableId(toggledTreeItem.id);
      /** Grab children */
      let pps = await this._zvm.pullSubjectThreads(itemHash);

      const tmpls = [];
      /** Convert to TreeItem and append to Tree */
      for (const [ppAh, [pp, _ts, _author]] of pps.entries()) {
        /* Skip if item already exists */
        if (currentChildren.includes(ppAh.b64)) {
          continue;
        }

        // Simple tree-item
        //const tmpl = html`<ui5-tree-item id=${ppAh.b64} text=${pp.purpose} level=${toggledTreeItem.level + 1}></ui5-tree-item>`;


        const maybeCommentThread = this._zvm.getCommentThreadForSubject(ppAh);
        const hasUnreadComments = unreadSubjects.includes(ppAh);
        const threadIsNew = this.perspective.newThreads.has(ppAh);
        const hasNewBeads = this.perspective.unreadThreads.has(ppAh);

        /** 'new' badge to display */
        let newBadge = html``;
        if (threadIsNew) {
          newBadge = html`<ui5-badge color-scheme="3" style="margin-top:10px; color:brown;">+1</ui5-badge>`;
        }

        const tmpl = html`
          <ui5-tree-item-custom id=${ppAh.b64} level=${toggledTreeItem.level + 1}>
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
    // if (!this.appletId) {
    //   return html `<div>No Applet selected</div>`;
    // }
    if (this._loading) {
      return html `<ui5-busy-indicator delay="0" size="Medium" active style="margin:auto; width:100%; height:100%;"></ui5-busy-indicator>`;
    }

    let subjectTypes = this.perspective.appletSubjectTypes.get(this.appletId);
    console.log("<applet-lister>.render() subjectTypes", subjectTypes);
    if (!subjectTypes) {
      subjectTypes = new EntryIdMap();
    }

    // FIXME: Reset tree on update() or fix bug with subjects not under the correct update when adding new SubjectTypes live

    /* */
    const newSubjects = this._zvm.getNewSubjects();
    const unreadSubjects = this._zvm.getUnreadSubjects();

    let treeItems = Array.from(subjectTypes.entries()).map(([pathEh, subjectType]) => {
      console.log("<applet-lister>.render() subjectType", subjectType, pathEh);
      /** Render SubjectTypes */
      const maybeCommentThread = this._zvm.getCommentThreadForSubject(pathEh);
      const isUnread = this._zvm.perspective.unreadThreads.has(maybeCommentThread);
      const topicIsNew = newSubjects.get(pathEh.b64) != undefined;

      let commentButton = html``;
      if (isUnread) {
        commentButton = html`<ui5-button icon="comment" tooltip=${msg("View comments")}
                                             design="Negative" class=${this._isHovered.get(pathEh)? "" : "transBtn"}
                                             @click="${(e) => this.onClickComment(maybeCommentThread, pathEh, SpecialSubjectType.SubjectType, subjectType)}"></ui5-button>`;
      } else {
        if (this._isHovered.get(pathEh)) {
          commentButton = html`
              <ui5-button icon=${maybeCommentThread? "comment" : "sys-add"} tooltip="${maybeCommentThread?"View Thread" : "Create new Thread"}"
                          design="Transparent"
                          @click="${(e) => this.onClickComment(maybeCommentThread, pathEh, SpecialSubjectType.SubjectType, subjectType)}"></ui5-button>`
        }
      }

      /** 'new' badge to display */
      let newBadge = html``;
      if (topicIsNew) {
        newBadge = html`<ui5-badge color-scheme="3" style="margin-top:10px; color:brown;">+1</ui5-badge>`;
      }

      //const topicHasUnreads = this.perspective.unreadSubjects.includes(topicHash);
      return html`<ui5-tree-item-custom id=${pathEh.b64} level="1" has-children>
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
            <ui5-button design="Emphasized"  ?disabled=${!this.weServices || this.weServices.appletId == this.appletId.b64 || this.appletId == THIS_APPLET_ID}
                        @click=${(e) => {
                          if (this.weServices && !this.appletId.equals(THIS_APPLET_ID)) this.weServices.openAppletMain(this.appletId.hash)
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
