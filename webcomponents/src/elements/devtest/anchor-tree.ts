import {css, html, PropertyValues, TemplateResult} from "lit";
import {property, state, customElement} from "lit/decorators.js";
import {ZomeElement} from "@ddd-qc/lit-happ";
import {ThreadsZvm} from "../../viewModels/threads.zvm";
import {ThreadsLinkTypeType, TypedAnchor} from "../../bindings/threads.types";
import {AnyDhtHashB64, encodeHashToBase64} from "@holochain/client";

import {AnyLinkableHashB64, ThreadsPerspective} from "../../viewModels/threads.perspective";

import Tree from "@ui5/webcomponents/dist/Tree"
import TreeItem from "@ui5/webcomponents/dist/TreeItem";
import BusyIndicator from "@ui5/webcomponents/dist/BusyIndicator";
import "@ui5/webcomponents/dist/Tree.js"
import "@ui5/webcomponents/dist/TreeItem.js";
import "@ui5/webcomponents/dist/BusyIndicator.js";

import "@ui5/webcomponents/dist/Icon.js";
import Input from "@ui5/webcomponents/dist/Input";
import "@ui5/webcomponents/dist/Input.js";
import "@ui5/webcomponents/dist/features/InputSuggestions.js";







import {Base64} from "js-base64";


const ZOME_LINK_NAMES = Object.keys(ThreadsLinkTypeType);

export interface LinkTreeItem {
  origin:  AnyLinkableHashB64 | string /* Anchor */,
  /** Flattened ScopedLinkType */
  zomeIndex?: number,
  linkIndex?: number,
}


/** */
function getLeafComponent(anchor: String): string {
  const subs = anchor.split(".");
  /** Remove empty string at tail */
  if (subs.length > 0 && subs[subs.length - 1] == "") {
    subs.pop();
  }
  console.log("leafComponent()", anchor, subs)
  if (subs.length == 0) {return "<error>"}
  return subs[subs.length - 1];
}


/** */
function toLinkTreeItem(ti: TreeItem) {
  const lti = {
    origin: ti.getAttribute("origin"),
    zomeIndex: Number(ti.getAttribute("zomeIndex")),
    linkIndex:  Number(ti.getAttribute("linkIndex")),
  };
  //console.log("toLinkTreeItem()", ti, lti);
  return lti;
}


/** */
function toRootTreeItem(lti: LinkTreeItem) {
  //console.log("toTreeItem()", lti)
  const id = "anchor__" +  lti.origin;
  const linkTypeName = ZOME_LINK_NAMES[lti.linkIndex]
  return html`<ui5-tree-item id="${id}" text="${lti.origin}" additional-text="{${linkTypeName}}" has-children
                             origin="${lti.origin}" zomeIndex="${lti.zomeIndex}" linkIndex="${lti.linkIndex}"></ui5-tree-item>`
}


/**
 * Element for displaying a tree of Links
 * An AnchorTree is a tree of all Paths using the same link-type
 * Purpose:
 * 1. Display all links all types from ROOT
 * 2. Display all links all types from any linkable hash
 * 3. Display all links of same link-type from some Anchor (i.e. AnchorTree)
 *    b. with Items
 */
@customElement("anchor-tree")
export class AnchorTree extends ZomeElement<ThreadsPerspective, ThreadsZvm> {

  constructor() {
    super(ThreadsZvm.DEFAULT_ZOME_NAME);
    //console.log("<anchor-tree>.ctor()")
  }


  @property() root: AnyDhtHashB64 | TypedAnchor | undefined = undefined

  @state() private _level0: LinkTreeItem[] = [];

  //@state() private _isTyped = true;


  @property()
  canProgressiveWalk: boolean = true; // TODO: set probing behavior to traverse the AnchorTree directly on first expand or not

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


  /** Probe rootAnchors at startup */
  protected firstUpdated() {
    this.probeRootAnchors();
  }


  // /** */
  // protected zvmUpdated(newZvm: ThreadsZvm, oldZvm?: ThreadsZvm): Promise<void> {
  //   super.zvmUpdated(newZvm, oldZvm);
  //   this.probeRootAnchors();
  //   return;
  // }

  /** */
  shouldUpdate(changedProperties: PropertyValues<this>) {
    super.shouldUpdate(changedProperties);
    //console.log("<anchor-tree>.shouldUpdate()", changedProperties);
    if (changedProperties.has("root")) {
      //console.log("<anchor-tree>.shouldUpdate()", changedProperties);
      this.probeRootAnchors();
    }
    return true;
  }

