import {css, html} from "lit";
import {property, state} from "lit/decorators.js";
import {ZomeElement} from "@ddd-qc/lit-happ";
import {ThreadsPerspective, ThreadsZvm} from "../viewModels/threads.zvm";


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
  render() {
    console.log(`<semantic-topic-list> render(): ${this.cell.print()}`);

    //console.log("label-list:", this.perspective.names)

    const stLi = Object.entries(this.perspective.semanticTopics).map(
      ([_b64, title]) => {
        return html`<li>${title}</li>`
      }
    );

    /** render all */
    return html`
        <h3>Semantic Topics</h3>
        <label for="labelInput">New label:</label>
        <input type="text" id="labelInput" name="Value">
        <input type="button" value="create" @click=${this.onCreateSemanticTopic}>
        <ul>
            ${stLi}
        </ul>
    `;

  }

}
