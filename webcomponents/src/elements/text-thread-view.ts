import {css, html} from "lit";
import {property, state} from "lit/decorators.js";
import {DnaElement} from "@ddd-qc/lit-happ";
import {ActionHashB64, AnyDhtHashB64, encodeHashToBase64} from "@holochain/client";
import {ThreadsDvm} from "../viewModels/threads.dvm";
import {ThreadsPerspective} from "../viewModels/threads.zvm";
import {ThreadsLinkTypeType, TypedAnchor} from "../bindings/threads.types";
import {TextMessageList} from "./devtest/text-message-list";



/**
 * @element
 */
export class TextThreadView extends DnaElement<unknown, ThreadsDvm> {

  constructor() {
    super(ThreadsDvm.DEFAULT_BASE_ROLE_NAME)
  }

  /** -- Fields -- */
  @state() private _initialized = false;
  @state() private _selectedTopicHash: AnyDhtHashB64 = '';
  @state() private _threadHash: AnyDhtHashB64 = '';

  @property({ type: Boolean, attribute: 'debug' })
  debugMode: boolean = false;


  @property({type: Object, attribute: false, hasChanged: (_v, _old) => true})
  threadsPerspective!: ThreadsPerspective;


  /** -- Methods -- */


  /** Subscribe to Threads Zvm */
  protected async dvmUpdated(newDvm: ThreadsDvm, oldDvm?: ThreadsDvm): Promise<void> {
    console.log("<text-thread-view>.dvmUpdated()");
    if (oldDvm) {
      console.log("\t Unsubscribed to threadsZvm's roleName = ", oldDvm.threadsZvm.cell.name)
      oldDvm.threadsZvm.unsubscribe(this);
    }
    newDvm.threadsZvm.subscribe(this, 'threadsPerspective');
    console.log("\t Subscribed threadsZvm's roleName = ", newDvm.threadsZvm.cell.name)
    // newDvm.probeAll();

    this._threadHash = '';
    this._initialized = true;
  }


  // /** After first render only */
  async firstUpdated() {
    // this._initialized = true;
  }



  /** */
  async onCreateTextMessage(e: any) {
    const input = this.shadowRoot!.getElementById("textMessageInput") as HTMLInputElement;
    let path_str = await this._dvm.threadsZvm.publishTextMessage(input.value, this._threadHash);
    console.log("onCreateTextMessage() res:", path_str);
    input.value = "";
    const msgList = this.shadowRoot!.getElementById("textMessageList") as TextMessageList;
    await msgList.probeLatestMessages()
  }


  /** */
  async onSemanticTopicSelect(topicAh: ActionHashB64) {
    console.log("onSemanticTopicSelect() CALLED", topicAh)
    await this._dvm.threadsZvm.probeThreads(topicAh);
    this._selectedTopicHash = topicAh;
  }


  /** */
  render() {
    console.log("<text-thread-view>.render()> render()", this._initialized, this._threadHash);
    if (!this._initialized) {
      return html`<span>Loading...</span>`;
    }
    //console.log("\t Using threadsZvm.roleName = ", this._dvm.threadsZvm.cell.name)

    /** Render all */
    return html`
        <div>
            <div style="background: #fac8c8">
                <text-message-list id="textMessageList" .thread="${this._threadHash}"></text-message-list>
                <div>
                    <label for="threadInput">Add Message:</label>
                    <input type="text" id="textMessageInput" name="message">
                    <input type="button" value="create" @click=${this.onCreateTextMessage}
                           .disabled="${this._threadHash === ''}">
                </div>                
            </div>            
        </div>
    `;
  }


  /** */
  static get scopedElements() {
    return {
      "text-message-list": TextMessageList,
    }
  }
}