  /** Set _rootAnchors to all anchors linking off ROOT */
  async probeRootAnchors(): Promise<void> {
    if (!this._zvm) {
      return;
    }
    const maybeTree = this.shadowRoot.getElementById("rootAnchorTree") as Tree;
    console.debug("probeRootAnchors()", maybeTree);
    if (maybeTree) {
      //maybeTree.innerHTML = '';
      // while (maybeTree.firstChild) {
      //   maybeTree.removeChild(maybeTree.firstChild);
      // }
    }
    if (this.root) {
      if (typeof this.root == 'string') {
        const b64 = new TextEncoder().encode(this.root);
        const itemLinks = await this._zvm.zomeProxy.getAllItemsFromB64(b64);
        this._level0 = itemLinks.map((il) => {return {origin: encodeHashToBase64(il.itemHash), zomeIndex: il.zomeIndex, linkIndex: il.linkIndex}});
      } else {
        /** AnchorTree */
        const tas = await this._zvm.zomeProxy.getTypedChildren(this.root);
        this._level0 = tas.map((ta) => {return {origin: ta.anchor, zomeIndex: ta.zomeIndex, linkIndex: ta.linkIndex}});

      }
    } else {
      /** AnchorTree from ROOT */
      let tas = await this._zvm.zomeProxy.getAllRootAnchors("threads_integrity");
      this._level0 = tas.map((ta) => {return {origin: ta.anchor, zomeIndex: ta.zomeIndex, linkIndex: ta.linkIndex}});
    }
  }


  /** */
  renderAnchorTree(): TemplateResult<1> {
    const level0Items = this._level0.map((lti) => {return toRootTreeItem(lti)});
    //console.log({level0: level0Items});

    /** */
    return html`
      <ui5-busy-indicator id="busy" style="width: 100%">
        <ui5-tree id="rootAnchorTree" mode="None" no-data-text="No links found"
                  @item-toggle="${this.toggleTreeItem}"
                  @click="${this.clickTree}"
        >
          ${level0Items}
        </ui5-tree>
      </ui5-busy-indicator>
    `
  }


  /** */
  async clickTree(event:any) {
    //console.log("<anchor-tree> click event:", event)
    console.log("<anchor-tree> click event:", event.target.id);
    /** Hacky way to know it's a hash */
    if (event.target.id.substring(0, 3) == "uhC") {
      await this.updateComplete;
      this.dispatchEvent(new CustomEvent('hashSelected', {detail: event.target.id, bubbles: true, composed: true}));

    }
  }


