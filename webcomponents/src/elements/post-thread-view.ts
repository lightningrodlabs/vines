import {css, html, PropertyValues} from "lit";
import {consume} from "@lit/context";
import {property, state, customElement} from "lit/decorators.js";
import {delay, DnaElement} from "@ddd-qc/lit-happ";
import {ActionHashB64, encodeHashToBase64} from "@holochain/client";
import {ThreadsDvm} from "../viewModels/threads.dvm";
import {ThreadsPerspective} from "../viewModels/threads.perspective";
import {BeadLink} from "../bindings/threads.types";
import {msg} from "@lit/localize";
import {onlineLoadedContext} from "../contexts";
import {MAIN_TOPIC_HASH} from "../utils";
import {getMainThread} from "../utils_feed";


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

  /** Hash of Post to display */
  @property() beadAh: ActionHashB64 = ''

  /** */
  @property({type: Boolean})
  favorites: boolean = false;
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

  @state() private _loading = true;
  private _mainThreadAh?: ActionHashB64;

  /** -- Methods -- */

  /**
   * In dvmUpdated() this._dvm is not already set!
   * Subscribe to ThreadsZvm
   */
  protected async dvmUpdated(newDvm: ThreadsDvm, oldDvm?: ThreadsDvm): Promise<void> {
    console.log("<post-thread-view>.dvmUpdated() mainThreadAh");
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
    if (this.beadAh) {
      //console.log("<post-thread-view>.updated()", this.beadAh)
      const item = this.shadowRoot.getElementById(`${this.beadAh}`);
      if (item) {
        const scrollY = item.offsetTop - this.offsetTop;
        this.scrollTo({ top: scrollY, behavior: 'smooth' });
      }
    }
    ///** Set background according to load state */
    // if (this._loading)  {
    //   this.style.background = "#ececec";
    // } else {
    //   //this.style.background = "#FBFCFD";
    //   this.style.background = "white";
    // }
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
  protected async loadlatestThreads(newDvm?: ThreadsDvm) {
    console.log("<post-thread-view>.loadlatestThreads()", !!this._dvm);
    const dvm = newDvm? newDvm : this._dvm;
    this._loading = true;
    await dvm.threadsZvm.probeSubjectThreads(MAIN_TOPIC_HASH);
    this._mainThreadAh = getMainThread(dvm);
    console.log("<post-thread-view>.loadlatestThreads() mainThreadAh", this._mainThreadAh);
    if (this._mainThreadAh) {
      await dvm.threadsZvm.probeAllBeads(this._mainThreadAh);
      await dvm.threadsZvm.commitGlobalProbeLog();
    }
    this._loading = false;
  }


  /** */
  async loadPreviousPosts(): Promise<void> {
    const mainThreadAh = this.threadsPerspective.threadsPerSubject[MAIN_TOPIC_HASH][0];
    const beginningReached = this._dvm.threadsZvm.hasReachedBeginning(mainThreadAh);
    console.log("loadPreviousMessages() beginningReached = ", beginningReached);
    if (beginningReached) {
      return;
    }
    this._loading = true;
    const bls = await this._dvm.threadsZvm.probePreviousBeads(mainThreadAh, 10);
    this._loading = false;
    await this.loadThreadComments(bls, this._dvm);
  }


  /** */
  async onWheel(event) {
    //console.log("ChatView.onWheel() ", this.scrollTop, this.scrollHeight, this.clientHeight)
    if (this.clientHeight - this.scrollHeight == this.scrollTop) {
      await this.loadPreviousPosts();
    }
  }


  /** */
  render() {
    console.log("<post-thread-view>.render()", this._loading, this._mainThreadAh, this.favorites, this.beadAh, this._dvm.threadsZvm);

    /** If no main thread, check again in 1 min */
    //console.log("<post-thread-view>.render() mainThreadAh", this._mainThreadAh);
    if (!this._mainThreadAh) {
      if (!this._loading) {
        delay(60 * 1000).then(() => {this.loadlatestThreads()});
      }
      return html`<div>${msg('No Main Feed')}</div>`;
    }

    const thread = this._dvm.threadsZvm.perspective.threads.get(this._mainThreadAh);

    //const all = thread.getAll();
    let passedLog = false;

    let postItems = Object.values(thread.beadLinksTree.values)
      .map((blm) => {
        //console.log("<post-thread-view> blm", blm, this.threadsPerspective);
        /** 'new' if bead is older than initial latest ProbeLogTime */
        const initialProbeLogTs = this._dvm.perspective.initialThreadProbeLogTss[this._mainThreadAh];
        //console.log("<post-thread-view> thread.latestProbeLogTime", initialProbeLogTs, thread.latestProbeLogTime);
        if (!passedLog && blm.creationTime > initialProbeLogTs) {
          passedLog = true;
        }
        const isFavorite = this._dvm.threadsZvm.perspective.favorites.includes(blm.beadAh);
        if (this.favorites) {
          if (!isFavorite) {
            return;
          }
        }
        const bg_color = blm.beadAh == this.beadAh
          ? "#c4f2b07a"
          : isFavorite? "rgb(223, 246, 255)" : "";
        return html`
            <post-item id=${(blm.beadAh)} 
                       .hash=${(blm.beadAh)}
                       style="background: ${bg_color}"
            ></post-item>
        `;
      }
    )
      .filter((item) => !!item);

    console.log("<post-thread-view>.render() postItems", postItems.length, postItems, this.favorites);

    if (postItems.length == 0) {
      if (this.favorites) {
        return html`<div>${msg('No favorites')}</div>`;
      }
      return html`<div>${msg('Feed is empty')}</div>`;
    }

    /** render all */
    return html`
        <!-- <post-header style="margin-top:15px;"></post-header> -->
        ${this._loading? html`<ui5-busy-indicator delay="50" size="Medium" active style="margin-bottom:20px;margin-top:20px"></ui5-busy-indicator>` : html``}
        ${postItems.reverse()}
    `;
  }


  /** */
  static get styles() {
    return [
      css`
        :host {
          min-width: 400px;
          width: 650px;
          display: flex;
          flex-direction: column;
          gap:25px;
          height: 100%;
          font-family: '72-Light';
          padding-bottom: 20px;
        }
      `,
    ];
  }
}
