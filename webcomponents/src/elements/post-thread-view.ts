import {css, html, LitElement, PropertyValues} from "lit";
import {consume} from "@lit/context";
import {property, state, customElement} from "lit/decorators.js";
import {DnaElement} from "@ddd-qc/lit-happ";
import {ActionHashB64, encodeHashToBase64} from "@holochain/client";
import {ThreadsDvm} from "../viewModels/threads.dvm";
import {ThreadsPerspective} from "../viewModels/threads.perspective";
import {BeadLink} from "../bindings/threads.types";
import {msg} from "@lit/localize";
import {ts2day} from "../render";
import {onlineLoadedContext} from "../contexts";
import {emptyActionHash, MAIN_SUBJECT_HASH} from "../utils";


/**
 * @element
 */
@customElement("post-thread-view")
export class PostThreadView extends DnaElement<unknown, ThreadsDvm> {
  /** */
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

  @consume({ context: onlineLoadedContext, subscribe: true })
  onlineLoaded!: boolean;


  //private _prevThread: string = ""

  /** -- State variables -- */

  @state() _loading = true;


  /** -- Methods -- */

  /**
   * In dvmUpdated() this._dvm is not already set!
   * Subscribe to ThreadsZvm
   */
  protected async dvmUpdated(newDvm: ThreadsDvm, oldDvm?: ThreadsDvm): Promise<void> {
    console.log("<post-thread-view>.dvmUpdated()");
    if (oldDvm) {
      console.log("\t Unsubscribed to threadsZvm's roleName = ", oldDvm.threadsZvm.cell.name)
      oldDvm.threadsZvm.unsubscribe(this);
    }
    newDvm.threadsZvm.subscribe(this, 'threadsPerspective');
    console.log("\t Subscribed threadsZvm's roleName = ", newDvm.threadsZvm.cell.name)
    await this.loadlatestThreads(newDvm);
  }


  // /** Don't update during loading of beads */
  // shouldUpdate(changedProperties: PropertyValues<this>) {
  //   console.log("<post-thread-view>.shouldUpdate()", changedProperties, this._loading);
  //   const shouldnt = !super.shouldUpdate(changedProperties);
  //   if (shouldnt) {
  //     return false;
  //   }
  //   if (changedProperties.has("threadHash")) {
  //     this.loadlatestThreads();
  //     return true;
  //   }
  //   if (changedProperties.has("_loading")) {
  //     //return !this._loading;
  //     return true;
  //   }
  //   if (changedProperties.has("threadsPerspective")) {
  //     const isFirstPerspective = this._prevThread == "";
  //     /** Don't update during loading */
  //     if (!isFirstPerspective && !this.onlineLoaded) {
  //       return false;
  //     }
  //     const tp = changedProperties.get("threadsPerspective");
  //     const newThread = JSON.stringify(tp.threads.get(this.threadHash));
  //     //const oldThread = this._prevThreadsPerspective? this._prevThreadsPerspective.threads.get(this.threadHash) : undefined;
  //     //const diff = oldThread == undefined? newThread : deepDiffMapper.map(oldThread, newThread);
  //     //const isEqual = this._prevThreadsPerspective == undefined? newThread : deepDiffMapper.map(oldThread, newThread);
  //     const isEqual = this._prevThread == newThread;
  //     //console.log("<post-thread-view>.shouldUpdate() tp", isEqual, this._prevThread, newThread);
  //     this._prevThread = newThread;
  //     /** update only if something changed and we are not currently loading all the beads */
  //     return isFirstPerspective || !this._loading && !isEqual;
  //   }
  //   return !this._loading; //return true;
  // }


  // /** */
  // protected async willUpdate(changedProperties: PropertyValues<this>) {
  //   super.willUpdate(changedProperties);
  //   //console.log("<post-thread-view>.willUpdate()", changedProperties, this.threadHash);
  //   if (this._dvm) {
  //     if (!this._dvm.threadsZvm.perspective.notifSettings[this.threadHash]) {
  //       await this._dvm.threadsZvm.probeNotifSettings(this.threadHash);
  //     }
  //   }
  // }


