import {css, html, PropertyValues, TemplateResult} from "lit";
import {consume} from "@lit/context";
import {property, state, customElement} from "lit/decorators.js";
import {ActionId, ActionIdMap, DnaElement, intoLinkableId} from "@ddd-qc/lit-happ";
import {ThreadsDvm} from "../viewModels/threads.dvm";
import {ThreadsPerspective} from "../viewModels/threads.perspective";
import {BeadLink} from "../bindings/threads.types";
import {msg} from "@lit/localize";
import {ts2day} from "../render";
import {onlineLoadedContext} from "../contexts";
import {sharedStyles} from "../styles";


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
  @property() threadHash!: ActionId;
  /** Hash of bead to focus */
  @property() beadAh?: ActionId;
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

  @consume({ context: onlineLoadedContext, subscribe: true })
  onlineLoaded!: boolean;

  private _prevThread: string = ""

  /** -- State variables -- */

  @state() _loading = true;


  /** -- Methods -- */

  /** In dvmUpdated() this._dvm is not already set */
  protected override async dvmUpdated(newDvm: ThreadsDvm, oldDvm?: ThreadsDvm): Promise<void> {
    console.debug("<chat-thread-view>.dvmUpdated()");
    /** Subscribe to ThreadsZvm */
    if (oldDvm) {
      oldDvm.threadsZvm.unsubscribe(this);
    }
    newDvm.threadsZvm.subscribe(this, 'threadsPerspective');
    /** */
    await this.loadlatestMessages(newDvm);
  }


  /** Don't update during loading of beads */
  override shouldUpdate(changedProperties: PropertyValues<this>) {
    console.log("<chat-thread-view>.shouldUpdate()", changedProperties, this._loading);
    const shouldnt = !super.shouldUpdate(changedProperties);
    if (shouldnt) {
      return false;
    }
    if (changedProperties.has("threadHash")) {
      this.loadlatestMessages();
      return true;
    }
    if (changedProperties.has("_loading")) {
      return true;
    }
    if (changedProperties.has("threadsPerspective")) {
      const isFirstPerspective = this._prevThread == "";
      /** Don't update during loading */
      if (!isFirstPerspective && !this.onlineLoaded) {
        return false;
      }
      if (!this.threadHash) {
        return false;
      }
      const tp = changedProperties.get("threadsPerspective")!;
      const newThread = JSON.stringify(tp.threads.get(this.threadHash));
      const isEqual = this._prevThread == newThread;
      //console.log("<chat-thread-view>.shouldUpdate() tp", isEqual, this._prevThread, newThread);
      this._prevThread = newThread;
      /** update only if something changed and we are not currently loading all the beads */
      return isFirstPerspective || !this._loading && !isEqual;
    }
    return !this._loading;
  }


  /** */
  protected override async willUpdate(changedProperties: PropertyValues<this>) {
    super.willUpdate(changedProperties);
    /** Fetch notifSetting for current thread */
    if (this._dvm) {
      if (this.threadHash && !this._dvm.threadsZvm.perspective.notifSettings.get(this.threadHash)) {
        await this._dvm.threadsZvm.pullNotifSettings(this.threadHash);
      }
    }
  }


  /** */
  protected override async updated(_changedProperties: PropertyValues) {
    // try {
    //   /** Scroll to bottom when chat-view finished updating (e.g. loading chat-items) */
    //   //console.log("ChatView.updated() ", this.scrollTop, this.scrollHeight, this.clientHeight)
    //   // TODO: store scrollTop in localStorage when changing displayed thread
    //   //if (this._firstLoad) {
    //     this.scrollTop = this.scrollHeight;
    //     //this._firstLoad = false;
    //   //}
    // } catch(e:any) {
    //   /** i.e. element not present */
    // }
    /** Scroll the list container to the requested bead */
    if (this.beadAh) {
      console.log("<chat-threaded-view>.updated()", this.beadAh)
      const beadItem = this.shadowRoot!.getElementById(`${this.beadAh.b64}`);
      if (beadItem) {
        const scrollY = beadItem.offsetTop - this.offsetTop;
        this.scrollTo({ top: scrollY, behavior: 'smooth' });
      }
    }
    /** Set background according to load state */
    if (this._loading)  {
      this.style.background = "#ececec";
    } else {
      this.style.background = "inherit";
    }
  }


  /** Check if beads have comments */
  protected async loadBeadComments(bls: BeadLink[], dvm: ThreadsDvm): Promise<void> {
    for (const bl of bls) {
      const pps = await dvm.threadsZvm.pullSubjectThreads(intoLinkableId(bl.beadAh));
      for (const [ppAh, [pp, _ts, _author]] of pps.entries()) {
        if (pp.purpose == "comment") {
          await dvm.threadsZvm.perspective.getAllBeadsOnThread(ppAh);
          break;
        }
      }
    }
  }


  /** */
  protected loadlatestMessages(newDvm?: ThreadsDvm) {
    console.log("<chat-thread-view>.loadlatestMessages() probe", this.threadHash, !!this._dvm);
    if (!this.threadHash) {
      this._loading = false;
      return;
    }
    const dvm = newDvm? newDvm : this._dvm;
    dvm.threadsZvm.pullLatestBeads(this.threadHash, undefined, undefined, 20)
      .then(async (beadLinks) => {
        this._loading = false;
        await this.loadBeadComments(beadLinks, dvm);
        await dvm.threadsZvm.commitThreadProbeLog(this.threadHash);
      });
    this._loading = true;
  }


  /** */
  async loadPreviousMessages(): Promise<void> {
    if (!this.threadHash) {
      return;
    }
    const beginningReached = this._dvm.threadsZvm.perspective.hasReachedBeginning(this.threadHash);
    console.log("loadPreviousMessages() beginningReached = ", beginningReached);
    if (beginningReached) {
      //this._dvm.threadsZvm.perspective.threads[this.threadHash]
      return;
    }
    this._loading = true;
    //this._commentsLoading = true;
    const bls = await this._dvm.threadsZvm.probePreviousBeads(this.threadHash, 10);
    this._loading = false;
    await this.loadBeadComments(bls, this._dvm);
    //this._commentsLoading = false; // This is for triggering a new requestUpdate
  }


  /** */
  async onWheel(_event: any) {
    //console.log("ChatView.onWheel() ", this.scrollTop, this.scrollHeight, this.clientHeight)
    //if (this.scrollTop == 0) {
    if (this.clientHeight - this.scrollHeight == this.scrollTop) {
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
  override render() {
    console.log("<chat-thread-view>.render()", this._loading, this.threadHash, this.beadAh, this._dvm.threadsZvm, this._renderCount);
    this._renderCount += 1;

    /** */
    if (this.threadHash === undefined) {
      return html`<div style="margin:auto; color:red;font-weight: bold;font-size: 3rem">${msg("No channel selected")}</div>`;
    }
    const thread = this.threadsPerspective.threads.get(this.threadHash);
    if (!thread) {
      return html`<ui5-busy-indicator delay="50" size="Large" active style="width:100%; height:100%; color:olive"></ui5-busy-indicator>`;
    }

    /** chat-header */
    let maybeHeader = html``;
    const hasReachedBeginning = this._dvm.threadsZvm.perspective.hasReachedBeginning(this.threadHash);
    if (hasReachedBeginning) {
      maybeHeader = html`<chat-header .threadHash=${this.threadHash}></chat-header>`;
    }


    /** Should grab all probed messages and request probes if end is reached */

    const all = thread.getAll();

    let passedLog = false;
    let currentDay = "";
    let prevBeadAh: ActionId | undefined = undefined;
    const newStr = msg("new").toUpperCase(); // prettyTimestamp(initialProbeLogTs);
    const initialProbeLogTs = this._dvm.perspective.initialThreadProbeLogTss.get(this.threadHash);

    // <abbr title="${agent ? agent.nickname : "unknown"}">[${date_str}] ${tuple[2]}</abbr>
    let chatItems = Object.values(all).map((blm) => {
        let hr: TemplateResult<1> | undefined = undefined;
        /** 'new' <hr> if bead is older than initial latest ProbeLogTime */
        if (!passedLog && initialProbeLogTs && blm.creationTime > initialProbeLogTs) {
          passedLog = true;
          /** NEW */
          hr = html`
          <div style="display: flex; flex-direction: row; align-items: center; margin-right: 5px;">
              <div style="border-top: 2px dotted #33A000; flex-grow: 1; height: 0px"></div>                  
              <div style="width: fit-content; background: #33A000; color:white; font-size:small; border-radius:3px; padding: 2px 10px 2px 10px; margin-left: 3px; font-weight:bold;">${newStr}</div>
          </div>
          `;
        }
        const day = ts2day(blm.creationTime);
        const canShowTimeHr = day != currentDay;
        if (canShowTimeHr) {
          currentDay = day;
          /** NEW & TIME */
          if (hr) {
            hr = html`
                <div style="display:flex; flex-direction:row; margin-bottom:2px;">
                    <hr class="timeHr" style="border-bottom: 2px dotted #33A000;"/>
                    <div style="font-size:14px; color:#33A000; padding-left:3px; padding-right:3px;">
                        ${day}
                    </div>
                    <hr class="timeHr" style="border-bottom: 2px dotted #33A000;"/>
                    <div style="width: fit-content; background: #33A000; color:white; font-size:small; border-radius:3px; padding: 2px 10px 2px 10px; margin-left: 3px; font-weight:bold;">${newStr}</div>
                </div>
            `;
          } else {
            /** TIME */
            hr = html`
                <div style="display:flex; flex-direction:row; margin-bottom:2px;">
                    <hr class="timeHr"/>
                    <div style="font-size:14px; color:#868686; padding-left:3px; padding-right:3px;">
                        ${day}
                    </div>
                    <hr class="timeHr"/>
                </div>
            `;
          }
        }

        let chatItem = this._chatItems.get(blm.beadAh);
        if (!chatItem) {
          //console.log("<chat-thread-view> instanceCount create", blm.beadAh.short);
          chatItem = html`
              <chat-item id=${blm.beadAh.b64} .hash=${blm.beadAh} .prevBeadAh=${prevBeadAh}
                         style="${this.beadAh && blm.beadAh.equals(this.beadAh) ? "background:#c4f2b07a" : ""}">
              </chat-item>`;
          this._chatItems.set(blm.beadAh, chatItem);
        }
        prevBeadAh = blm.beadAh;
        /** Render chatItem */
        return html`${chatItem}${hr}`;
      }
    );


    /** render all (in reverse) */
    return html`
      <!-- <div>${this._renderCount}</div> -->
      ${chatItems.reverse()}
      ${this._loading? html`<ui5-busy-indicator delay="50" size="Medium" active style="width:100%; height:100%;margin-bottom:20px;margin-top:20px"></ui5-busy-indicator>` : html``}
      ${maybeHeader}
    `;
  }

  private _renderCount = 0;

  private _chatItems: ActionIdMap<TemplateResult<1>> = new ActionIdMap<TemplateResult<1>>();


  /** */
  static override get styles() {
    return [
      sharedStyles,
      css`
        :host {
          flex:1;
          overflow-y: scroll;
          display: flex;
          flex-direction: column-reverse;
          /*gap:15px;*/
          height: inherit;
          font-family: '72-Light';
        }
      `,
    ];
  }
}
