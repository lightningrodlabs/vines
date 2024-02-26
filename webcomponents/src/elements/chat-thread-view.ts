import {css, html, LitElement, PropertyValues} from "lit";
import {property, state, customElement} from "lit/decorators.js";
import {DnaElement} from "@ddd-qc/lit-happ";
import {encodeHashToBase64} from "@holochain/client";
import {ThreadsDvm} from "../viewModels/threads.dvm";
import {ThreadsPerspective} from "../viewModels/threads.perspective";
import {BeadLink} from "../bindings/threads.types";
import {msg} from "@lit/localize";

/**
 * @element
 */
@customElement("chat-thread-view")
export class ChatThreadView extends DnaElement<unknown, ThreadsDvm> {
  /** */
  constructor() {
    super(ThreadsDvm.DEFAULT_BASE_ROLE_NAME);
    this.addEventListener('scroll', this.onWheel);
  }


  /** -- Properties -- */

  /** Hash of Thread to display */
  @property() threadHash: string = ''
  /** Hash of bead to focus */
  @property() beadAh: string = ''
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

  @property({type: Boolean, attribute: false})
  _loading = true;

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


  /** Don't update during loading of beads */
  shouldUpdate(changedProperties: PropertyValues<this>) {
    console.log("<chat-thread-view>.shouldUpdate()", changedProperties, this._loading);
    const shouldnt = !super.shouldUpdate(changedProperties);
    if (shouldnt) {
      return false;
    }
    if (changedProperties.has("threadHash")) {
      return true;
    }
    if (changedProperties.has("_loading")) {
      return true;
    }
    return !this._loading;
    //return true;
  }


  /** */
  protected async willUpdate(changedProperties: PropertyValues<this>) {
    super.willUpdate(changedProperties);
    console.log("<chat-thread-view>.willUpdate()", changedProperties, !!this._dvm, this.threadHash);
    if (this._dvm) {
      if (!this._dvm.threadsZvm.perspective.notifSettings[this.threadHash]) {
        await this._dvm.threadsZvm.probeNotifSettings(this.threadHash);
        //this.requestUpdate();
      }
      if (changedProperties.has("threadHash")) {
        this.loadlatestMessages();
      }
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
  protected async loadTextBeadComments(bls: BeadLink[], dvm: ThreadsDvm): Promise<void> {
    for (const bl of bls) {
      const pps = await dvm.threadsZvm.probeSubjectThreads(encodeHashToBase64(bl.beadAh));
      for (const [ppAh, pp] of Object.entries(pps)) {
        if (pp.purpose == "comment") {
          await dvm.threadsZvm.getAllBeadsOnThread(ppAh);
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
    dvm.threadsZvm.probeLatestBeads(this.threadHash, undefined, undefined, 20)
      .then(async (beadLinks) => {
        this._loading = false;
        await this.loadTextBeadComments(beadLinks, dvm);
        await dvm.threadsZvm.commitThreadProbeLog(this.threadHash);
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
    await this.loadTextBeadComments(bls, this._dvm);
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
      return html `
          <div>${msg("No thread selected")}</div>
      `;
    }
    if (this._loading) {
      return html`<ui5-busy-indicator size="Large" active style="margin:auto; width:50%; height:50%;"></ui5-busy-indicator>`;
    }
    const thread = this._dvm.threadsZvm.perspective.threads.get(this.threadHash);
    if (!thread) {
      return html `<div>Loading messages...</div>`;
    }


    /** */
    let maybeHeader = html``
    if (this._dvm.threadsZvm.hasReachedBeginning(this.threadHash)) {
      maybeHeader = html`<chat-header .threadHash="${this.threadHash}"></chat-header>`;
    }


    /** Should grab all probed and request probes if end is reached */

    const all = thread.getAll();
    let passedLog = false;

    // <abbr title="${agent ? agent.nickname : "unknown"}">[${date_str}] ${tuple[2]}</abbr>
    let textLi = Object.values(all).map(
      (blm) => {
        let hr = html``;
        /** 'new' <hr> if bead is older than initial latest ProbeLogTime */
        const initialProbeLogTs = this._dvm.perspective.initialThreadProbeLogTss[this.threadHash];
        //console.log("thread.latestProbeLogTime", initialProbeLogTs, thread.latestProbeLogTime, blm.creationTime);
        if (!passedLog && blm.creationTime > initialProbeLogTs) {
          const beadDateStr = "New" // prettyTimestamp(initialProbeLogTs);
          passedLog = true;
          hr = html`
              <div style="margin-left:10px; margin-right:10px; margin-bottom:-25px;margin-top: 28px;">
                  <div style="width: fit-content;background: red;color:white;font-size:small;padding:2px; margin-top:-25px;margin-bottom:-30px;margin-left:auto">${beadDateStr}</div>
                <hr style="border: 1px solid red;"/>
              </div>
          `
        }
        console.log("<chat-thread-view> blm.beadType ", blm.beadType, this.beadAh, this.beadAh == blm.beadType);
        const chatItem = html`<chat-item .hash=${(blm.beadAh)} style="${blm.beadAh == this.beadAh? "background:#c4f2b07a" : ""}"></chat-item>`;
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
          /*gap:15px;*/
          height: inherit;
          background: #FBFCFD;
          font-family: '72-Light';
        }
      `,
    ];
  }
}
