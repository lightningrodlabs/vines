import {css, html, PropertyValues} from "lit";
import {property, state} from "lit/decorators.js";
import {DnaElement} from "@ddd-qc/lit-happ";
import {AnyDhtHashB64, decodeHashFromBase64} from "@holochain/client";
import {ThreadsDvm} from "../viewModels/threads.dvm";
import {TextThreadView} from "./text-thread-view";
import {SemanticTopicsView} from "./semantic-topics-view";
import {ThreadsPerspective} from "../viewModels/threads.perspective";

/** @ui5/webcomponents */
import Label from "@ui5/webcomponents/dist/Label"
import Dialog from "@ui5/webcomponents/dist/Dialog"
import Button from "@ui5/webcomponents/dist/Button"
import "@ui5/webcomponents/dist/Icon.js";
import "@ui5/webcomponents/dist/Input.js";
import "@ui5/webcomponents/dist/features/InputSuggestions.js";
/** @ui5/webcomponents-fiori */
import "@ui5/webcomponents-fiori/dist/Bar.js"
/** @ui5/webcomponents-icons */
//import "@ui5/webcomponents-icons/dist/allIcons-static.js";
import "@ui5/webcomponents-icons/dist/synchronize.js"
import "@ui5/webcomponents-icons/dist/add.js"
import "@ui5/webcomponents-icons/dist/delete.js"
import "@ui5/webcomponents-icons/dist/home.js"
import "@ui5/webcomponents-icons/dist/action-settings.js"
import "@ui5/webcomponents-icons/dist/number-sign.js"
import "@ui5/webcomponents-icons/dist/process.js"
import "@ui5/webcomponents-icons/dist/workflow-tasks.js"
import "@ui5/webcomponents-icons/dist/discussion.js"

/**
 * @element
 */
export class SemanticThreadsPage extends DnaElement<unknown, ThreadsDvm> {

  constructor() {
    super(ThreadsDvm.DEFAULT_BASE_ROLE_NAME)
  }

  /** -- Fields -- */
  @state() private _initialized = false;
  @state() private _selectedThreadHash: AnyDhtHashB64 = '';
  @state() private _createTopicHash: AnyDhtHashB64 = '';

  @property({type: Object, attribute: false, hasChanged: (_v, _old) => true})
  threadsPerspective!: ThreadsPerspective;


  /** -- Getters -- */

  get createTopicDialogElem(): Dialog {
    return this.shadowRoot.getElementById("create-topic-dialog") as Dialog;
  }

  get createThreadDialogElem(): Dialog {
    return this.shadowRoot.getElementById("create-thread-dialog") as Dialog;
  }


  /** -- Methods -- */

  protected async dvmUpdated(newDvm: ThreadsDvm, oldDvm?: ThreadsDvm): Promise<void> {
    console.log("<semantic-threads-page>.dvmUpdated()");
    if (oldDvm) {
      console.log("\t Unsubscribed to threadsZvm's roleName = ", oldDvm.threadsZvm.cell.name)
      oldDvm.threadsZvm.unsubscribe(this);
    }
    newDvm.threadsZvm.subscribe(this, 'threadsPerspective');
    console.log("\t Subscribed threadsZvm's roleName = ", newDvm.threadsZvm.cell.name)
    newDvm.probeAll();
    this._selectedThreadHash = '';
    this._initialized = true;
  }

  //
  // protected firstUpdated() {
  //   console.log("<semantic-threads-page>.firstUpdated()", this._initialized, this._selectedThreadHash);
  // }


  /** */
  shouldUpdate(changedProperties: PropertyValues<this>): boolean {
    //if (!this._initialized) return false;
    return super.shouldUpdate(changedProperties);
  }


  /** */
  async onCreateTopic(e) {
    const input = this.shadowRoot!.getElementById("topicTitleInput") as HTMLInputElement;
    let ah = await this._dvm.threadsZvm.publishSemanticTopic(input.value);
    //console.log("onCreateList() res:", res)
    input.value = "";
    this.createTopicDialogElem.close();
  }


  /** */
  async onCreateThread(e) {
    const input = this.shadowRoot!.getElementById("threadPurposeInput") as HTMLInputElement;
    let ah = await this._dvm.threadsZvm.publishThreadFromSemanticTopic(this._createTopicHash, input.value);
    //console.log("onCreateList() res:", res)
    input.value = "";
    this._selectedThreadHash = ah;
    this.createThreadDialogElem.close(false)
  }


  /** */
  async onCreateTextMessage(e) {
    const input = this.shadowRoot!.getElementById("textMessageInput") as HTMLInputElement;
    if (!input.value || input.value.length == 0) {
      return;
    }
    let path_str = await this._dvm.threadsZvm.publishTextMessage(input.value, this._selectedThreadHash);
    console.log("onCreateTextMessage() res:", path_str);
    input.value = "";

    //await this.probeLatestMessages();
    //const msgList = this.shadowRoot!.getElementById("textMessageList") as TextMessageList;
    //msgList.requestUpdate();
  }


