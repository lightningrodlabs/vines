import {css, html, LitElement, PropertyValues} from "lit";
import {property, state} from "lit/decorators.js";
import {DnaElement} from "@ddd-qc/lit-happ";
import {decodeHashFromBase64, encodeHashToBase64} from "@holochain/client";
import {ThreadsDvm} from "../viewModels/threads.dvm";
import {ThreadsPerspective} from "../viewModels/threads.perspective";

import {ChatMessageItem} from "./chat-message-item";
import {ChatHeader} from "./chat-header";


/**
 * @element
 */
export class ChatThreadView extends DnaElement<unknown, ThreadsDvm> {

  constructor() {
    super(ThreadsDvm.DEFAULT_BASE_ROLE_NAME)
  }


  /** -- Properties -- */

  /** Hash of Thread to display */
  @property() threadHash: string = ''
  /** View beads in chronological order, otherwise use timeReference as end-time and display older beads only. */
  @property()
  startFromBeginning: boolean = false;
  /** */
  @property()
  timeReferenceMs: number = Date.now();
  /** Number of beads to retrieve per 'get' */
  @property()
  batchSize: number = 20
  /** Observed perspective from zvm */
  @property({type: Object, attribute: false, hasChanged: (_v, _old) => true})
  threadsPerspective!: ThreadsPerspective;

  /** -- State variables -- */

  @state() private _loading = false;
  @state() private _busy = false;


  /** -- Getters -- */

  get chatElem() : HTMLElement {
    return this.shadowRoot.getElementById("mainChat") as HTMLElement;
  }


  /** -- Methods -- */

  /**
   * In dvmUpdated() this._dvm is not already set!
   * Subscribe to ThreadsZvm
   */
  protected async dvmUpdated(newDvm: ThreadsDvm, oldDvm?: ThreadsDvm): Promise<void> {
    console.log("<chat-thread-view>.dvmUpdated()");
    if (oldDvm) {
      console.log("\t Unsubscribed to threadsZvm's roleName = ", oldDvm.threadsZvm.cell.name)
      oldDvm.threadsZvm.unsubscribe(this);
    }
    newDvm.threadsZvm.subscribe(this, 'threadsPerspective');
    console.log("\t Subscribed threadsZvm's roleName = ", newDvm.threadsZvm.cell.name)
    this.loadlatestMessages(newDvm);
  }


  /** */
  protected async willUpdate(changedProperties: PropertyValues<this>) {
    super.willUpdate(changedProperties);
    console.log("<chat-thread-view>.loadMessages()", changedProperties, !!this._dvm, this.threadHash);
    if (changedProperties.has("threadHash") && this._dvm) {
      this.loadlatestMessages();
    }
  }


  /** Scroll to bottom only on first load of chatElem */
  _firstLoad = true;

  /** */
  protected updated(_changedProperties: PropertyValues) {
    try {
      /** Scroll to bottom when chat-view finished updating (e.g. loading chat-items) */
      //console.log("ChatView.updated() ", this.chatElem.scrollTop, this.chatElem.scrollHeight, this.chatElem.clientHeight)
      // TODO: store scrollTop in localStorage when changing displayed thread
      if (this._firstLoad) {
        this.chatElem.scrollTop = this.chatElem.scrollHeight;
        this._firstLoad = false;
      }
    } catch(e) {
      /** i.e. element not present */
    }
  }


  /** */
  async getUpdateComplete(): Promise<boolean> {
    //console.log("ChatView.getUpdateComplete()")
    let superCompleted = await super.getUpdateComplete();
    /** Make sure mainChat has finished updating (i.e. loaded child chat-items) */
    const mainChat = this.shadowRoot.getElementById('mainChat') as LitElement;
    const childUpdated = await mainChat.updateComplete;
    /** Done */
    return superCompleted && childUpdated;
  }


  /** */
  protected loadlatestMessages(newDvm?: ThreadsDvm) {
    //console.log("<chat-thread-view>.loadMessages() probe", this.threadHash, !!this._dvm);
    const dvm = newDvm? newDvm : this._dvm;
    //dvm.threadsZvm.probeAllBeads(this.threadHash)
    dvm.threadsZvm.probeLatestBeads({ppAh: decodeHashFromBase64(this.threadHash), targetLimit: 20})
      .then((beadLinks) => {
        console.log("<chat-thread-view>.loadMessages() beads found: ", beadLinks.length);
        this._loading = false;
      });
    this._loading = true;
  }