  /** */
  protected async updated(_changedProperties: PropertyValues) {
    /** Scroll the list container to the requested bead */
    if (this.threadHash) {
      //console.log("<post-thread-view>.updated()", this.beadAh)
      const item = this.shadowRoot.getElementById(`${this.threadHash}`);
      if (item) {
        const scrollY = item.offsetTop - this.offsetTop;
        this.scrollTo({ top: scrollY, behavior: 'smooth' });
      }
    }
    /** Set background according to load state */
    if (this._loading)  {
      this.style.background = "#ececec";
    } else {
      this.style.background = "#FBFCFD";
    }
  }


  /** Check if threads have comments */
  protected async loadThreadComments(bls: BeadLink[], dvm: ThreadsDvm): Promise<void> {
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
  protected loadlatestThreads(newDvm?: ThreadsDvm) {
    console.log("<post-thread-view>.loadlatestThreads() probe", !!this._dvm);
    const dvm = newDvm? newDvm : this._dvm;
    dvm.threadsZvm.probeSubjectThreads(MAIN_SUBJECT_HASH)
      .then(async (pps) => {
        this._loading = false;
        await dvm.threadsZvm.commitGlobalProbeLog();
      });
    this._loading = true;
  }


  /** */
  async loadPreviousThreads(): Promise<void> {
    const beginningReached = this._dvm.threadsZvm.hasReachedBeginning(this.threadHash);
    console.log("loadPreviousMessages() beginningReached = ", beginningReached);
    if (beginningReached) {
      return;
    }
    this._loading = true;
    const bls = await this._dvm.threadsZvm.probePreviousBeads(this.threadHash, 10);
    this._loading = false;
    await this.loadThreadComments(bls, this._dvm);
  }


  /** */
  async onWheel(event) {
    //console.log("ChatView.onWheel() ", this.scrollTop, this.scrollHeight, this.clientHeight)
    if (this.clientHeight - this.scrollHeight == this.scrollTop) {
      await this.loadPreviousThreads();
    }
  }


  /** */
  render() {
    console.log("<post-thread-view>.render()", this._loading, this.threadHash, this._dvm.threadsZvm);
    const thread = this._dvm.threadsZvm.perspective.threads.get(this.threadHash);

    //const all = thread.getAll();
    const all = this.threadsPerspective.threadsPerSubject[MAIN_SUBJECT_HASH];
    let passedLog = false;

    let threadItems = Object.values(all).map(
      (ppAh) => {
        console.log("<post-thread-view> ppAh", ppAh, this.threadsPerspective);
        /** 'new' if bead is older than initial latest ProbeLogTime */
        const initialProbeLogTs = this._dvm.perspective.initialThreadProbeLogTss[ppAh];
        const thread = this.threadsPerspective.threads.get(ppAh);
        console.log("<post-thread-view> thread.latestProbeLogTime", initialProbeLogTs, thread.latestProbeLogTime);
        if (!passedLog && thread.creationTime > initialProbeLogTs) {
          passedLog = true;
        }
        return html`
            <post-item id=${(ppAh)} .hash=${(ppAh)}
                       style="${ppAh == this.threadHash? "background:#c4f2b07a" : ""}">
        </post-item>`;
      }
    );


    /** render all */
    return html`
        <post-header .threadHash="${this.threadHash}"></post-header>
        ${this._loading? html`<ui5-busy-indicator delay="50" size="Medium" active style="width:100%; height:100%;margin-bottom:20px;margin-top:20px"></ui5-busy-indicator>` : html``}
        ${threadItems}
    `;
  }


  /** */
  static get styles() {
    return [
      css`
        :host {
          min-width: 400px;
          display: flex;
          flex-direction: column;
          gap:15px;
          height: 100%;
          background: #FBFCFD;
          font-family: '72-Light';
        }
      `,
    ];
  }
}
