import {css, html, TemplateResult} from "lit";
import {property, state} from "lit/decorators.js";
import {ZomeElement} from "@ddd-qc/lit-happ";
import {ThreadsPerspective, ThreadsZvm} from "../../viewModels/threads.zvm";
import {ThreadsLinkTypeType, TypedAnchor} from "../../bindings/threads.types";
import {encodeHashToBase64} from "@holochain/client";

import Tree from "@ui5/webcomponents/dist/Tree"
import TreeItem from "@ui5/webcomponents/dist/TreeItem";
import "@ui5/webcomponents/dist/BusyIndicator.js";


/** */
function anchorLeaf(anchor: String): string {
  const subs = anchor.split(".");
  //console.log("anchorLeaf()", anchor, subs)
  if (subs.length < 2) {return subs[0]}
  return subs[subs.length - 2];
}


/** */
function anchor2TreeItem(anchor: string) {
  console.log("anchor2TreeItem()", anchor)
  const id = "anchor__" +  anchor;
  return html`<ui5-tree-item id="${id}" text="${anchor}" anchor="${anchor}" has-children></ui5-tree-item>`
}


/**
 * @element
 */
export class AnchorTree extends ZomeElement<ThreadsPerspective, ThreadsZvm> {

  constructor() {
    super(ThreadsZvm.DEFAULT_ZOME_NAME);
    console.log("<anchor-tree>.ctor()")
  }


  @state() private _rootAnchors: string[] = [];

  @property()
  canProbeLeafAnchorsDirectly: boolean = false; // TODO: set probing behavior to traverse the AnchorTree directly on first expand or not

  // TODO: Implement ExpandAll button
  // TODO: Add refresh buttons to branch items

  /** */
  renderLeafAnchor(rootAnchors: TypedAnchor[]): TemplateResult<1> {
    return html``;
  }

  /** */
  async expandAll(): Promise<void> {
    // FIXME
  }


  /** */
  async scanRootAnchors(): Promise<void> {
    const typed = await this._zvm.zomeProxy.getAllRootAnchors();
    this._rootAnchors = typed.map((ta) => ta.anchor);
  }


  /** */
  renderAnchorTree(rootAnchors: string[]): TemplateResult<1> {
    const children = rootAnchors.map((anchor) => {
      return anchor2TreeItem(anchor)
    });
    console.log({children})
    const header = "Root Anchors";
    return html`
      <ui5-busy-indicator id="busy" style="width: 100%">
        <ui5-tree id="rootAnchorTree" mode="None" header-text="${header}" no-data-text="No Anchors found"
                  @item-toggle="${this.toggleRootTreeItem}"
                  @click="${this.clickTree}"
        >
          ${children}
        </ui5-tree>
      </ui5-busy-indicator>
    `
  }


  /** */
  async clickTree(event:any) {
    console.log("<anchor-tree> click event:", event)
    console.log("<anchor-tree> click event:", event.target.id);
    /** Hacky way to know it's a hash */
    if (event.target.id.substring(0, 3) == "uhC") {
      this.dispatchEvent(new CustomEvent('hashSelected', {detail: event.target.id, bubbles: true, composed: true}));

    }
  }

