import {css, html} from "lit";
import {property, state} from "lit/decorators.js";
import { DnaElement } from "@ddd-qc/lit-happ";
import {AgentPubKeyB64, AnyDhtHashB64, encodeHashToBase64, EntryHashB64} from "@holochain/client";
import {ThreadsDvm} from "../viewModels/threads.dvm";


/**
 * @element tasker-page
 */
export class ThreadsTestPage extends DnaElement<unknown, ThreadsDvm> {

  constructor() {
    super(ThreadsDvm.DEFAULT_BASE_ROLE_NAME)
  }

  /** -- Fields -- */
  @state() private _initialized = false;
  @state() private _selectedTopicHash?: AnyDhtHashB64;

  @property({ type: Boolean, attribute: 'debug' })
  debugMode: boolean = false;


  // @property({type: Object, attribute: false, hasChanged: (_v, _old) => true})
  // taskerPerspective!: TaskerPerspective;


  /** -- Methods -- */

  // protected async dvmUpdated(newDvm: TaskerDvm, oldDvm?: TaskerDvm): Promise<void> {
  //   console.log("<tasker-page>.dvmUpdated()");
  //   if (oldDvm) {
  //     console.log("\t Unsubscribed to taskerZvm's roleName = ", oldDvm.taskerZvm.cell.name)
  //     oldDvm.taskerZvm.unsubscribe(this);
  //   }
  //   newDvm.taskerZvm.subscribe(this, 'taskerPerspective');
  //   console.log("\t Subscribed taskerZvm's roleName = ", newDvm.taskerZvm.cell.name)
  //   newDvm.probeAll();
  //   this._selectedTopicHash = undefined;
  //   //this.taskerPerspective = emptyTaskerPerspective;
  //   this._initialized = true;
  // }



  // /** After first render only */
  // async firstUpdated() {
  //   this._initialized = true;
  // }


  /** */
  async refresh(_e?: any) {
    //console.log("tasker-page.refresh() called")
    await this._dvm.probeAll();
  }



  /** */
  async onCreateSemanticTopic(e: any) {
    const input = this.shadowRoot!.getElementById("listTitleInput") as HTMLInputElement;
    let res = await this._dvm.threadsZvm.publishSemanticTopic(input.value);
    //console.log("onCreateList() res:", res)
    input.value = "";
  }


  /** */
  async onSemanticTopicSelect(e: any) {
    console.log("onSemanticTopicSelect() CALLED", e)
    const selector = this.shadowRoot!.getElementById("listSelector") as HTMLSelectElement;
    if (!selector || !selector.value) {
      console.warn("No list selector value", selector);
      return;
    }
    console.log("onListSelect() value", selector.value)
    this._selectedTopicHash = selector.value;
    this.requestUpdate();
  }


  /** */
  render() {
    console.log("<threads-test-page.render()> render()", this._initialized, this._selectedTopicHash);
    if (!this._initialized) {
      return html`<span>Loading...</span>`;
    }
    console.log("\t Using threadsZvm.roleName = ", this._dvm.threadsZvm.cell.name)

    let sts = this._dvm.threadsZvm.perspective.semanticTopics;
    console.log("<threads-test-page.render()> render() sts", sts);


    const stLi = Object.entries(sts).map(
      ([_b64, title]) => {
        //console.log("localTaskList.item:", ahB64)
        return html `<li>${title}</li>`
      }
    )

    const stOption = Object.entries(sts).map(
      ([b64, title]) => {
        //console.log("taskList:", ahB64)
        return html `<option value="${b64}">${title}</option>`
      }
    )

    let selectedTopicHtml = html `<h3>none</h3>`
    if (this._selectedTopicHash) {
      selectedTopicHtml = html`
        <span><b>${this._dvm.threadsZvm.perspective.semanticTopics[this._selectedTopicHash]}</b> ${this._selectedTopicHash}</span>
      `;
    }

    /** Render all */
    return html`
      <div>
        <h1>Threads test page</h1>
        <h3>Semantic Topics</h3>
        <ul>${stLi}</ul>
          <label for="listTitleInput">New Semantic Topic:</label>
          <input type="text" id="listTitleInput" name="title">
          <input type="button" value="create" @click=${this.onCreateSemanticTopic}>
        <h2>
          Selected List:
          <select name="listSelector" id="listSelector" @click=${this.onSemanticTopicSelect}>
            ${stOption}
          </select>
        </h2>
        ${selectedTopicHtml}
      </div>
    `;
  }

}