  /** onToggle fetch the children of the toggled anchor */
  async toggleTreeItem(event:any) {
    const busyIndicator = this.shadowRoot.getElementById("busy") as BusyIndicator;
    const toggledTreeItem = event.detail.item as TreeItem ; // get the node that is toggled
    const lti = toLinkTreeItem(toggledTreeItem);
    //const isTyped = !!this.root && typeof this.root == 'object';
    const isTyped = !!toggledTreeItem.getAttribute("linkIndex");

    console.log("toggleTreeItem()", lti.origin, isTyped);

    /* Handle TreeItem marked as "anchor__" */
    if (toggledTreeItem.id.length > 8 && toggledTreeItem.id.substring(0, 8) === "anchor__") {
      if (toggledTreeItem.expanded) {
        return;
      }
      event.preventDefault(); // do not let the toggle button switch yet
      busyIndicator.active = true; // block the tree from the user

      /** Keep already existing children */
      let currentItemTexts = [];
      for (const item of toggledTreeItem.items) {
        currentItemTexts.push((item as TreeItem).text);
      }
      console.log("toggleTreeItem() currentItemTexts", currentItemTexts, isTyped);

      /** Grab children */
      let any_children_tas = [];
      if (isTyped) {
        any_children_tas = await this._zvm.zomeProxy.getTypedChildren({anchor: lti.origin, zomeIndex: lti.zomeIndex, linkIndex: lti.linkIndex});
      }
      // else {
      //   let linkItems = await this._zvm.zomeProxy.getAllItems(lti.origin);
      //   //any_children_tas = await this._zvm.zomeProxy.getAllChildren(lti.origin);
      //
      // }
      console.log("toggleTreeItem() any_children_tas", any_children_tas);


      /** Handle branch */
      for (const ta of any_children_tas) {
        const leafComponent = getLeafComponent(ta.anchor);
        /* Skip if item already exists */
        if (currentItemTexts.includes(leafComponent)) {
          continue;
        }
        let newItem = document.createElement("ui5-tree-item") as TreeItem;
        newItem.text = leafComponent;
        newItem.additionalText = "[" + ta.anchor + "]";
        newItem.setAttribute("origin", ta.anchor);
        newItem.setAttribute("zomeIndex", ta.zomeIndex.toString());
        newItem.setAttribute("linkIndex", ta.linkIndex.toString());
        newItem.id = "anchor__" + ta.anchor;
        newItem.hasChildren = true;
        newItem.level = toggledTreeItem.level + 1;
        toggledTreeItem.appendChild(newItem); // add the newly fetched node to the tree
      }


      /** Handle LeafAnchor: Get Items */
      if (any_children_tas.length == 0) {
        let itemHashs = [];
        for (const item of toggledTreeItem.items) {
          itemHashs.push(item.id);
        }

        const itemLinks = await this._zvm.zomeProxy.getAllItems(toggledTreeItem.getAttribute("origin"));
        console.log({itemLinks})
        for (const itemLink of itemLinks) {
          const tag = new TextDecoder().decode(new Uint8Array(itemLink.tag));
          const hash = encodeHashToBase64(new Uint8Array(itemLink.itemHash));

          if (itemHashs.includes(hash)) {
            continue;
          }
          var newItem = document.createElement("ui5-tree-item") as TreeItem;
          newItem.text = hash;
          newItem.additionalText = tag ? ZOME_LINK_NAMES[itemLink.linkIndex] + " | " + tag : ZOME_LINK_NAMES[itemLink.linkIndex];
          newItem.setAttribute("origin", hash);
          // /** Set LinkType only if it's the same, in order to determine if we reached leafItems */
          // if (itemLink.zomeIndex.toString() == toggledTreeItem.getAttribute("zomeIndex") && itemLink.linkIndex.toString() == toggledTreeItem.getAttribute("linkIndex")) {
          //   newItem.setAttribute("zomeIndex", itemLink.zomeIndex.toString());
          //   newItem.setAttribute("linkIndex", itemLink.linkIndex.toString());
          // }
          newItem.id = hash;
          newItem.level = toggledTreeItem.level + 1;
          toggledTreeItem.appendChild(newItem); // add the newly fetched node to the tree
        }
      }

      toggledTreeItem.toggle(); // manually switch the toggle button
      busyIndicator.active = false; // unblock the tree

    }

  }


  /** */
  render() {
    //console.log("<anchor-tree>.render()", this.root);

    let title = "Tree of all Links from ROOT in " + this.cell.print()
    if (this.root) {
      if (typeof this.root == 'string') {
        title = `Tree of Links from ${this.root} in ${this.cell.print()}`
      } else {
        title = "AnchorTree from " + this.root.anchor
      }
    };
    /** render all */
    return html`
        <div style="background: lightcyan; padding-bottom: 5px">
          <h3>${title}</h3>
            <button @click=${this.onScanRoot}>
                Scan ROOT
            </button>
            <button style="display: none;" @click="${async () => {await this.expandAll();}}">
                Expand All
            </button>
            <ui5-input id="rootInput" type="Text" placeholder="root hash or path"
                       show-clear-icon
                       style="min-width: 400px;"></ui5-input>            
            <button @click=${this.onWalk}>Walk</button>
          <div>
            ${this.renderAnchorTree()}
          </div>
        </div>
    `;

  }


  /** */
  async onScanRoot(e:any) {
    this.root = undefined ;
    await this.probeRootAnchors();
    const input = this.shadowRoot.getElementById("rootInput") as Input;
    input.value = '';
  }


  /** */
  async onWalk(e:any) {
    const input = this.shadowRoot.getElementById("rootInput") as Input;
    if (!input.value) {
      this.root = undefined;
      return;
    }
    const isHash = Base64.isValid(input.value) &&  input.value.substring(0, 3) == "uhC"
    console.log("onWalk()", input.value, isHash)
    if (isHash) {
       this.root = input.value;
    } else {
      const maybeTypedAnchor = await this._zvm.zomeProxy.getTypedAnchor(input.value);
      console.log("onWalk()", maybeTypedAnchor)
      if (maybeTypedAnchor[1]) {
        this.root = maybeTypedAnchor[1];
      } else {
        this.root = maybeTypedAnchor[0] as AnyDhtHashB64;
      }
    }
  }
}
