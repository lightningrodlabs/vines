import {css, html, PropertyValues} from "lit";
import {property, state} from "lit/decorators.js";
import {ZomeElement} from "@ddd-qc/lit-happ";
import {ThreadsPerspective, ThreadsZvm} from "../viewModels/threads.zvm";

import "@ui5/webcomponents/dist/List.js"
import "@ui5/webcomponents/dist/StandardListItem.js";
import {decodeHashFromBase64} from "@holochain/client";
import {SemanticTopic} from "../bindings/threads.types";

/**
 * @element
 */
export class ThreadList extends ZomeElement<ThreadsPerspective, ThreadsZvm> {

  constructor() {
    super(ThreadsZvm.DEFAULT_ZOME_NAME);
    console.log("<thread-list>.ctor()")
  }


  @property()
  topic: string = ''

  @state() private _topicObj: SemanticTopic;


  /** */
  shouldUpdate(changedProperties: PropertyValues<this>) {
    super.shouldUpdate(changedProperties);
    //console.log("ZomeElement.shouldUpdate() start", !!this._zvm, this.installedCell);
    if (changedProperties.has("topic") && this._zvm) {
      console.log("<thread-list>.shouldUpdate()", changedProperties, this.topic)
      this._zvm.zomeProxy.getTopic(decodeHashFromBase64(this.topic))
        .then((t) => this._topicObj = t)
    }
    return true;
  }


  /** */
  onSelectionChange(event) {
    let items = event.detail.selectedItems /* as TreeItem */; // get the node that is toggled
    if (items.length == 0) {
      return;
    }
    console.log("onSelectionChange()", event, items[0].id)
    this.dispatchEvent(new CustomEvent('selected', {detail: items[0].id, bubbles: true, composed: true}));
  }


  /** */
  render() {
    console.log("<thread-list> render():", this.topic);

    if (!this._topicObj) {
      return html `<div>!!Topic data not found!!</div>`;
    }


    let threadsLi = [html`<span>None</span>`];
    if (this.topic != "") {
      const maybeThreads = this.perspective.threadsByTopic[this.topic];
      if (maybeThreads) {
        threadsLi = maybeThreads.map(
          (ah) => {
            const pp = this._zvm.getParticipationProtocol(ah);
            return html`
                <ui5-li id="${ah}" additional-text="${ah}">${pp.purpose}</ui5-li>`
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
