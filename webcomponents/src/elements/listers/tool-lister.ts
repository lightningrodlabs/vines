import {css, html, PropertyValues, render, TemplateResult} from "lit";
import {customElement, property, state} from "lit/decorators.js";
import {consume} from "@lit/context";
import {msg} from "@lit/localize";

import {CreatableType} from "@theweave/api";
import {ActionId, AnyId, DhtId, EntryId, EntryIdMap, intoDhtId, intoLinkableId, ZomeElement} from "@ddd-qc/lit-happ";
import {intoHrl, WeServicesEx} from "@ddd-qc/we-utils";
import {GetStrategy} from "@holochain-open-dev/core-types";
import {EntryHashB64} from "@holochain/client";

import {ThreadsZvm} from "../../viewModels/threads.zvm";
import {ThreadsPerspective} from "../../viewModels/threads.perspective";
import {CommentRequest, SpecialSubjectType} from "../../events";
import {weClientContext} from "../../contexts";
import {sharedStyles} from "../../styles";
import {ICollapsable} from "./topics-lister";

/** @ui5/webcomponents */
//import BusyIndicator from "@ui5/webcomponents/dist/BusyIndicator";
//import "@ui5/webcomponents/dist/BusyIndicator.js";
import "@ui5/webcomponents/dist/StandardListItem.js";
import "@ui5/webcomponents/dist/CustomListItem.js";
import Select from "@ui5/webcomponents/dist/Select";
import Panel from "@ui5/webcomponents/dist/Panel";


/**
 *
 */
@customElement("tool-lister")
export class ToolLister extends ZomeElement<ThreadsPerspective, ThreadsZvm> implements ICollapsable {

  constructor() {
    super(ThreadsZvm.DEFAULT_ZOME_NAME);
  }

  /** -- Properties -- */

  /** ID of the applet to display */
  @state() _appletId?: EntryId;

  @consume({context: weClientContext, subscribe: true})
  weServices!: WeServicesEx;

  @property({type: Boolean}) collapsed?: boolean = false;

  @state() private _loading = false;
  @state() private _isHovered: EntryIdMap<boolean> = new EntryIdMap();

  private _threadCreatableType?: CreatableType;


  /** -- Methods -- */

  /** In zvmUpdated() this._zvm is not already set! */
  protected override async zvmUpdated(newZvm: ThreadsZvm, oldZvm?: ThreadsZvm): Promise<void> {
    console.log("<tool-lister>.zvmUpdated()");
    super.zvmUpdated(newZvm, oldZvm);
    await this.loadSubjectTypes(newZvm);
  }

  /** */
  collapseAll(canCollapse: boolean): void {
    this.collapsed = canCollapse;
  }


  /** */
  override async updated() {
    if (this.weServices) {
        return;
    }
    /** Select the first option if none is currently selected */
    const select = this.shadowRoot!.getElementById("lister-select") as unknown as Select;
    if (!this._appletId && select && select.options.length > 0) {
      this._appletId = new EntryId(select.options[0]!.id);
    }
  }


  /** */
  protected override async willUpdate(changedProperties: PropertyValues<this>) {
    super.willUpdate(changedProperties);
    console.log("<tool-lister>.willUpdate() appletId", changedProperties, changedProperties.has("_appletId"));
    if (changedProperties.has("_appletId") && this._zvm) {
      /*await*/ this.loadSubjectTypes();
    }
  }


  /** */
  private async loadSubjectTypes(newZvm?: ThreadsZvm): Promise<void> {
    console.log("<tool-lister>.loadSubjectTypes()", this._appletId);
    if (!this._appletId) {
      return;
    }
    this._loading = true;
    const zvm = newZvm? newZvm : this._zvm;
    await zvm.pullAppletSubjectTypes(this._appletId);
    this._loading = false;
  }


