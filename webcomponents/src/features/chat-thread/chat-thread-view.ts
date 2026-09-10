import {css, html, PropertyValues, TemplateResult} from "lit";
import {consume} from "@lit/context";
import {repeat} from 'lit/directives/repeat.js'
import {customElement, property, state} from "lit/decorators.js";
import {ActionId, DnaElement, intoLinkableId} from "@ddd-qc/lit-happ";
import {ThreadsDvm} from "../../viewModels/threads.dvm";
import {ThreadsPerspective} from "../../viewModels/threads.perspective";
import {BeadLink} from "../../bindings/threads.types";
import {msg} from "@lit/localize";
import {onlineLoadedContext} from "../../contexts";
import {sharedStyles} from "../../styles";
import {ScrollKeeper} from "./scroll-keeper";
import {formatTime} from "../timezone/utils";
import {GetStrategy} from "@holochain-open-dev/core-types";


/**
 * @element
 */
@customElement("chat-thread-view")
export class ChatThreadView extends DnaElement<unknown, ThreadsDvm> {

  /** */
  constructor() {
    super(ThreadsDvm.DEFAULT_BASE_ROLE_NAME);
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

  @consume({context: onlineLoadedContext, subscribe: true})
  onlineLoaded!: boolean;


  /** -- State variables -- */

  @state() _loading: boolean = true;
  private  _prevThread: string = ""


  /** -- Methods -- */

  /** In dvmUpdated() this._dvm is not set yet */
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


  /** Don't update during loading of beads  */
  override shouldUpdate(changedProperties: PropertyValues<this>) {
    //console.log("<chat-thread-view>.shouldUpdate()", !this._loading, changedProperties);
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
      /** Don't update during network loading */
      if (!isFirstPerspective && !this.onlineLoaded) {
        return false;
      }
      if (!this.threadHash) {
        return false;
      }
      const tp = changedProperties.get("threadsPerspective")!;
      let isEqual = false;
      if (tp) {
        const newThread = JSON.stringify(tp.threads.get(this.threadHash));
        isEqual = this._prevThread == newThread;
        //console.log("<chat-thread-view>.shouldUpdate() tp", isEqual, this._prevThread, newThread);
        this._prevThread = newThread;
      }
      /** update only if something changed and we are not currently loading all the beads */
      return isFirstPerspective || !this._loading && !isEqual;
    }
    return !this._loading;
  }


  /** */
  protected override async willUpdate(changedProperties: PropertyValues<this>) {
    super.willUpdate(changedProperties);
    this._keeper.beforeRender();
    /** Fetch notifSetting for current thread */
    if (this._dvm) {
      if (this.threadHash && !this._dvm.threadsZvm.perspective.notifSettings.get(this.threadHash)) {
        await this._dvm.threadsZvm.pullNotifSettings(this.threadHash);
      }
    }
  }


  /** Shared with the DM and asset views: see scroll-keeper.ts. The host is the
   *  scroller and #content is what grows as messages render. */
  private _keeper = new ScrollKeeper({
    scroller: () => this,
    content: () => this.shadowRoot!.getElementById("content"),
    onNearTop: () => {this.loadPreviousMessages();},
  });

  /** The bead the view has already scrolled to, so a re-render does not do it again. */
  private _scrolledToBead: string = "";


  /** */
  jumpToNewest() {
    this._keeper.follow();
  }


  /** */
  protected override async firstUpdated(_changedProperties: PropertyValues) {
    this._keeper.attach();
  }


  /** */
  override disconnectedCallback() {
    super.disconnectedCallback();
    this._keeper.detach();
  }


  /** */
  protected override async updated(_changedProperties: PropertyValues) {
    this._keeper.attach();
    this._keeper.afterRender();
    /** Scroll to the requested bead, once: this runs on every update, and the
     *  reader may have moved on since. */
    if (this.beadAh && this.beadAh.b64 != this._scrolledToBead) {
      const beadItem = this.shadowRoot!.getElementById(this.beadAh.b64);
      if (beadItem) {
        this._scrolledToBead = this.beadAh.b64;
        this._keeper.reveal(beadItem);
      }
    }
    /** Set background according to load state */
    if (this._loading) {
      this.style.background = "#ececec";
    } else {
      this.style.background = "inherit";
    }
  }


