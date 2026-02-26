import {css, html, LitElement, PropertyValues, render, TemplateResult} from "lit";
import {customElement, property, state} from "lit/decorators.js";
import {consume} from "@lit/context";
import {msg} from "@lit/localize";

import {ActionId, AnyId, EntryId, EntryIdMap, intoDhtId, intoLinkableId, ZomeElement} from "@ddd-qc/lit-happ";
import {intoHrl, WeServicesEx} from "@ddd-qc/we-utils";
import {GetStrategy} from "@holochain-open-dev/core-types";
import {EntryHashB64, HoloHashB64} from "@holochain/client";

import {ThreadsZvm} from "../../viewModels/threads.zvm";
import {ThreadsPerspective} from "../../viewModels/threads.perspective";
import {CommentRequest, SpecialSubjectType, threadJumpEvent} from "../../events";
import {weClientContext} from "../../contexts";
import {sharedStyles} from "../../styles";
import {ICollapsable} from "./topics-lister";

/** @ui5/webcomponents */
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

  @state() private _loading = false;
  @state() private _isHovered: EntryIdMap<boolean> = new EntryIdMap();

  @property() selectedThreadHash?: ActionId;


  /** -- Methods -- */

  /** In zvmUpdated() this._zvm is not set yet! */
  protected override async zvmUpdated(newZvm: ThreadsZvm, oldZvm?: ThreadsZvm): Promise<void> {
    console.log("<tool-lister>.zvmUpdated()", this._appletId);
    await super.zvmUpdated(newZvm, oldZvm);
    await this.loadSubjectTypes(newZvm);
  }


  /** */
  collapseAll(_canCollapse: boolean): void {
    /*this.collapsed = canCollapse;*/
  }


  /** */
  override async updated() {
     console.debug("<tool-lister>.updated()", !!this.weServices);
    //   if (this.weServices) {
    //     return;
    // }
    /** Select the first option if none is currently selected */
    const select = this.shadowRoot!.getElementById("lister-select") as unknown as Select;
    //console.debug("<tool-lister>.updated() select", this._appletId, select);
    if (!this._appletId && select && select.options.length > 0) {
      this._appletId = new EntryId(select.options[0]!.id);
      console.debug("<tool-lister>.updated() setting appletId", this._appletId.b64);
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
    await zvm.pullAppletSubjectTypes(this._appletId, GetStrategy.Local);
    this._loading = false;
  }



  /** */
  onClickComment(
      maybeCommentThread: ActionId | null,
      subjectHashB64: HoloHashB64,
      subjectType: string,
      subjectName: string,
      viewType?: string,
      ) {
    const request: CommentRequest = {
      maybeCommentThread, subjectHashB64, subjectType, subjectName,
      viewType: viewType? viewType : "side",
    };
    this.dispatchEvent(new CustomEvent<CommentRequest>('commenting-clicked', {
      detail: request,
      bubbles: true,
      composed: true
    }));
  }


  /** */
  async toggleSubjectTypePanel(pathEh: EntryId) {
      //console.log("<tool-lister>.toggleSubjectTypePanel()", pathEh);
      const subjectTypePanel = this.shadowRoot!.getElementById(pathEh.b64) as Panel;
      //const isTyped = !!this.root && typeof this.root == 'object';
      //const isTyped = !!subjectTypePanel.getAttribute("linkIndex");

      /** Keep already existing children */
      let currentChildren: EntryHashB64[] = [];
      for (const item of Array.from(subjectTypePanel.children)) {
          currentChildren.push((item as any).id);
      }
      //console.log("toggleTreeItem() subjectTypePanel.items", subjectTypePanel.children);

      /** Grab children */
      let subjects = await this._zvm.findSubjects(this._appletId!, pathEh);
      if (!this.weServices) {
          console.warn("weServices not found in <tool-lister>")
      }
      /** build new children */
      let tmpls = [];
      for (const [dnaId, subjectHash] of subjects) {
          /* Skip if item already exists */
          if (currentChildren.includes(subjectHash.b64)) {
              continue;
          }
          let title = subjectHash.b64;
          if (this.weServices) {
              //console.log("calling weServices.assetInfo()", dnaId, subjectHash);
              try {
                  const assetLocInfo = await this.weServices.assets.assetInfo({
                      hrl: intoHrl(dnaId, intoDhtId(subjectHash.b64)),
                      context: null
                  });
                  //console.log("assetLocInfo", assetLocInfo);
                  if (assetLocInfo) {
                      title = assetLocInfo.assetInfo.name;
                  }
              } catch (e: any) {
                  console.error("Couldn't find assetInfo:", e);
              }
          }

          const hasNewThreads = false;
          const isSelected = false;
          const tmpl = html`
              <ui5-panel id=${subjectHash.b64} collapsed
                         @toggle=${(e:any) => {
                             e.preventDefault();
                             e.stopPropagation();
                             this.toggleSubjectHashPanel(subjectHash);
                         }}>
                  <div slot="header" style="display:flex; flex-direction:row; overflow:hidden; cursor:pointer; width:100%; height:36px;">
                      <div class="assetTitle"
                           style="flex-grow:1; height:18px; margin-top:8px; margin-right:10px; font-weight:${hasNewThreads || isSelected? "bold" : ""}; text-overflow:ellipsis; overflow:hidden;"
                           @click=${(e: any) => {
                               e.preventDefault();
                               e.stopPropagation();
                               if (this.weServices) {
                                   this.weServices.openAppletMain(this._appletId!.hash, {hrl: [dnaId.hash, subjectHash.hash], context: undefined});
                               }
                           }}
                      >${title}</div>
                  </div>
              </ui5-panel>
          `;

          tmpls.push(tmpl);
      }
      render(tmpls, subjectTypePanel);
  }

    /** SubjectHash has been toggled */
    async toggleSubjectHashPanel(subjectId: AnyId) {
      //console.log("<tool-lister>.toggleSubjectHashPanel()", subjectId);
      const subjectHashPanel = this.shadowRoot!.getElementById(subjectId.b64) as Panel;

      const itemHash = intoLinkableId(subjectId.hash);
      /** Grab children */
      let pps = await this._zvm.pullSubjectThreads(itemHash, GetStrategy.Local); // FIXME: GetStrategy

        /** Keep already existing children */
        let currentChildren: EntryHashB64[] = [];
        for (const item of Array.from(subjectHashPanel.children)) {
            currentChildren.push((item as any).id);
        }

      const tmpls = [];
      /** Convert to TreeItem and append to Tree */
      for (const [ppAh, [pp, _ts, _author]] of pps.entries()) {
        /* Skip if the item already exists */
        if (currentChildren.includes(ppAh.b64)) {
          continue;
        }

        //const maybeCommentThread = this._zvm.perspective.getCommentThreadForSubject(ppAh);
        //const hasUnreadComments = unreadSubjects.map((id) => id.b64).includes(ppAh.b64);
        const threadIsNew = this.perspective.newThreads.has(ppAh);
        const hasNewBeads = this.perspective.unreads.has(ppAh);
        //const isSelected = this.selectedThreadHash && this.selectedThreadHash.equals(ppAh);
        const canBold = hasNewBeads && !threadIsNew;

        /** 'new' badge to display */
        let newBadge = html``;
        if (threadIsNew) {
          newBadge = html`<ui5-badge color-scheme="3" style="margin-left:3px; color:brown;">${msg("new")}</ui5-badge>`;
        }

        const tmpl = html`
          <div id=${ppAh.b64}
               class="threadItem"
               style="cursor: pointer" 
               @click=${() => {
                  const thisItem = this.shadowRoot!.getElementById(`${ppAh.b64}`) as HTMLElement;
                  thisItem.classList.add("selectedItem");
                   /* unselect previous item */
                   if (this.selectedThreadHash) {
                       const prevItem = this.shadowRoot!.getElementById(`${this.selectedThreadHash.b64}`) as LitElement;
                       if (prevItem) {
                           // console.debug("unselecting previous item", prevItem);
                           prevItem.classList.remove("selectedItem");
                       }
                   }
                   const jump = threadJumpEvent(ppAh);
                   this.dispatchEvent(jump);                   
               }}>
            <span style="display:flex; padding-left:60px; font-size:large; overflow:hidden; font-weight:${canBold? "bold" : "normal"}">
                ${pp.purpose}
                ${newBadge}
            </span>
          </div>
        `;

        tmpls.push(tmpl);
      }
      render(tmpls, subjectHashPanel);
  }

  /** */
  override render() {
    console.log("<tool-lister>.render() appletId", this._appletId, this.selectedThreadHash);
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
                                             @click="${(_e: any) => this.onClickComment(maybeCommentThread, pathEh.b64, SpecialSubjectType.SubjectType, subjectType)}"></ui5-button>`;
      } else {
        if (this._isHovered.get(pathEh)) {
          commentButton = html`
              <ui5-button icon=${maybeCommentThread? "comment" : "sys-add"} tooltip="${maybeCommentThread? msg("View comment thread") : msg("Create new comment thread")}"
                          design="Transparent"
                          @click="${(_e: any) => this.onClickComment(maybeCommentThread, pathEh.b64, SpecialSubjectType.SubjectType, subjectType)}"></ui5-button>`
        }
      }

      /** 'new' badge to display */
      let newBadge = html``;
      if (topicIsNew) {
        newBadge = html`<ui5-badge color-scheme="3" style="margin-top:10px; color:brown;">+1</ui5-badge>`;
      }

      const subjectHasUnreads = unreadSubjects.map(id => id.b64).includes(pathEh.b64);
      return html`
          <ui5-panel id=${pathEh.b64} collapsed
                     @toggle=${(e:any) => {
                         e.preventDefault();
                         e.stopPropagation();
                         /*await*/ this.toggleSubjectTypePanel(pathEh);
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
      for (const [appletId, appletInfo] of Array.from(this.weServices.cache.appletInfos.entries())) {
           console.log("appletId appletInfo", appletInfo?.appletName, appletId.b64);
           /** exclude this tool as it is handled specifically elsewhere */
           if (!appletInfo) {
              continue;
           }
           appletOptions.push(html`<ui5-option .id=${appletId.b64} ?selected=${this._appletId && this._appletId.b64 == appletId.b64} >${appletInfo.appletName}</ui5-option>`);
        }
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
                      const idB64: string = e.detail.selectedOption.id;
                      console.debug("<tool-lister> change", e.detail.selectedOption, idB64, e);
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
          .assetTitle:hover {
              font-weight: bold;
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

          .selectedItem {
              background: #0087ff;
              color: white;
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
