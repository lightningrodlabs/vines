import {css, html} from "lit";
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
  return html`<ui5-tree-item text="${ta.anchor}"></ui5-tree-item>`
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


  rootAnchor2Tree(rootAnchors: TypedAnchor[]) {
    const children = rootAnchors.map((ta) => {
      return typedAnchor2TreeItem(ta)
    });
    console.log({children})
    return html`
      <ui5-busy-indicator id="busy" class="full-width">
        <ui5-tree id="rootAnchorTree" mode="None" header-text="Root Anchors" no-data-text="No root Anchors found">
            ${children}
        </ui5-tree>
      </ui5-busy-indicator>
    `
  }


  async scanRootAnchors() {
    this._rootAnchors = await this._zvm.zomeProxy.getAllRootAnchors();
  }


  async printChildren(root_ta: TypedAnchor) {
    const linkKeys = Object.keys(ThreadsLinkTypeType);
    const children = await this._zvm.zomeProxy.getAllSubAnchors(root_ta.anchor);
    //console.log({children})
    if (children.length == 0) {
      const links = await this._zvm.zomeProxy.getAnchorAllLeafLinks(root_ta);
      if (links.length > 0) {
        const tag = new TextDecoder().decode(new Uint8Array(links[0].tag));
        const leaf = root_ta.anchor + tag
        console.log(`  - Anchor: LinkType="${linkKeys[root_ta.linkIndex]}" path="${leaf}"`);
      }
      for (const link of links) {
        const tag = new TextDecoder().decode(new Uint8Array(link.tag));
        const hash = encodeHashToBase64(new Uint8Array(link.target));
        console.log(`    - LeafLink: LinkType="${linkKeys[link.index]}" tag="${tag}" hash="${hash}"`);
      }
    } else {
      for (const ta of children) {
        console.log(`  - Anchor: LinkType="${linkKeys[ta.linkIndex]}" path="${ta.anchor}"`);
        await this.printChildren(ta);
      }
    }
  }


  /** */
  render() {
    console.log(`<anchor-tree> render(): ${this.cell.print()}`);

    const stLi = Object.entries(this.perspective.semanticTopics).map(
      ([_b64, title]) => {
        return html`<li>${title}</li>`
      }
    );

    const rootAnchorTree = this.rootAnchor2Tree(this._rootAnchors);

    /** render all */
    return html`
        <h3>Anchor Tree</h3>
        <button @click="${async () => {
            console.log("*** Scan Root Anchors:");
            await this.scanRootAnchors();}
        }">Scan Root Anchors</button>
        <ui5-busy-indicator id="busy">
            <ui5-tree id="treeDynamic" mode="None" header-text="header-lol">
                <ui5-tree-item text="Child 1"></ui5-tree-item>
                <ui5-tree-item text="Child 2"></ui5-tree-item>                
            </ui5-tree>
        </ui5-busy-indicator>
        <div>
        ${rootAnchorTree}
        </div>
    `;

  }

}
