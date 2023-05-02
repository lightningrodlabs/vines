import {css, html, PropertyValues, TemplateResult} from "lit";
import {property, state} from "lit/decorators.js";
import {ZomeElement} from "@ddd-qc/lit-happ";
import {ThreadsZvm} from "../viewModels/threads.zvm";
import {ItemLink, ROOT_ANCHOR_SEMANTIC_TOPICS} from "../bindings/threads.types";
import {ThreadsPerspective} from "../viewModels/threads.perspective";

import Tree from "@ui5/webcomponents/dist/Tree"
import TreeItem from "@ui5/webcomponents/dist/TreeItem";
import TreeItemCustom from "@ui5/webcomponents/dist/TreeItemCustom";
import "@ui5/webcomponents/dist/BusyIndicator.js";

import "@ui5/webcomponents/dist/StandardListItem.js";
import "@ui5/webcomponents/dist/CustomListItem.js";



/**
 * @element
 */
export class SemanticTopicsView extends ZomeElement<ThreadsPerspective, ThreadsZvm> {

  constructor() {
    super(ThreadsZvm.DEFAULT_ZOME_NAME);
  }


  // @state() private _itemLinks: ItemLink[];
  //
  //
  //
  // /** */
  // async scanRoot() {
  //   console.log("<semantic-topics-view>.scanRoot()");
  //   this._itemLinks = await this._zvm.zomeProxy.getLeafAnchors(ROOT_ANCHOR_SEMANTIC_TOPICS);
  // }


  /** */
  async toggleTreeItem(event:any) {
    // const busyIndicator = this.shadowRoot.getElementById("busy") as any; // Tree
    // let rootItem = event.detail.item /* as TreeItem */; // get the node that is toggled
    // console.log("toggleRootTreeItem()", rootItem.id, rootItem.getAttribute("anchor"))
    //
    // /* Handle AnchorBranch */
    // if (rootItem.id.length > 8 && rootItem.id.substring(0, 8) === "anchor__") {
    //   if (rootItem.expanded) {
    //     return;
    //   }
    //   event.preventDefault(); // do not let the toggle button switch yet
    //
    //   let itemTexts = [];
    //   for (const item of rootItem.items) {
    //     itemTexts.push(item.text);
    //   }
    //   busyIndicator.active = true; // block the tree from the user
    //
    //   const tas = await this._zvm.getAllSubAnchors(rootItem.getAttribute("anchor"));
    //   console.log({tas})
    //
    //   /** Handle LeafAnchor */
    //   if (tas.length == 0) {
    //     const linkKeys = Object.keys(ThreadsLinkTypeType);
    //     let itemHashs = [];
    //     for (const item of rootItem.items) {
    //       itemHashs.push(item.id);
    //     }
    //
    //     const leafLinks = await this._zvm.zomeProxy.getAllLeafLinksFromAnchor(rootItem.getAttribute("anchor"));
    //
    //     console.log({leafLinks})
    //     for (const leafLink of leafLinks) {
    //       const tag = new TextDecoder().decode(new Uint8Array(leafLink.tag));
    //       const hash = encodeHashToBase64(new Uint8Array(leafLink.target));
    //
    //       if (itemHashs.includes(hash)) {
    //         continue;
    //       }
    //       var newItem = document.createElement("ui5-tree-item") as any; // TreeItem
    //       newItem.text = hash;
    //       newItem.additionalText = tag? linkKeys[leafLink.index] + " | " + tag : linkKeys[leafLink.index];
    //       newItem.setAttribute("anchor", rootItem.anchor);
    //       newItem.id = hash;
    //       newItem.level = rootItem.level + 1;
    //       rootItem.appendChild(newItem); // add the newly fetched node to the tree
    //     }
    //   }
    //
    //   /** Handle BranchAnchor */
    //   for (const ta of tas) {
    //     const leafComponent = anchorLeaf(ta.anchor);
    //     /* Skip if item already exists */
    //     if (itemTexts.includes(leafComponent)) {
    //       continue;
    //     }
    //     let newItem = document.createElement("ui5-tree-item") as any; // TreeItem
    //     newItem.text = leafComponent;
    //     newItem.additionalText = ta.anchor;
    //     newItem.setAttribute("anchor", ta.anchor);
    //     newItem.id = "anchor__" + ta.anchor;
    //     newItem.hasChildren = true;
    //     newItem.level = rootItem.level + 1;
    //     rootItem.appendChild(newItem); // add the newly fetched node to the tree
    //   }
    //
    //   rootItem.toggle(); // now manually switch the toggle button
    //   busyIndicator.active = false; // unblock the tree
    //
    // }
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
  render() {
    console.log("<semantic-topics-view>.render()");
    // if (!this._leafLinks) {
    //   return html`Loading...`;
    // }

    let treeItems = Object.entries(this.perspective.allSemanticTopics).map(([hash, title]) => {
      const topicThreads = this.perspective.threadsByTopic[hash];
      let threads = [html``];
      if (topicThreads) {
        threads = Object.values(topicThreads).map((ppHash)=> {
          const pp = this.perspective.allParticipationProtocols[ppHash];
          //console.log("<semantic-topics-view>.render() topic: ", topicThreads., this.perspective.semanticTopics);
          if (!pp) return html``;
          return html`<ui5-tree-item-custom id="${ppHash}" level="2" icon="discussion">
              <span slot="content">${pp.purpose}</span>
          </ui5-tree-item-custom>`
        })
      }
      return html`<ui5-tree-item-custom id="${hash}" ?has-children="${!!topicThreads}" 
                                        expanded="${!!topicThreads}" show-toggle-button level="1">
          <span slot="content" style="display:flex;">
              <span style="margin-top:8px">${title}</span>                 
              <ui5-button icon="add" tooltip="Create Thread" design="Transparent" @click=${async (e) => {
                e.stopPropagation(); //console.log("topic clicked:", title);
                await this.updateComplete;
                this.dispatchEvent(new CustomEvent('createThreadClicked', {detail: hash, bubbles: true, composed: true}));
              }} ></ui5-button>
          </span>
          ${threads}
      </ui5-tree-item-custom>`
    });
    //console.log({treeItems})

    /** render all */
    return html`
      <ui5-busy-indicator id="busy" style="width: 100%">
        <ui5-tree id="semTree" mode="SingleSelect" no-data-text="No topics found"
                  @item-toggle="${this.toggleTreeItem}"
                  @item-click="${this.clickTree}"
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

        #semTree {
          display: flex;
          flex-direction: column;
        }
      `,

    ];
  }
}