  /** */
  render() {
    console.log("<semantic-threads-page>.render()", this._initialized, this._selectedThreadHash);

    //console.log("\t Using threadsZvm.roleName = ", this._dvm.threadsZvm.cell.name)


    let rightSide = html`<h1 style="top: 50%;position: absolute;margin-top: -20px;left: 50%;">No threads selected</h1>`
    if (this._selectedThreadHash) {
      const thread = this.threadsPerspective.allParticipationProtocols[this._selectedThreadHash];
      const topic = this.threadsPerspective.allSemanticTopics[thread.topicHash];

      rightSide = html`
          <ui5-bar design="Header" style="background: #f1efef; border: 1px solid dimgray;">
              <ui5-button slot="startContent" icon="number-sign" tooltip=${this._selectedThreadHash}
                          design="Transparent"></ui5-button>
              <span id="threadTitle" slot="startContent">${topic}: ${thread.purpose}</span>
              <ui5-button slot="endContent" icon="action-settings" tooltip="Go to settings"
                          @click=${() => {
                              this.dispatchEvent(new CustomEvent('debug', {detail: true, bubbles: true, composed: true}));
                          }}
              ></ui5-button>
          </ui5-bar>
          <text-thread-view .threadHash=${this._selectedThreadHash}
                            style=""></text-thread-view>
          <ui5-bar design="FloatingFooter" style="margin:10px;width: auto;">
              <ui5-button slot="startContent" design="Positive" icon="add"></ui5-button>
              <ui5-input slot="startContent" id="textMessageInput" type="Text" placeholder="Message #${topic}"
                         show-clear-icon
                         style="min-width: 400px;"
                         @change=${this.onCreateTextMessage}></ui5-input>
              <!-- <ui5-button design="Transparent" slot="endContent" icon="delete"></ui5-button> -->
          </ui5-bar>
      `;
    }


    /** Render all */
    return html`
      <div id="mainDiv">
          <div id="leftSide">
              <div id="sideButtonBar" style="display: flex; flex-direction: row; height: 44px; border: 1px solid darkslategray">
                  <span style="font-size: 24px;font-weight: bold;padding: 3px 20px 0px 10px;">Topics</span>
                  <ui5-button icon="synchronize" tooltip="Refresh" design="Transparent" @click=${this.refresh}></ui5-button>
                  <ui5-button id="createTopicButton" icon="add" tooltip="Create Topic" design="Transparent" 
                              @click=${() => this.createTopicDialogElem.show()}
                  ></ui5-button>                  
              </div>
              <semantic-topics-view 
                      @createThreadClicked=${(e) => {this._createTopicHash = e.detail; this.createThreadDialogElem.show()}}
                      @selected=${(e) => {this.onThreadSelected(e.detail)}}
              ></semantic-topics-view>
        </div>
        <div id="rightSide">
            ${rightSide}
        </div>
      </div>
      <!-- CreateTopicDialog -->
      <ui5-dialog id="create-topic-dialog" header-text="Create Topic">
        <section>
            <div>
                <ui5-label for="topicTitleInput" required>Title:</ui5-label>
                <ui5-input id="topicTitleInput"></ui5-input>
            </div>
        </section>
        <div slot="footer">
          <div style="flex: 1;"></div>
          <ui5-button id="createTopicDialogButton" design="Emphasized" @click=${this.onCreateTopic}>Create</ui5-button>
            <ui5-button @click=${() => this.createTopicDialogElem.close(false)}>Cancel</ui5-button>
        </div>
      </ui5-dialog>
      <!-- CreateThreadDialog -->
      <ui5-dialog id="create-thread-dialog" header-text="Create Thread">
          <section>
              <div>
                  <ui5-label for="threadPurposeInput" required>Purpose:</ui5-label>
                  <ui5-input id="threadPurposeInput"></ui5-input>
              </div>
          </section>
          <div slot="footer">
              <div style="flex: 1;"></div>
              <ui5-button id="createThreadDialogButton" design="Emphasized" @click=${this.onCreateThread}>Create</ui5-button>
              <ui5-button @click=${(e) => this.createThreadDialogElem.close(false)}>Cancel</ui5-button>
          </div>
      </ui5-dialog>      
    `;
  }



  async onThreadSelected(threadHash: AnyDhtHashB64) {
    console.log("onThreadSelected()", threadHash)
    //this._dvm.threadsZvm.probeLatestBeads(threadHash)
    const beadLinks = await this._dvm.threadsZvm.probeLatestBeads({ppAh: decodeHashFromBase64(threadHash), targetCount: 20})
    console.log("onThreadSelected() beads found: ", beadLinks.length);
    this._selectedThreadHash = threadHash;
  }


  /** */
  async refresh(_e?: any) {
    await this._dvm.probeAll();
  }


  /** */
  static get scopedElements() {
    return {
      "semantic-topics-view": SemanticTopicsView,
      "text-thread-view": TextThreadView,
    }
  }

  /** */
  static get styles() {
    return [
      css`
        :host {
          background: #f7f6f8;
          display: block;
          height: 100vh;
        }

        #mainDiv {
          display: flex;
          flex-direction: row;
          height: 100vh;
          overflow: clip;
        }

        #leftSide {
          background: #9bb791;
          height: 100vh;
          width: 340px;
          display: flex;
          flex-direction: column;
        }

        #rightSide {
          width: 100%;
          height: 100vh;
          background: #eaeaea;
          display: flex;
          flex-direction: column;
        }
        
        #threadTitle {
          font-size: 18px;
          font-weight: bold;
        }
        
        
      `,

    ];
  }
}