  /** Check if beads have comments */
  protected async loadBeadComments(bls: BeadLink[], dvm: ThreadsDvm): Promise<void> {
    for (const bl of bls) {
      const pps = await dvm.threadsZvm.pullSubjectThreads(intoLinkableId(bl.beadAh), GetStrategy.Local);
      for (const [ppAh, [pp, _ts, _author]] of pps.entries()) {
        if (pp.purpose == "comment") {
          dvm.threadsZvm.perspective.getAllBeadsOnThread(ppAh);
          break;
        }
      }
    }
  }


  /** */
  protected loadlatestMessages(newDvm?: ThreadsDvm) {
    console.log("<chat-thread-view>.loadlatestMessages() probe", this.threadHash);
    /** Opening a channel starts at the newest message. */
    this._keeper.follow();
    this._scrolledToBead = "";
    if (!this.threadHash) {
      this._loading = false;
      return;
    }
    const dvm = newDvm? newDvm : this._dvm;
    const threadAh = this.threadHash; // Cache value;
    dvm.threadsZvm.pullLatestBeads(threadAh, undefined, undefined, this.batchSize)
      .then(async (beadLinks) => {
        console.log("<chat-thread-view>.loadlatestMessages() pulled", beadLinks.length);
        /** Show the messages now. Every render is held back while _loading is
         *  set, and what follows is one zome call per bead to find its comment
         *  thread plus a write to commit the probe log: seconds of blank pane
         *  on a channel's first open. Comment counts fill in on each item as
         *  they arrive, which is how the DM view has always ordered this. */
        this._loading = false;
        await this.loadBeadComments(beadLinks, dvm);
        await dvm.threadsZvm.commitThreadProbeLog(threadAh);
      });
    this._loading = true;
  }


  /** */
  async loadPreviousMessages(): Promise<void> {
    if (!this.threadHash) {
      return;
    }
    const beginningReached = this._dvm.threadsZvm.perspective.hasReachedBeginning(this.threadHash);
    console.log("<chat-thread-view>.loadPreviousMessages() beginningReached = ", beginningReached);
    if (beginningReached) {
      //this._dvm.threadsZvm.perspective.threads[this.threadHash]
      return;
    }
    this._loading = true;
    //this._commentsLoading = true;
    const bls = await this._dvm.threadsZvm.probePreviousBeads(this.threadHash, this.batchSize);
    console.log("<chat-thread-view>.loadPreviousMessages() probed", bls.length);
    this._loading = false;
    await this.loadBeadComments(bls, this._dvm);
    //this._commentsLoading = false; // This is for triggering a new requestUpdate
  }