  /** Search for Vines AssetType in based on _appInfoMap */
  getThreadAssetType(): CreatableType | undefined {
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
    // //   console.warn("Did not find Vines tool");
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
  async openCommentThread(hash: DhtId, _subjectType: string, _subjectName: string): Promise<void> {
    console.debug("<tool-lister>.openCommentThread()", hash);
    const attType = this.getThreadAssetType();
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
  onClickComment(
      maybeCommentThread: ActionId | null,
      subjectHash: AnyId,
      subjectType: string,
      subjectName: string,
      viewType?: string,
      ) {
    const request: CommentRequest = {
      maybeCommentThread, subjectId: subjectHash, subjectType, subjectName,
      viewType: viewType? viewType : "side",
    };
    this.dispatchEvent(new CustomEvent<CommentRequest>('commenting-clicked', {
      detail: request,
      bubbles: true,
      composed: true
    }));
  }


  /** */
  async toggleSubjectTypePanel(pathEh: EntryId, _unreadSubjects: AnyId[]) {
      console.log("<tool-lister>.toggleSubjectTypePanel()", pathEh);

      const subjectTypePanel = this.shadowRoot!.getElementById(pathEh.b64) as Panel;
      //const isTyped = !!this.root && typeof this.root == 'object';
      //const isTyped = !!subjectTypePanel.getAttribute("linkIndex");

      //busyIndicator.active = true; // block the tree from the user

      /** Keep already existing children */
      let currentChildren: EntryHashB64[] = [];
      for (const item of Array.from(subjectTypePanel.children)) {
          currentChildren.push((item as any).id);
      }
      console.log("toggleTreeItem() subjectTypePanel.items", subjectTypePanel.children);

      /** Grab children */
      let subjects = await this._zvm.findSubjects(this._appletId!, pathEh);
      console.log("<tool-lister> this.weServices", !!this.weServices);
      if (!this.weServices) {
          console.warn("weServices not found in <tool-lister>")
      }
      /** Convert to TreeItem and append to Tree */
      for (const [dnaId, subjectHash] of subjects) {
          /* Skip if item already exists */
          if (currentChildren.includes(subjectHash.b64)) {
              continue;
          }

          const tmpl = html`
              <ui5-panel id=${subjectHash.b64} ?collapsed=${this.collapsed}
                         @toggle=${(e:any) => {
                             e.preventDefault();
                             this.toggleSubjectHashPanel(pathEh/*, unreadSubjects*/);
                         }}>
                  <div slot="header" style="display:flex; flex-direction:row; overflow:hidden;width: 100%; height: 36px;">
                      <div style="flex-grow:1; height:18px; margin-top:8px; margin-right:10px; font-weight:${subjectHasUnreads? "bold" : ""}; text-overflow:ellipsis; overflow:hidden;">
                          ${subjectType}
                      </div>
                      ${commentButton}
                      ${newBadge}
                  </div>
              </ui5-panel>
          `;
          let newItem = document.createElement("ui5-panel") as any;
          newItem.text = subjectHash.b64;
          if (this.weServices) {
              //const dnaHash = toggledTreeItem['dnaHash'];
              console.log("calling weServices.assetInfo()", dnaId, subjectHash);
              try {
                  const assetLocInfo = await this.weServices.assets.assetInfo({
                      hrl: intoHrl(dnaId, intoDhtId(subjectHash.b64)),
                      context: null
                  });
                  console.log("assetLocInfo", assetLocInfo);
                  if (assetLocInfo) {
                      newItem.text = assetLocInfo.assetInfo.name;
                  }
              } catch (e: any) {
                  console.error("Couldn't find assetInfo:", e);
              }
          }
          //newItem.additionalText = "[" + ta.anchor + "]";
          //newItem.setAttribute("dnaHash", dnaHash);
          //newItem.setAttribute("zomeIndex", ta.zomeIndex.toString());
          //newItem.setAttribute("linkIndex", ta.linkIndex.toString());
          newItem.id = subjectHash.b64;
          newItem.toggleable = true;
          newItem.toggle = () => {
              console.log("toggleSubjectTypePanel() toggle SubjectHash", subjectHash.b64);
          }
          subjectTypePanel.appendChild(newItem);
          //this.requestUpdate();
          //subjectTypePanel.shouldToggle(this); // manually switch the toggle button
      }
    }

    /** SubjectHash has been toggled */
    async toggleSubjectHashPanel(pathEh: EntryId, _unreadSubjects: AnyId[]) {
      console.log("<tool-lister>.toggleSubjectHashPanel()", pathEh);
      const subjectHashPanel = this.shadowRoot!.getElementById(pathEh.b64) as Panel;

        const itemHash = intoLinkableId(pathEh.hash);
      /** Grab children */
      let pps = await this._zvm.pullSubjectThreads(itemHash, GetStrategy.Local);

        /** Keep already existing children */
        let currentChildren: EntryHashB64[] = [];
        for (const item of Array.from(subjectHashPanel.children)) {
            currentChildren.push((item as any).id);
        }
        console.log("toggleTreeItem() subjectHashPanel.items", subjectHashPanel.children);


      const tmpls = [];
      /** Convert to TreeItem and append to Tree */
      for (const [ppAh, [pp, _ts, _author]] of pps.entries()) {
        /* Skip if item already exists */
        if (currentChildren.includes(ppAh.b64)) {
          continue;
        }

        // Simple tree-item
        //const tmpl = html`<ui5-tree-item id=${ppAh.b64} text=${pp.purpose} level=${toggledTreeItem.level + 1}></ui5-tree-item>`;


        //const maybeCommentThread = this._zvm.perspective.getCommentThreadForSubject(ppAh);
        //const hasUnreadComments = unreadSubjects.map((id) => id.b64).includes(ppAh.b64);
        const threadIsNew = this.perspective.newThreads.has(ppAh);
        const hasNewBeads = this.perspective.unreads.has(ppAh);

        /** 'new' badge to display */
        let newBadge = html``;
        if (threadIsNew) {
          newBadge = html`<ui5-badge color-scheme="3" style="margin-left:3px; color:brown;">${msg("new")}</ui5-badge>`;
        }

        const tmpl = html`
          <div id=${ppAh.b64} style="cursor: pointer">
            <span slot="content" 
                  style="display:flex;overflow: hidden;font-weight:${hasNewBeads && !threadIsNew? "bold" : "normal"}">
                ${pp.purpose}
                ${newBadge}
            </span>
          </div>
        `;


        tmpls.push(tmpl);
      }
      render(tmpls, subjectHashPanel);
      subjectHashPanel.shouldToggle(this); // manually switch the toggle button
  }

  /** */
  override render() {
    console.log("<tool-lister>.render() appletId", this._appletId);
    if (this._loading) {
      return html`<ui5-busy-indicator delay="0" size="Medium" active style="margin:auto; width:100%; height:100%;"></ui5-busy-indicator>`;
    }

    let subjectTypes: EntryIdMap<string> = new EntryIdMap();

    if (this._appletId) {
      let maybeSubjectTypes = this.perspective.appletSubjectTypes.get(this._appletId);
      console.debug("<tool-lister>.render() subjectTypes", subjectTypes);
      if (maybeSubjectTypes) {
        subjectTypes = maybeSubjectTypes
      }
    }

    // FIXME: Reset tree on update() or fix bug with subjects not under the correct update when adding new SubjectTypes live

    /* */
    const newSubjects = this._zvm.perspective.getNewSubjects();
    const unreadSubjects = this._zvm.perspective.getUnreadSubjects();

    let treeItems = Array.from(subjectTypes.entries()).map(([pathEh, subjectType]) => {
      console.debug("<tool-lister>.render() subjectType", subjectType, pathEh);
      /** Render SubjectTypes */
      const maybeCommentThread = this._zvm.perspective.getCommentThreadForSubject(pathEh);
      const isUnread = !!maybeCommentThread && this._zvm.perspective.unreads.has(maybeCommentThread);
      const topicIsNew = newSubjects.get(pathEh.b64) != undefined;

      let commentButton = html``;
      if (isUnread) {
        commentButton = html`<ui5-button icon="comment" tooltip=${msg("View comments")}
                                             design="Negative" class=${this._isHovered.get(pathEh)? "" : "transBtn"}
                                             @click="${(_e: any) => this.onClickComment(maybeCommentThread, pathEh, SpecialSubjectType.SubjectType, subjectType)}"></ui5-button>`;
      } else {
        if (this._isHovered.get(pathEh)) {
          commentButton = html`
              <ui5-button icon=${maybeCommentThread? "comment" : "sys-add"} tooltip="${maybeCommentThread? msg("View comment thread") : msg("Create new comment thread")}"
                          design="Transparent"
                          @click="${(_e: any) => this.onClickComment(maybeCommentThread, pathEh, SpecialSubjectType.SubjectType, subjectType)}"></ui5-button>`
        }
      }

      /** 'new' badge to display */
      let newBadge = html``;
      if (topicIsNew) {
        newBadge = html`<ui5-badge color-scheme="3" style="margin-top:10px; color:brown;">+1</ui5-badge>`;
      }

      const subjectHasUnreads = unreadSubjects.includes(pathEh); // FIXME
      return html`
          <ui5-panel id=${pathEh.b64} ?collapsed=${this.collapsed}
                     @toggle=${(e:any) => {
                         e.preventDefault();
                         this.toggleSubjectTypePanel(pathEh, unreadSubjects);
                     }}>
              <div slot="header" style="display:flex; flex-direction:row; overflow:hidden;width: 100%; height: 36px;">
              <div style="flex-grow:1; height:18px; margin-top:8px; margin-right:10px; font-weight:${subjectHasUnreads? "bold" : ""}; text-overflow:ellipsis; overflow:hidden;">
                  ${subjectType}
              </div>
              ${commentButton}
              ${newBadge}
              </div>
        </ui5-panel>
      `});
    //console.log({treeItems})


    let appletOptions: TemplateResult<1>[] = [];
    if (this.weServices) {
      appletOptions = Array.from(this.weServices.cache.appletInfos.entries()).map(([appletId, appletInfo]) => {
          console.log("appletId appletInfo", appletInfo?.appletName);
          /** exclude this tool as it is handled specifically elsewhere */
          if (!appletInfo) {
            return html``;
          }
          return html`<ui5-option id=${appletId.b64}>${appletInfo.appletName}</ui5-option>`;
        }
      );
    }
    console.log("appletOptions", appletOptions);

    let inner = html`<div>${treeItems}</div>`;

    /** Handle empty tree case */
    if (treeItems.length == 0) {
      inner = html`<div style="color: grey; margin: auto; padding-bottom:30px;">${msg('No comment threads found for this Tool')}</div>`;
    }


    /** render all */
    return html`
        <div style="display:flex; flex-direction:column; gap:10px; padding:5px;">
          <div style="display:flex; flex-direction:row; padding-bottom: 10px;">
            <ui5-select id="lister-select" style="margin:auto"
                      @change=${(e: any) => {
                      console.debug("<tool-lister> change", e.detail.selectedOption, e);
                      const idB64: string = e.detail.selectedOption.id;
                      this._appletId = new EntryId(idB64);
                    }}>
              ${appletOptions}
          </ui5-select>
            <ui5-button design="Emphasized" icon="action"
                        style="margin:auto"  
                        tooltip=${msg("Go to Tool")}
                        ?disabled=${!this.weServices || !this._appletId /* || appletId == VinesAppletId */}
                        @click=${(_e: any) => {
                            if (this.weServices && this._appletId) {
                                this.weServices.openAppletMain(this._appletId.hash);
                            }
                        }}>
            </ui5-button>
          </div>              
          ${inner}
        </div>
    `
  }


  /** */
  static override get styles() {
    return [
      sharedStyles,
      css`
        :host {
          display: block;
          padding-bottom: 20px;
        }

        #threadsTree {
          display: flex;
          flex-direction: column;
        }
        
        .transBtn {
          border:none;
          background:none;
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
      `,

    ];
  }
}
