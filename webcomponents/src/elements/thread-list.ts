import {css, html} from "lit";
import {property, state} from "lit/decorators.js";
import {ZomeElement} from "@ddd-qc/lit-happ";
import {ThreadsPerspective, ThreadsZvm} from "../viewModels/threads.zvm";

import "@ui5/webcomponents/dist/List.js"
import "@ui5/webcomponents/dist/StandardListItem.js";

/**
 * @element
 */
export class ThreadList extends ZomeElement<ThreadsPerspective, ThreadsZvm> {

  constructor() {
    super(ThreadsZvm.DEFAULT_ZOME_NAME);
    console.log("<semantic-topic-list>.ctor()")
  }


  @property()
  topic: string = ''


  onSelectionChange(event) {
    let items = event.detail.selectedItems /* as TreeItem */; // get the node that is toggled
    if (items.length == 0) {
      return;
    }
    console.log("onSelectionChange()", event, items[0].id)
    this.dispatchEvent(new CustomEvent('threadSelected', {detail: items[0].id, bubbles: true, composed: true}));

  }

  /** */
  render() {
    console.log("<thread-list> render():", this.topic);

    //console.log("label-list:", this.perspective.names)

    let threadsLi = [html`<span>None</span>`];
    if (this.topic != "") {
      const maybeThreads = this.perspective.threadsByTopic[this.topic];
      if (maybeThreads) {
        threadsLi = maybeThreads.map(
          (ah) => {
            const pp = this._zvm.getParticipationProtocol(ah);
            return html`
                <ui5-li id="${ah}">${pp.purpose}</ui5-li>`
          }
        );
      }
    }

    /** render all */
    return html`
        <ui5-list mode="SingleSelect" header-text="Topic threads: ${this.topic}" no-data-text="No Data Available"
        @selection-change="${this.onSelectionChange}">
            ${threadsLi}
        </ui5-list>
    `;

  }

}
