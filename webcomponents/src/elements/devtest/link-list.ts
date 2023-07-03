import {css, html, PropertyValues, TemplateResult} from "lit";
import {property, state, customElement} from "lit/decorators.js";
import {ScopedZomeTypes, ZomeElement} from "@ddd-qc/lit-happ";
import {ThreadsZvm} from "../../viewModels/threads.zvm";
import {ThreadsLinkTypeType} from "../../bindings/threads.types";
import {AnyDhtHashB64, encodeHashToBase64, ZomeName} from "@holochain/client";
import {ItemLink} from '../../bindings/deps.types';
import {ThreadsPerspective} from "../../viewModels/threads.perspective";
import {utf32Decode} from "./threads-devtest-page";

import "@ui5/webcomponents/dist/Tree.js"
import "@ui5/webcomponents/dist/TreeItem.js";
import "@ui5/webcomponents/dist/BusyIndicator.js";


/**
 * @element
 */
@customElement("link-list")
export class LinkList extends ZomeElement<ThreadsPerspective, ThreadsZvm> {

  constructor() {
    super(ThreadsZvm.DEFAULT_ZOME_NAME);
    console.log("<link-list>.ctor()", this.rootHash);
  }


  @property() rootHash: AnyDhtHashB64;

  @state() private _itemLinks: ItemLink[];


  @state() private _zomes: ZomeName[];
  @state() private _selectedZomeLinks: ScopedZomeTypes;
  @state() private _linkTypes: ScopedZomeTypes;
  @state() private _linkTypeFilter: number;


  /** */
  async scanRoot() {
    console.log("<link-list>.scanRoot()", this.rootHash);
    const b64 = new TextEncoder().encode(this.rootHash);
    this._itemLinks = await this._zvm.zomeProxy.getAllItemsFromB64(b64);
  }


  /** */
   shouldUpdate(changedProperties: PropertyValues<this>) {
    super.shouldUpdate(changedProperties);
    //console.log("ZomeElement.shouldUpdate() start", !!this._zvm, this.installedCell);
    if (changedProperties.has("rootHash") && this._zvm) {
      this.scanRoot();
    }
    return true;
  }


  /** */
  protected async zvmUpdated(newZvm: ThreadsZvm, oldZvm?: ThreadsZvm): Promise<void> {
    console.log("<link-list>.zvmUpdated()", this.rootHash);
    const zi = await newZvm.zomeProxy.zomeInfo();
    console.log({zi});
    this._linkTypes = zi.zome_types.links;
    const di = await newZvm.zomeProxy.dnaInfo();
    this._zomes = di.zome_names;
  }


  /** */
  renderLinkTree(): TemplateResult<1> {
    const linkKeys = Object.keys(ThreadsLinkTypeType);
    if (!this._itemLinks) {
      return html`No root set`
    }
    let children = this._itemLinks.map((ll) => {
        if (this._linkTypeFilter && ll.linkIndex != this._linkTypeFilter) {
          return html``;
        }
        //console.log("renderLinKTree()", ll.tag);
        let tag;
        /** Tag can be a normal string or a Component in utf32 */
        try {
          tag = utf32Decode(new Uint8Array(ll.tag.slice(2)));
        } catch(e) {
          tag = new TextDecoder().decode(new Uint8Array(ll.tag));
        }
        const hash = encodeHashToBase64(new Uint8Array(ll.itemHash));
        const additionalText = tag? linkKeys[ll.linkIndex] + " | " + tag : linkKeys[ll.linkIndex];
        return html`<ui5-tree-item id="${hash}" text="${hash}" additional-text="${additionalText}"></ui5-tree-item>`
      });
    console.log({children})
    const header = "Root: " + this.rootHash;
    return html`
      <ui5-busy-indicator id="busy" style="width: 100%">
        <ui5-tree id="linkTree" mode="None" header-text="${header}" no-data-text="No links found">
          ${children}
        </ui5-tree>
      </ui5-busy-indicator>
    `
  }


  /** */
  async onZomeSelect(e: any) {
    //console.log("onZomeSelect() CALLED", e)
    //this._selectedZomeLinks = this._zv
  }


  /** */
  async onLinkTypeSelect(e: any) {
    //console.log("onLinkTypeSelect() CALLED", e)
    const selector = this.shadowRoot!.getElementById("linkTypeSelector") as HTMLSelectElement;
    if (!selector || !selector.value) {
      console.warn("No list selector value", selector);
      return;
    }
    console.log("onLinkTypeSelect() value", Number(selector.value))
    this._linkTypeFilter = Number(selector.value);
  }



  /** */
  render() {
    //console.log(`<link-list> render(): ${this.rootHash}`);
    if (!this._zomes) {
      return html`Loading...`;
    }

    /** render all */
    return html`
        <div style="background: darkseagreen; padding-bottom: 5px">
          <h3>Link Tree component</h3>
            Filter by:
            <select name="zomeSelector" id="zomeSelector" @click=${this.onZomeSelect}>
                ${Object.values(this._zomes).map(
                        (zomeName) => {
                            return html`<option>${zomeName}</option>`
                        }
                )}
            </select>
            <select name="linkTypeSelector" id="linkTypeSelector" @click=${this.onLinkTypeSelect}>
                ${this._linkTypes[0].map(
                        (linkIndex) => {
                            return html`<option>${linkIndex}</option>`
                        }
                )}
            </select>
            <button @click="${() => {this._linkTypeFilter = undefined;}}">Reset</button>
            <div>
            ${this.renderLinkTree()}
          </div>
        </div>
    `;
  }

}