  /** */
  async loadPreviousMessages(): Promise<void> {
    if (this._dvm.threadsZvm.hasReachedBeginning(this.threadHash)) {
      //this._dvm.threadsZvm.perspective.threads[this.threadHash]
      return;
    }
    this._loading = true;
    await this._dvm.threadsZvm.probePreviousBeads(this.threadHash, 10);
    this._loading = false;
  }


  // /** */
  // onLoadMore() {
  //   console.log("<chat-thread-view>.onLoadMore()");
  //
  //   this._busy = true;
  //   // FIXME: Probe DHT
  //   this._busy = false;
  // }


  /** */
  async onWheel(event) {
    //console.log("ChatView.onWheel() ", this.chatElem.scrollTop, this.chatElem.scrollHeight, this.chatElem.clientHeight)
    //if (this.chatElem.scrollTop == 0) {
    if (this.chatElem.clientHeight -  this.chatElem.scrollHeight == this.chatElem.scrollTop) {
      //this.chatElem.style.background = 'grey';
      await this.loadPreviousMessages();
    } else {
      //this.chatElem.style.background = 'white';
    }
    //   // this.listElem.scrollTop
    //   const hasScrolledUp = event.wheelDeltaY > 0
    //   var scrollY = this.listElem.scrollHeight - this.listElem.clientHeight;
    //   const hasOverScrolledTop = scrollY == 0 && hasScrolledUp;
    //   //const e = {deltaY: event.deltaY, wheelDeltaY: event.wheelDeltaY}
    //   const elem = {scroll: this.listElem.scroll, scrollHeight: this.listElem.scrollHeight}
    //   //console.log("<chat-thread-view>.onWheel event: ", /*e,*/ elem, scrollY, hasOverScrolledTop);
  }


  /** */
  render() {
    console.log("<chat-thread-view>.render()", this._firstLoad, this._loading, this.threadHash);
    if (this.threadHash == "") {
      return html `<div>No thread selected</div>`;
    }

    const bg_color = this._loading? "#ededf0" : "white"

    const pp = this._dvm.threadsZvm.getParticipationProtocol(this.threadHash);
    if (!pp) {
      return html `<div>Loading thread...</div>`;
    }
    const threadInfo = this._dvm.threadsZvm.perspective.threads[this.threadHash];
    if (!threadInfo) {
      return html `<div>Loading messages...</div>`;
    }


    /** */
    let maybeHeader = html``
    if (this._dvm.threadsZvm.hasReachedBeginning(this.threadHash)) {
      maybeHeader = html`<chat-header .hash="${this.threadHash}" style="margin:10px;"></chat-header>`;
    }


    /** Should grab all probed and request probes if end is reached */
    //const infos: TextMessageInfo[] = this._dvm.threadsZvm.getMostRecentTextMessages(this.threadHash);

    const all = threadInfo.getAll();

    console.log("<chat-thread-view>.render() len =", threadInfo.beadLinksTree.length, threadInfo.latestSearchLogTime);

    let passedLog = false;

    // <abbr title="${agent ? agent.nickname : "unknown"}">[${date_str}] ${tuple[2]}</abbr>
    let textLi = Object.values(all).map(
      (blm ) => {
        let hr = html``;
        if (!passedLog && blm.creationTime > threadInfo.latestSearchLogTime) {
          passedLog = true;
          hr = html`
              <div style="width: fit-content;background: red;color:white;font-size:small;padding:1px;margin-top:-10px;margin-left:auto">New</div>
              <hr style="border: 1px solid red; width:100%"/>`
        }
        return html`<chat-item hash="${blm.beadAh}"></chat-item>${hr}`;
      }
    );


    /** Different UI if no message found for thread */
    // if (threadInfo.beadLinksTree.length == 0) {
    //   textLi = [html`
    //         <h2 style="top: 50%;position: absolute;margin-top: -20px;left: 50%;">
    //             No message found
    //         </h2>`]
    // }

    /** render all */
    return html`
        <div id="mainChat" style="height: 88vh;background: ${bg_color};display: flex; flex-direction: column-reverse;overflow: scroll"
                  @scroll=${this.onWheel}
        >
            ${textLi.reverse()}
            ${maybeHeader}            
        </div>
    `;
  }


  /** */
  static get scopedElements() {
    return {
      "chat-header": ChatHeader,
      "chat-item": ChatMessageItem,
    }
  }

}
