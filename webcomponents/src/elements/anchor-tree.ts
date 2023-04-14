import {css, html, TemplateResult} from "lit";
import {property, state} from "lit/decorators.js";
import {ZomeElement} from "@ddd-qc/lit-happ";
import {ThreadsPerspective, ThreadsZvm} from "../viewModels/threads.zvm";
import {ThreadsLinkTypeType, TypedAnchor} from "../bindings/threads.types";
import {encodeHashToBase64} from "@holochain/client";

import "@ui5/webcomponents/dist/Tree.js"
import "@ui5/webcomponents/dist/TreeItem.js";
import "@ui5/webcomponents/dist/BusyIndicator.js";

function anchorLeaf(anchor: String): string {
  const subs = anchor.split(".");
  return subs[subs.length -1];
}


function typedAnchor2TreeItem(ta: TypedAnchor) {
  console.log("typedAnchor2TreeItem()", ta.anchor)
  //anchorLeaf(ta.anchor)
  return html`<ui5-tree-item id="anchor__${ta.anchor}" text="${ta.anchor}" has-children></ui5-tree-item>`
}


/**
 * @element
 */
export class AnchorTree extends ZomeElement<ThreadsPerspective, ThreadsZvm> {

  constructor() {
    super(ThreadsZvm.DEFAULT_ZOME_NAME);
    console.log("<anchor-tree>.ctor()")
  }


  @state() private _rootAnchors: TypedAnchor[] = [];


  /** */
  renderLeafAnchor(rootAnchors: TypedAnchor[]): TemplateResult<1> {
    return html``;
  }


  /** */
  renderRootAnchorTree(rootAnchors: TypedAnchor[]): TemplateResult<1> {
    const children = rootAnchors.map((ta) => {
      return typedAnchor2TreeItem(ta)
    });
    console.log({children})
    return html`
      <ui5-busy-indicator id="busy" class="full-width">
        <ui5-tree id="rootAnchorTree" mode="None" header-text="Root Anchors" no-data-text="No root Anchors found"
                  @item-toggle="${this.toggleRootTreeItem}"
        >
          ${children}
        </ui5-tree>
      </ui5-busy-indicator>
    `
  }


  async scanRootAnchors(): Promise<void> {
    this._rootAnchors = await this._zvm.zomeProxy.getAllRootAnchors();
  }


  async scanLeafAnchors(rootAnchor: TypedAnchor) {
    const leafAnchors = await this._zvm.zomeProxy.getLeafAnchors(rootAnchor);
  }


  // updated() {
  //   console.log("AnchorTree.updated()")
  //   var busyIndicator = document.getElementById("busy") as any; // Tree
  //   const rootTree = this.shadowRoot.getElementById("rootAnchorTree") as HTMLElement;
  //   rootTree.addEventListener("item-toggle", function(e) {
  //     console.log("ITEM TOGGLE FTW")
  //   });
  // }

  async toggleRootTreeItem(event:any) {
    const busyIndicator = this.shadowRoot.getElementById("busy") as any; // Tree
    console.log("toggleRootTreeItem()")
    let rootItem = event.detail.item /* as TreeItem */; // get the node that is toggled

    /* Handle AnchorBranch */
    if (rootItem.id.length > 8 && rootItem.id.substring(0, 8) === "anchor__") {
      if (rootItem.expanded) {
        return;
      }
      event.preventDefault(); // do not let the toggle button switch yet
      let itemTexts = [];
      for (const item of rootItem.items) {
        itemTexts.push(item.text);
      }
      busyIndicator.active = true; // block the tree from the user
      const rootAnchor: TypedAnchor = {anchor: rootItem.text, zomeIndex: 1, linkIndex: 1}; // Lookup in ThreadsLinkTypeType
      const leafAnchors = await this._zvm.zomeProxy.getLeafAnchors(rootAnchor);
      console.log({leafAnchors})
      for (const leafAnchor of leafAnchors) {
        if (itemTexts.includes(leafAnchor.anchor)) {
          continue;
        }
        var newItem = document.createElement("ui5-tree-item") as any; // TreeItem
        newItem.text = leafAnchor.anchor;
        newItem.id = "leaf__" + leafAnchor.anchor;
        newItem.hasChildren = true;
        rootItem.appendChild(newItem); // add the newly fetched node to the tree
      }
      rootItem.toggle(); // now manually switch the toggle button
      busyIndicator.active = false; // unblock the tree

    } else {

      /** Handle AnchorLeaf */
      if (rootItem.id.length > 8 && rootItem.id.substring(0, 6) === "leaf__") {
        if (rootItem.expanded) {
          return;
        }
        event.preventDefault(); // do not let the toggle button switch yet

        const linkKeys = Object.keys(ThreadsLinkTypeType);
        let itemHashs = [];
        for (const item of rootItem.items) {
          itemHashs.push(item.id);
        }

        busyIndicator.active = true; // block the tree from the user

        const rootAnchor: TypedAnchor = {anchor: rootItem.text, zomeIndex: 1, linkIndex: 1}; // Lookup in ThreadsLinkTypeType
        const leafLinks = await this._zvm.zomeProxy.getLeafs({typedAnchor: rootAnchor, linkIndex: 3}); // Lookup in ThreadsLinkTypeType
        console.log({leafLinks})
        for (const leafLink of leafLinks) {
          const tag = new TextDecoder().decode(new Uint8Array(leafLink.tag));
          const hash = encodeHashToBase64(new Uint8Array(leafLink.target));

          if (itemHashs.includes(hash)) {
            continue;
          }
          var newItem = document.createElement("ui5-tree-item") as any; // TreeItem
          newItem.text = hash;
          newItem.additionalText = linkKeys[leafLink.index] +"::" + tag
          newItem.id = hash;
          rootItem.appendChild(newItem); // add the newly fetched node to the tree
        }
        rootItem.toggle(); // now manually switch the toggle button
        busyIndicator.active = false; // unblock the tree
      }
    }
  }


  /** */
  render() {
    console.log(`<anchor-tree> render(): ${this.cell.print()}`);

    const rootAnchorTree = this.renderRootAnchorTree(this._rootAnchors);

    /** render all */
    return html`
        <div style="background: lightcyan; padding-bottom: 5px">
        <h3>Anchor Tree component</h3>
        <button @click="${async () => {
            console.log("*** Scan Root Anchors:");
            await this.scanRootAnchors();}
        }">Scan Root Anchors</button>
        <div>
        ${rootAnchorTree}
        </div>
        </div>
    `;

  }

}