  /** */
  async toggleRootTreeItem(event:any) {
    const busyIndicator = this.shadowRoot.getElementById("busy") as any;
    let rootItem = event.detail.item /* as TreeItem */; // get the node that is toggled
    console.log("toggleRootTreeItem()", rootItem.id, rootItem.getAttribute("anchor"))

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

      const tas = await this._zvm.getAllSubAnchors(rootItem.getAttribute("anchor"));
      console.log({tas})

      /** Handle LeafAnchor */
      if (tas.length == 0) {
        const linkKeys = Object.keys(ThreadsLinkTypeType);
        let itemHashs = [];
        for (const item of rootItem.items) {
          itemHashs.push(item.id);
        }

        const leafLinks = await this._zvm.zomeProxy.getAllLeafLinksFromAnchor(rootItem.getAttribute("anchor"));
        console.log({leafLinks})
        for (const leafLink of leafLinks) {
          const tag = new TextDecoder().decode(new Uint8Array(leafLink.tag));
          const hash = encodeHashToBase64(new Uint8Array(leafLink.target));

          if (itemHashs.includes(hash)) {
            continue;
          }
          var newItem = document.createElement("ui5-tree-item") as TreeItem;
          newItem.text = hash;
          newItem.additionalText = tag? linkKeys[leafLink.index] + " | " + tag : linkKeys[leafLink.index];
          newItem.setAttribute("anchor", rootItem.anchor);
          newItem.id = hash;
          newItem.level = rootItem.level + 1;
          rootItem.appendChild(newItem); // add the newly fetched node to the tree
        }
      }

      /** Handle BranchAnchor */
      for (const ta of tas) {
        const leafComponent = anchorLeaf(ta.anchor);
        /* Skip if item already exists */
        if (itemTexts.includes(leafComponent)) {
          continue;
        }
        let newItem = document.createElement("ui5-tree-item") as TreeItem;
        newItem.text = leafComponent;
        newItem.additionalText = ta.anchor;
        newItem.setAttribute("anchor", ta.anchor);
        newItem.id = "anchor__" + ta.anchor;
        newItem.hasChildren = true;
        newItem.level = rootItem.level + 1;
        rootItem.appendChild(newItem); // add the newly fetched node to the tree
      }

      rootItem.toggle(); // now manually switch the toggle button
      busyIndicator.active = false; // unblock the tree

    }
    // /** Handle AnchorLeaf */
    // if (rootItem.id.length > 8 && rootItem.id.substring(0, 6) === "leaf__") {
    //   if (rootItem.expanded) {
    //     return;
    //   }
    //   event.preventDefault(); // do not let the toggle button switch yet
    //
    //   const linkKeys = Object.keys(ThreadsLinkTypeType);
    //   let itemHashs = [];
    //   for (const item of rootItem.items) {
    //     itemHashs.push(item.id);
    //   }
    //
    //   busyIndicator.active = true; // block the tree from the user
    //
    //   const rootAnchor: TypedAnchor = {anchor: rootItem.text, zomeIndex: 1, linkIndex: 1}; // Lookup in ThreadsLinkTypeType
    //   const leafLinks = await this._zvm.zomeProxy.getLeafs({typedAnchor: rootAnchor, linkIndex: 3}); // Lookup in ThreadsLinkTypeType
    //   console.log({leafLinks})
    //   for (const leafLink of leafLinks) {
    //     const tag = new TextDecoder().decode(new Uint8Array(leafLink.tag));
    //     const hash = encodeHashToBase64(new Uint8Array(leafLink.target));
    //
    //     if (itemHashs.includes(hash)) {
    //       continue;
    //     }
    //     var newItem = document.createElement("ui5-tree-item") as any; // TreeItem
    //     newItem.text = hash;
    //     newItem.additionalText = linkKeys[leafLink.index] + "::" + tag
    //     newItem.id = hash;
    //     rootItem.appendChild(newItem); // add the newly fetched node to the tree
    //   }
    //   rootItem.toggle(); // now manually switch the toggle button
    //   busyIndicator.active = false; // unblock the tree
    // }
  }


  /** */
  render() {
    console.log(`<anchor-tree> render(): ${this.cell.print()}`);

    /** render all */
    return html`
        <div style="background: lightcyan; padding-bottom: 5px">
          <h3>Anchor Tree component</h3>
            <button @click="${async () => {
                console.log("*** Scan Root Anchors:");
                await this.scanRootAnchors();}
            }">
                Scan Root Anchors
            </button>
            <button @click="${async () => {
                console.log("*** expandAll");
                await this.expandAll();}
            }">Expand All</button>            
          <div>
            ${this.renderAnchorTree(this._rootAnchors)}
          </div>
        </div>
    `;

  }

}
