import {css, html, LitElement, PropertyValues} from "lit";
import {property, state, customElement} from "lit/decorators.js";
import {DnaElement} from "@ddd-qc/lit-happ";
import {decodeHashFromBase64, encodeHashToBase64} from "@holochain/client";
import {ThreadsDvm} from "../viewModels/threads.dvm";
import {ThreadsPerspective} from "../viewModels/threads.perspective";
import {BeadLink} from "../bindings/threads.types";
import {msg} from "@lit/localize";


/**
 * @element
 */
@customElement("chat-thread-view")
export class ChatThreadView extends DnaElement<unknown, ThreadsDvm> {

  constructor() {
    super(ThreadsDvm.DEFAULT_BASE_ROLE_NAME);
    this.addEventListener('scroll', this.onWheel);
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
  @state() private _commentsLoading = false;



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
    //console.log("<chat-thread-view>.loadMessages()", changedProperties, !!this._dvm, this.threadHash);
    if (changedProperties.has("threadHash") && this._dvm) {
      this.loadlatestMessages();
    }
  }


  /** Scroll to bottom only on first load */
  _firstLoad = true;

  /** */
  protected async updated(_changedProperties: PropertyValues) {
    try {
      /** Scroll to bottom when chat-view finished updating (e.g. loading chat-items) */
      //console.log("ChatView.updated() ", this.scrollTop, this.scrollHeight, this.clientHeight)
      // TODO: store scrollTop in localStorage when changing displayed thread
      if (this._firstLoad) {
        this.scrollTop = this.scrollHeight;
        this._firstLoad = false;
      }
    } catch(e) {
      /** i.e. element not present */
    }


    // /** Check for comments on each message */
    // const threadInfo = this._dvm.threadsZvm.perspective.threads[this.threadHash];
    // if (!threadInfo) {
    //   const beads = threadInfo.getAll();
    //   let promises = Object.values(beads).map(
    //     (blm ) => {
    //       this._dvm.threadsZvm.probeThreads(blm.beadAh);
    //     })
    // }

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


  /** Check if beads have comments */
  protected async loadTextMessageComments(bls: BeadLink[], dvm: ThreadsDvm): Promise<void> {
    for (const bl of bls) {
      const pps = await dvm.threadsZvm.probeThreads(encodeHashToBase64(bl.beadAh));
      for (const [ppAh, pp] of Object.entries(pps)) {
        if (pp.purpose == "comment") {
          await dvm.threadsZvm.getAllTextMessages(ppAh);
          break;
        }
      }
    }
  }


  /** */
  protected loadlatestMessages(newDvm?: ThreadsDvm) {
    console.log("<chat-thread-view>.loadlatestMessages() probe", this.threadHash, !!this._dvm);
    const dvm = newDvm? newDvm : this._dvm;
    //dvm.threadsZvm.probeAllBeads(this.threadHash)
    dvm.threadsZvm.probeLatestBeads({ppAh: decodeHashFromBase64(this.threadHash), targetLimit: 20})
      .then(async (beadLinks) => {
        this._loading = false;
        await this.loadTextMessageComments(beadLinks, dvm);
        this._commentsLoading = false; // This is for triggering a new requestUpdate
      });
    this._loading = true;
    this._commentsLoading = true;
  }


  /** */
  async loadPreviousMessages(): Promise<void> {
    const beginningReached = this._dvm.threadsZvm.hasReachedBeginning(this.threadHash);
    console.log("loadPreviousMessages() beginningReached = ", beginningReached);
    if (beginningReached) {
      //this._dvm.threadsZvm.perspective.threads[this.threadHash]
      return;
    }
    this._loading = true;
    this._commentsLoading = true;
    const bls = await this._dvm.threadsZvm.probePreviousBeads(this.threadHash, 10);
    this._loading = false;
    await this.loadTextMessageComments(bls, this._dvm);
    this._commentsLoading = false; // This is for triggering a new requestUpdate
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
    console.log("ChatView.onWheel() ", this.scrollTop, this.scrollHeight, this.clientHeight)
    //if (this.scrollTop == 0) {
    if (this.clientHeight -  this.scrollHeight == this.scrollTop) {
      //this.style.background = 'grey';
      await this.loadPreviousMessages();
    } else {
      //this.style.background = 'white';
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
      return html `<div>${msg("No thread selected")}</div>`;
    }

    //const bg_color = this._loading? "#ededf0" : "white"
    this.style.background = this._loading? "#d4d5d7" : "#FBFCFD"


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

    //console.log("<chat-thread-view>.render() len =", threadInfo.beadLinksTree.length, threadInfo.latestSearchLogTime);

    let passedLog = false;

    // <abbr title="${agent ? agent.nickname : "unknown"}">[${date_str}] ${tuple[2]}</abbr>
    let textLi = Object.values(all).map(
      (blm ) => {
        let hr = html``;
        if (!passedLog && blm.creationTime > threadInfo.latestProbeLogTime) {
          passedLog = true;
          hr = html`
              <div style="width: fit-content;background: red;color:white;font-size:small;padding:1px;margin-top:-10px;margin-left:auto">New</div>
              <hr style="border: 1px solid red; margin-left:5px;margin-right:10px;"/>`
        }
        console.log("<chat-thread-view> blm.beadType ", blm.beadType);
        const chatItem = html`<chat-item .hash=${(blm.beadAh)}></chat-item>`;
        return html`${chatItem}${hr}`;
      }
    );


    /** render all */
    return html`
            ${textLi.reverse()}
            ${maybeHeader}
    `;
  }

  /** */
  static get styles() {
    return [
      css`
        :host {
          flex:1;
          overflow-y: scroll;
          display: flex;
          flex-direction: column-reverse;
          
          height: inherit;
          background: #FBFCFD;

          font-family: '72-Light';
        }
      `,

    ];
  }
}
