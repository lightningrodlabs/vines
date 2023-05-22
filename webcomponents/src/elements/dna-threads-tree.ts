import {css, html, PropertyValues, TemplateResult} from "lit";
import {property, state} from "lit/decorators.js";
import {ZomeElement} from "@ddd-qc/lit-happ";
import {ThreadsZvm} from "../viewModels/threads.zvm";
import {ThreadsPerspective} from "../viewModels/threads.perspective";

import Tree from "@ui5/webcomponents/dist/Tree"
import TreeItem from "@ui5/webcomponents/dist/TreeItem";
import TreeItemCustom from "@ui5/webcomponents/dist/TreeItemCustom";
import BusyIndicator from "@ui5/webcomponents/dist/BusyIndicator";

import "@ui5/webcomponents/dist/StandardListItem.js";
import "@ui5/webcomponents/dist/CustomListItem.js";
import {ActionHashB64} from "@holochain/client";
import {Dictionary} from "@ddd-qc/cell-proxy";
import {ThreadsEntryType} from "../bindings/threads.types";
import {CommentRequest} from "./semantic-threads-page";


/**
 * @element
 */
export class DnaThreadsTree extends ZomeElement<ThreadsPerspective, ThreadsZvm> {

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
    console.log("<dna-threads-tree>.zvmUpdated()");
    this._loading = true;
    await newZvm.probeSubjectTypes(this.dnaHash);
    this._loading = false;
  }

  /** */
  protected async willUpdate(changedProperties: PropertyValues<this>) {
    super.willUpdate(changedProperties);
    //console.log("<dna-threads-tree>.willUpdate()", changedProperties, !!this._zvm, this.dnaHash);
    if (changedProperties.has("dnaHash") && this._zvm) {
      this._loading = true;
      await this._zvm.probeSubjectTypes(this.dnaHash);
      this._loading = false;
    }
  }


  /** */
  async clickTree(event) {
    console.log("<dna-threads-tree> click event:", event.detail.item);
    let type;
    switch (event.detail.item.level) {
      case 3: type = ThreadsEntryType.ParticipationProtocol; break;
      case 2: type = "Subject"; break;
      case 1:
      default:
        type = "SubjectType"; break;

    }
    //if (event.detail.item.level == 2) {
      await this.updateComplete;
      this.dispatchEvent(new CustomEvent('selected', {detail: {target: event.detail.item.id, type}, bubbles: true, composed: true}));
    //}

  }


  /** */
  onClickComment(maybeCommentThread: ActionHashB64 | null, subjectHash: ActionHashB64, subjectType: string) {
    this.dispatchEvent(new CustomEvent<CommentRequest>('commenting-clicked', { detail: {maybeCommentThread, subjectHash, subjectType}, bubbles: true, composed: true }));
  }


  /** */
  async toggleTreeItem(event:any) {
    const busyIndicator = this.shadowRoot.getElementById("busy") as BusyIndicator;
    const toggledTreeItem = event.detail.item as TreeItem ; // get the node that is toggled
    //const isTyped = !!this.root && typeof this.root == 'object';
    //const isTyped = !!toggledTreeItem.getAttribute("linkIndex");

    console.log("<dna-threads-tree>.toggleTreeItem()", toggledTreeItem);

    event.preventDefault(); // do not let the toggle button switch yet
    busyIndicator.active = true; // block the tree from the user

    /** Keep already existing children */
    let currentChildren = [];
    for (const item of toggledTreeItem.items) {
      currentChildren.push((item as TreeItem).id);
    }
    //console.log("toggleTreeItem() currentItemTexts", currentItemTexts);

    /** SubjectType */
    if (event.detail.item.level == 1) {
      /** Grab children */
      let subject_lhs = await this._zvm.probeSubjects(this.dnaHash, toggledTreeItem.id);
      /** Convert to TreeItem and append to Tree */
      for (const lh of subject_lhs) {
        /* Skip if item already exists */
        if (currentChildren.includes(lh)) {
          continue;
        }
        let newItem = document.createElement("ui5-tree-item") as TreeItem;
        newItem.text = lh;
        //newItem.additionalText = "[" + ta.anchor + "]";
        //newItem.setAttribute("origin", ta.anchor);
        //newItem.setAttribute("zomeIndex", ta.zomeIndex.toString());
        //newItem.setAttribute("linkIndex", ta.linkIndex.toString());
        newItem.id = lh;
        newItem.hasChildren = true;
        newItem.level = toggledTreeItem.level + 1;
        toggledTreeItem.appendChild(newItem);
      }
    }

    /** SubjectHash */
    if (event.detail.item.level == 2) {
      /** Grab children */
      let pps = await this._zvm.probeThreads(toggledTreeItem.id);
      /** Convert to TreeItem and append to Tree */
      for (const [ppAh, pp] of Object.entries(pps)) {
        /* Skip if item already exists */
        if (currentChildren.includes(ppAh)) {
          continue;
        }
        let newItem = document.createElement("ui5-tree-item") as TreeItem;
        newItem.text = pp.purpose;
        newItem.id = ppAh;
        //newItem.hasChildren = true;
        newItem.level = toggledTreeItem.level + 1;
        toggledTreeItem.appendChild(newItem);
      }
    }

    /** Done */
    toggledTreeItem.toggle(); // manually switch the toggle button
    busyIndicator.active = false;
  }


  /** */
  render() {
    console.log("<dna-threads-tree>.render()", this.dnaHash);
    if (this.dnaHash == "") {
      return html `<div>No DNA selected</div>`;
    }
    if (this._loading) {
      return html `<div>Loading subject types</div>`;
    }

    let subjectTypes = this.perspective.dnaSubjectTypes[this.dnaHash];
    if (!subjectTypes) {
      subjectTypes = {};
    }

    // let subjectsPerType = this.perspective.subjectsPerType[this.dnaHash];
    // if (!subjectsPerType) {
    //   return html `<div>No subject types</div>`;
    // }

    let treeItems = Object.entries(subjectTypes).map(([pathHash, subjectType]) => {
      /** Render SubjectTypes */
      let threadButton = html``;
      if (this._isHovered[pathHash]) {
        const maybeCommentThread = this._zvm.getCommentThreadForSubject(pathHash);
        threadButton = html`<ui5-button icon=${maybeCommentThread? "comment" : "sys-add"} tooltip="Create Comment Thread" design="Transparent" 
                                        @click="${(e) => this.onClickComment(maybeCommentThread, pathHash, "SubjectType")}"></ui5-button>`
      }
      //const topicHasUnreads = this.perspective.unreadSubjects.includes(topicHash);
      return html`<ui5-tree-item-custom id=${pathHash} level="1" has-children>
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