  /** */
  override render() {
    //console.log("<chat-thread-view>.render()", this._renderCount, this._loading, this.threadHash, this.beadAh, this._dvm.threadsZvm);
    this._renderCount += 1;

    /** */
    if (this.threadHash === undefined) {
      return html`
          <div style="margin:auto; color:red;font-weight: bold;font-size: 3rem">${msg("No channel selected")}</div>`;
    }
    const thread = this.threadsPerspective.threads.get(this.threadHash);
    if (!thread) {
      return html`
          <ui5-busy-indicator delay="50" size="Large" active
                              style="width:100%; height:100%; color:olive"></ui5-busy-indicator>`;
    }

    /** chat-header */
    let maybeHeader = html``;
    const hasReachedBeginning = this._dvm.threadsZvm.perspective.hasReachedBeginning(this.threadHash);
    //console.log("<chat-thread-view>.render() hasReachedBeginning", hasReachedBeginning);
    if (hasReachedBeginning) {
      maybeHeader = html`<chat-header .threadHash=${this.threadHash}></chat-header>`;
    }


    /** Should grab all probed messages and request probes if the end has been reached */

    const all = thread.getAll();
    //console.log("<chat-thread-view>.render() all", all.length);
    //all.sort((blm) => blm.creationTime)

    let myTimeZone = "UTC";
    if (this._dvm.profilesZvm.getMyProfile() && this._dvm.profilesZvm.getMyProfile()!.fields["timezone"]) {
      myTimeZone = this._dvm.profilesZvm.getMyProfile()!.fields["timezone"]!;
    }

    let passedLog = false;
    let currentDay = "";
    let prevBeadAh: ActionId | undefined = undefined;
    const newStr = msg("new").toUpperCase(); // prettyTimestamp(initialProbeLogTs);
    const initialProbeLogTs = this._dvm.perspective.initialThreadProbeLogTss.get(this.threadHash);


    /** Oldest first, top to bottom. The header and the history spinner sit
     *  above the messages, at the older end. The spinner for a thread with
     *  nothing to show yet fills the pane instead. */
    const busyHistory = html`
        <ui5-busy-indicator delay="50" size="Medium" active
                            style="width:100%; margin-bottom:20px; margin-top:20px;"></ui5-busy-indicator>`;
    return html`
        <!-- <div>${this._renderCount}</div> -->
        ${this._loading && all.length == 0? html`
            <ui5-busy-indicator delay="50" size="Large" active
                                style="width:100%; height:100%; margin:auto;"></ui5-busy-indicator>` : html``}
        <div id="content">
            ${maybeHeader}
            ${this._loading && all.length > 0? busyHistory : html``}
            ${repeat(all, (blm) => blm.beadAh.b64, (blm) => {               
                /** */
                let hr: TemplateResult<1> | undefined = undefined;
                /** 'new' <hr> if bead is older than initial latest ProbeLogTime */
                if (!passedLog && initialProbeLogTs && blm.creationTime > initialProbeLogTs) {
                    passedLog = true;
                    /** NEW */
                    hr = html`
                        <div style="display: flex; flex-direction: row; align-items: center; margin-right: 5px;">
                            <div style="border-top: 2px dotted #33A000; flex-grow: 1; height: 0px"></div>
                            <div style="width: fit-content; background: #33A000; color:white; font-size:small; border-radius:3px; padding: 2px 10px 2px 10px; margin-left: 3px; font-weight:bold;">
                                ${newStr}
                            </div>
                        </div>
                    `;
                }

                const day = formatTime(blm.creationTime, myTimeZone);

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
                                <div style="width: fit-content; background: #33A000; color:white; font-size:small; border-radius:3px; padding: 2px 10px 2px 10px; margin-left: 3px; font-weight:bold;">
                                    ${newStr}
                                </div>
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

                const chatItem = html`
                    <chat-item id=${blm.beadAh.b64} .hash=${blm.beadAh} .prevBeadAh=${prevBeadAh} .canEdit=${false}
                               tabindex="-1"
                               style="${this.beadAh && blm.beadAh.equals(this.beadAh)? "background:#c4f2b07a" : ""}">
                    </chat-item>`;
                prevBeadAh = blm.beadAh;
                /** Render chatItem */
                return html`${hr}${chatItem}`;
            })}
        </div>
    `;
  }

  private _renderCount = 0;


  /** */
  static override get styles() {
    return [
      sharedStyles,
      css`
        :host {
          flex: 1;
          overflow-y: scroll;
          display: flex;
          /* A plain top-anchored list. The newest message is kept in view by
             the ScrollKeeper, and while someone reads history the browser's
             scroll anchoring holds their place as messages above them render.
             It was column-reverse, which pins the bottom natively but, on the
             Chromium Moss ships, does not hold the reader's place. */
          flex-direction: column;
          /*gap:15px;*/
          height: inherit;
          max-height: 100%;
          font-family: '72-Light';
        }

        #content {
          display: flex;
          flex-direction: column;
          /* A short conversation sits at the bottom, by the input bar. */
          margin-top: auto;
        }
      `,
    ];
  }
}
