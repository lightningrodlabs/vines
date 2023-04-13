import {css, html} from "lit";
import {property, state} from "lit/decorators.js";
import {CellContext, DnaElement} from "@ddd-qc/lit-happ";
import {AgentPubKeyB64, AnyDhtHashB64, encodeHashToBase64, EntryHashB64} from "@holochain/client";
import {ThreadsDvm} from "../viewModels/threads.dvm";
import {ThreadsPerspective} from "../viewModels/threads.zvm";
import {ThreadList} from "./thread-list";
import {ThreadsLinkTypeType} from "../bindings/threads.types";

function utf32Decode(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let result = '';

  for (let i = 0; i < bytes.length; i += 4) {
    result += String.fromCodePoint(view.getInt32(i, true));
  }

  return result;
}

/**
 * @element tasker-page
 */
export class ThreadsTestPage extends DnaElement<unknown, ThreadsDvm> {

  constructor() {
    super(ThreadsDvm.DEFAULT_BASE_ROLE_NAME)
  }

  /** -- Fields -- */
  @state() private _initialized = false;
  @state() private _selectedTopicHash: AnyDhtHashB64 = '';

  @property({ type: Boolean, attribute: 'debug' })
  debugMode: boolean = false;


  @property({type: Object, attribute: false, hasChanged: (_v, _old) => true})
  threadsPerspective!: ThreadsPerspective;


  /** -- Methods -- */

  protected async dvmUpdated(newDvm: ThreadsDvm, oldDvm?: ThreadsDvm): Promise<void> {
    console.log("<tasker-page>.dvmUpdated()");
    if (oldDvm) {
      console.log("\t Unsubscribed to threadsZvm's roleName = ", oldDvm.threadsZvm.cell.name)
      oldDvm.threadsZvm.unsubscribe(this);
    }
    newDvm.threadsZvm.subscribe(this, 'threadsPerspective');
    console.log("\t Subscribed threadsZvm's roleName = ", newDvm.threadsZvm.cell.name)
    // newDvm.probeAll();
    this._selectedTopicHash = '';
    this._initialized = true;
  }



  // /** After first render only */
  // async firstUpdated() {
  //   this._initialized = true;
  // }


  /** */
  async refresh(_e?: any) {
    //console.log("tasker-page.refresh() called")
    await this._dvm.probeAll();
  }


  async printRootAnchors() {
    const rootAnchors = await this._dvm.threadsZvm.zomeProxy.getAllRootAnchors();
    console.log({rootAnchors})
    const linkKeys = Object.keys(ThreadsLinkTypeType);
    for (const rootAnchor of rootAnchors) {
      const str = rootAnchor[1] // utf32Decode(new Uint8Array(child[1]));
      console.log(`  - Root anchor: Link type "${linkKeys[rootAnchor[0]]}": ${str}`);
      //await this.printChildren(str);
    }
  }

  async printChildren(root_anchor: string) {
    const linkKeys = Object.keys(ThreadsLinkTypeType);
    const children = await this._dvm.threadsZvm.zomeProxy.getAnchorChildren(root_anchor);
    //console.log({children})
    if (children.length == 0) {
      this.scanForLinks();
    } else {
      for (const child of children) {
        const str = child[1] // utf32Decode(new Uint8Array(child[1]));
        console.log(`${root_anchor} child: Link type: "${linkKeys[child[0]]}": ${str}`);
        await this.printChildren(str);
      }
    }
  }



  /** */
  async onCreateSemanticTopic(e: any) {
    const input = this.shadowRoot!.getElementById("listTitleInput") as HTMLInputElement;
    let res = await this._dvm.threadsZvm.publishSemanticTopic(input.value);
    //console.log("onCreateList() res:", res)
    input.value = "";
  }


  /** */
  async onCreateThread(e: any) {
    const input = this.shadowRoot!.getElementById("threadInput") as HTMLInputElement;
    let res = await this._dvm.threadsZvm.publishThreadFromSemanticTopic(this._selectedTopicHash, input.value);
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
    await this._dvm.threadsZvm.probeThreads(selector.value);
    this._selectedTopicHash = selector.value;
    this.requestUpdate();
    const tl = this.shadowRoot.getElementById("threadList") as ThreadList;
    tl.requestUpdate();
  }


  /** */
  render() {
    console.log("<threads-test-page.render()> render()", this._initialized, this._selectedTopicHash);
    if (!this._initialized) {
      return html`<span>Loading...</span>`;
    }
    //console.log("\t Using threadsZvm.roleName = ", this._dvm.threadsZvm.cell.name)

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
    if (this._selectedTopicHash != "") {
      selectedTopicHtml = html`
        <span><b>${this._dvm.threadsZvm.perspective.semanticTopics[this._selectedTopicHash]}</b> ${this._selectedTopicHash}</span>
      `;
    }

    /** Render all */
    return html`
      <div>
          <button @click="${async () => {
            console.log("*** explore Semantic Topics:");
            await this.printChildren("all_semantic_topics");}
          }">Explore Semantic Topics</button>
          <button @click="${async () => {
              console.log("*** explore root Anchors:");
              await this.printRootAnchors();}
          }">Explore Root Anchors</button>
          <h1>Threads test page</h1>
        <h3>Semantic Topics</h3>
        <ul>${stLi}</ul>
        <label for="listTitleInput">Add new Semantic Topic:</label>
        <input type="text" id="listTitleInput" name="title">
        <input type="button" value="create" @click=${this.onCreateSemanticTopic}>
        <h2>
          Selected List:
          <select name="listSelector" id="listSelector" @click=${this.onSemanticTopicSelect}>
            ${stOption}
          </select>
        </h2>
        ${selectedTopicHtml}
        <div>
            <thread-list id="threadList" .topic="${this._selectedTopicHash}" ></thread-list>
        </div>
        <div>
          <label for="threadInput">Create new thread:</label>
          <input type="text" id="threadInput" name="purpose">
          <input type="button" value="create" @click=${this.onCreateThread} .disabled="${this._selectedTopicHash === ''}">
        </div>
      </div>
    `;
  }


  /** */
  static get scopedElements() {
    return {
      "thread-list": ThreadList,
    }
  }
}
