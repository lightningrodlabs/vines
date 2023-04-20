import {css, html} from "lit";
import {property, state} from "lit/decorators.js";
import {ZomeElement} from "@ddd-qc/lit-happ";
import {ThreadsPerspective, ThreadsZvm} from "../viewModels/threads.zvm";

import "@ui5/webcomponents/dist/List.js"
import "@ui5/webcomponents/dist/StandardListItem.js";


/**
 * @element
 */
export class SemanticTopicList extends ZomeElement<ThreadsPerspective, ThreadsZvm> {

  constructor() {
    super(ThreadsZvm.DEFAULT_ZOME_NAME);
    console.log("<semantic-topic-list>.ctor()")
  }


  /** */
  async onCreateSemanticTopic(e: any) {
    const input = this.shadowRoot.getElementById("labelInput") as HTMLInputElement;
    let res = await this._zvm.publishSemanticTopic(input.value);
    //console.log("onCreateList() res:", res)
    input.value = "";
  }


  /** */
  onSelectionChange(event) {
    let items = event.detail.selectedItems /* as TreeItem */; // get the node that is toggled
    if (items.length == 0) {
      return;
    }
    console.log("<semantic-topic-list>.onSelectionChange()", items[0].id)
    this.dispatchEvent(new CustomEvent('selected', {detail: items[0].id, bubbles: true, composed: true}));
  }


  /** */
  render() {
    console.log(`<semantic-topic-list> render(): ${this.cell.print()}`);

    //console.log("label-list:", this.perspective.names)

    const stLi = Object.entries(this.perspective.semanticTopics).map(
      ([b64, title]) => {
        return html`<ui5-li id="${b64}" additional-text="${b64}">${title}</ui5-li>`
      }
    );


    /** render all */
    return html`
        <ui5-list mode="SingleSelect" header-text="Semantic Topics" no-data-text="No Data Available"
                  style="width: 400px; margin-bottom: 10px;"
                  @selection-change="${this.onSelectionChange}">
            ${stLi}
        </ui5-list>
        <label for="labelInput">Create new Semantic Topic:</label>
        <input type="text" id="labelInput" name="Value">
        <input type="button" value="create" @click=${this.onCreateSemanticTopic}>        
    `;

  }

}
