import {css, html, PropertyValues} from "lit";
import {property, state, customElement} from "lit/decorators.js";
import {ZomeElement} from "@ddd-qc/lit-happ";
import {ThreadsZvm} from "../../viewModels/threads.zvm";

import {decodeHashFromBase64} from "@holochain/client";
import {SemanticTopic} from "../../bindings/threads.types";
import {ThreadsPerspective} from "../../viewModels/threads.perspective";

import "@ui5/webcomponents/dist/List.js";
import "@ui5/webcomponents/dist/StandardListItem.js";

/**
 * @element
 */
@customElement("thread-list")
export class ThreadList extends ZomeElement<ThreadsPerspective, ThreadsZvm> {

  constructor() {
    super(ThreadsZvm.DEFAULT_ZOME_NAME);
    console.log("<thread-list>.ctor()")
  }


  @property()
  topicHash: string = ''

  @state() private _topicObj: SemanticTopic;


  /** */
  shouldUpdate(changedProperties: PropertyValues<this>) {
    const canUpdate = super.shouldUpdate(changedProperties);
    //if (!canUpdate) return false;

    //console.log("ZomeElement.shouldUpdate() start", !!this._zvm, this.installedCell);
    if (changedProperties.has("topicHash") && this._zvm) {
      console.log("<thread-list>.shouldUpdate()", changedProperties, this.topicHash)
      this._zvm.zomeProxy.getTopic(decodeHashFromBase64(this.topicHash))
        .then((t) => this._topicObj = t)
    }
    return true;
  }


  /** */
  async onSelectionChange(event) {
    let items = event.detail.selectedItems /* as TreeItem */; // get the node that is toggled
    if (items.length == 0) {
      return;
    }
    console.log("onSelectionChange()", event, items[0].id);
    await this.updateComplete;
    this.dispatchEvent(new CustomEvent('selected', {detail: items[0].id, bubbles: true, composed: true}));
  }


  /** */
  render() {
    console.log("<thread-list> render():", this.topicHash);

    if (!this._topicObj) {
      return html `<div>!!Topic data not found!!</div>`;
    }


    let threadsLi = [html`<span>None</span>`];
    if (this.topicHash != "") {
      const maybeThreads = this.perspective.threadsPerSubject[this.topicHash];
      if (maybeThreads) {
        threadsLi = maybeThreads.map(
          (ah) => {
            const pp = this._zvm.getParticipationProtocol(ah);
            return html`
                <ui5-li id="${ah}" additional-text="${ah}">${pp? pp.purpose : "<error>"}</ui5-li>`
          }
        );
      }
    }

    /** render all */
    return html`
        <ui5-list mode="SingleSelect" header-text="Topic threads: ${this._topicObj.title}" no-data-text="No Data Available"
                  style="width: 400px; margin-bottom: 10px;"
                  @selection-change="${this.onSelectionChange}">
            ${threadsLi}
        </ui5-list>
    `;

  }

}
