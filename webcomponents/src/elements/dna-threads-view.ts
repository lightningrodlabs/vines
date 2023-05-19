import {css, html, PropertyValues, TemplateResult} from "lit";
import {property, state} from "lit/decorators.js";
import {ZomeElement} from "@ddd-qc/lit-happ";
import {ThreadsZvm} from "../viewModels/threads.zvm";
import {ThreadsPerspective} from "../viewModels/threads.perspective";

import Tree from "@ui5/webcomponents/dist/Tree"
import TreeItem from "@ui5/webcomponents/dist/TreeItem";
import TreeItemCustom from "@ui5/webcomponents/dist/TreeItemCustom";
import "@ui5/webcomponents/dist/BusyIndicator.js";

import "@ui5/webcomponents/dist/StandardListItem.js";
import "@ui5/webcomponents/dist/CustomListItem.js";
import {ActionHashB64} from "@holochain/client";
import {Dictionary} from "@ddd-qc/cell-proxy";
import {ThreadsDvm} from "../viewModels/threads.dvm";



/**
 * @element
 */
export class DnaThreadsView extends ZomeElement<ThreadsPerspective, ThreadsZvm> {

  constructor() {
    super(ThreadsZvm.DEFAULT_ZOME_NAME);
  }

  /** Hash of Thread to display */
  @property() dnaHash: string = ''

  /** -- State variables -- */

  @state() private _loading = false;
  @state() private _isHovered: Dictionary<boolean> = {};


  /**
   * In zvmUpdated() this._zvm is not already set!
   * Subscribe to ThreadsZvm
   */
  protected async zvmUpdated(newZvm: ThreadsZvm, oldZvm?: ThreadsZvm): Promise<void> {
    console.log("<dna-threads-view>.zvmUpdated()");
    this._loading = true;
    await newZvm.probeSubjectTypes(this.dnaHash);
    this._loading = false;
  }

  /** */
  protected async willUpdate(changedProperties: PropertyValues<this>) {
    super.willUpdate(changedProperties);
    console.log("<dna-threads-view>.willUpdate()", changedProperties, !!this._zvm, this.dnaHash);
    if (changedProperties.has("dnaHash") && this._zvm) {
      this._loading = true;
      await this._zvm.probeSubjectTypes(this.dnaHash);
      this._loading = false;
    }
  }


  /** */
  async clickTree(event) {
    //console.log("<semantic-topics-view> click event:", event.detail.item)
    if (event.detail.item.level == 2) {
      await this.updateComplete;
      this.dispatchEvent(new CustomEvent('selected', {detail: event.detail.item.id, bubbles: true, composed: true}));
    }

  }


  /** */
  onClickComment(maybeCommentThread: ActionHashB64 | null, ppAh: ActionHashB64, subjectType: string) {
    this.dispatchEvent(new CustomEvent('commenting-clicked', { detail: {maybeCommentThread, subjectHash: ppAh, subjectType}, bubbles: true, composed: true }));
  }



  /** */
  async toggleTreeItem(event:any) {

  }


  /** */
  render() {
    console.log("<dna-threads-view>.render()", this.dnaHash);
    if (this.dnaHash == "") {
      return html `<div>No DNA selected</div>`;
    }
    if (this._loading) {
      return html `<div>Loading subject types</div>`;
    }

    let subjectTypes = this.perspective.dnaSubjectTypes[this.dnaHash];
    if (!subjectTypes) {
      subjectTypes = [];
    }

    // let subjectsPerType = this.perspective.subjectsPerType[this.dnaHash];
    // if (!subjectsPerType) {
    //   return html `<div>No subject types</div>`;
    // }

    let treeItems = subjectTypes.map((subjectType) => {
      /** Render SubjectTypes */
      let threadButton = html``;
      if (this._isHovered[subjectType]) {
        const maybeCommentThread = this._zvm.getCommentThreadForSubject(subjectType);
        threadButton = html`<ui5-button icon=${maybeCommentThread? "comment" : "sys-add"} tooltip="Create Comment Thread" design="Transparent" 
                                        @click="${(e) => this.onClickComment(maybeCommentThread, subjectType, "SubjectType")}"></ui5-button>`
      }
      //const topicHasUnreads = this.perspective.unreadSubjects.includes(topicHash);
      return html`<ui5-tree-item-custom id=${subjectType} level="1" >
          <div slot="content" style="display:flex;align-items:center;font-weight:normal;text-decoration:;">
              <span>${subjectType}</span>
              ${threadButton}
          </div>
      </ui5-tree-item-custom>`
    });
    //console.log({treeItems})

    /** render all */
    return html`
      <ui5-busy-indicator id="busy" style="width: 100%">
        <ui5-tree id="threadsTree" mode="SingleSelect" no-data-text="No SubjectTypes found"
                  @item-toggle="${this.toggleTreeItem}"
                  @item-click="${this.clickTree}"
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
      `,

    ];
  }
}
